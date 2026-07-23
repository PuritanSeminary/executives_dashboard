// sky.mjs — minimal Blackbaud SKY API client for the Financial Edge NXT Query API.
//
// Flow (async, job-based — confirmed against the live tenant + the FE NXT Query
// connector reference):
//   1. refresh the access token (SKY refresh tokens ROTATE; we persist the new one)
//   2. find a saved GL query by name          GET  /query/queries
//   3. start an execution job                 POST /query/queries/executebyid
//   4. poll the job until Completed           GET  /query/jobs/{job_id}
//   5. download the results file from sas_uri (a short-lived, unauthenticated blob URL)
//
// Why a *saved* query: the SKY Query API can also run an ad-hoc query definition, but
// that requires a field/node catalog this subscription doesn't expose. A saved query
// built once in the FE NXT web UI is the reliable path — see docs/sky-gl-query.md for
// the exact query spec finance/Rachel needs to create.

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CFG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'blackbaud.local.json');
const MODULE = 'GeneralLedger';
const QS = `product=FE&module=${MODULE}`;

function httpJson(method, urlStr, { headers = {}, body = null } = {}) {
  const u = new URL(urlStr);
  const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  const h = { Accept: 'application/json', ...headers };
  if (payload) { h['Content-Type'] = h['Content-Type'] || 'application/json'; h['Content-Length'] = Buffer.byteLength(payload); }
  return new Promise((resolve, reject) => {
    const r = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers: h }, (resp) => {
      let d = ''; resp.on('data', (c) => (d += c));
      resp.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: resp.statusCode, json: j, raw: d }); });
    });
    r.on('error', reject); if (payload) r.write(payload); r.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class SkyClient {
  constructor() {
    this.cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
    this.base = this.cfg.base || 'https://api.sky.blackbaud.com';
  }

  #auth() {
    return { Authorization: 'Bearer ' + this.cfg.access_token, 'Bb-Api-Subscription-Key': this.cfg.subscription_key };
  }

  // Exchange the stored (rotating) refresh token for a fresh access token; persist both.
  async refresh() {
    const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.cfg.refresh_token }).toString();
    const basic = Buffer.from(`${this.cfg.client_id}:${this.cfg.client_secret}`).toString('base64');
    const r = await httpJson('POST', this.cfg.token_url, {
      headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (r.status !== 200 || !r.json?.access_token) throw new Error(`SKY token refresh failed: HTTP ${r.status} ${r.raw.slice(0, 200)}`);
    this.cfg.access_token = r.json.access_token;
    if (r.json.refresh_token) this.cfg.refresh_token = r.json.refresh_token; // rotated
    fs.writeFileSync(CFG_PATH, JSON.stringify(this.cfg, null, 2));
    return r.json.expires_in;
  }

  async listGlQueries() {
    const r = await httpJson('GET', `${this.base}/query/queries?${QS}&limit=200`, { headers: this.#auth() });
    if (r.status !== 200) throw new Error(`listGlQueries HTTP ${r.status} ${r.raw.slice(0, 200)}`);
    return r.json?.queries || [];
  }

  // Run a saved GL query by name; returns the parsed result rows (array of objects).
  async runQueryByName(name, { pollMs = 1500, maxPolls = 60 } = {}) {
    const q = (await this.listGlQueries()).find((x) => x.name === name);
    if (!q) throw new Error(`GL query "${name}" not found in FE NXT (create it — see docs/sky-gl-query.md)`);

    const start = await httpJson('POST', `${this.base}/query/queries/executebyid?${QS}`, {
      headers: this.#auth(),
      body: { id: q.id, query_type_id: q.type_id, output_format: 'Json', sql_generation_mode: 'Query' },
    });
    if (![200, 201, 202].includes(start.status) || !start.json?.id) throw new Error(`start job HTTP ${start.status} ${start.raw.slice(0, 200)}`);

    let job = start.json;
    for (let i = 0; i < maxPolls && /pending|running|throttled/i.test(job.status || ''); i++) {
      await sleep(pollMs);
      const s = await httpJson('GET', `${this.base}/query/jobs/${job.id}?${QS}&include_read_url=1`, { headers: this.#auth() });
      if (s.status !== 200) throw new Error(`poll job HTTP ${s.status} ${s.raw.slice(0, 200)}`);
      job = s.json;
    }
    if (!/completed/i.test(job.status || '')) throw new Error(`query job ended status=${job.status}`);
    if (process.env.SKY_DEBUG) console.error('completed job:', JSON.stringify(job));
    const sasUri = job.sas_uri || job.read_url || job.results_url;
    if (!sasUri) throw new Error(`job completed but no results URI. job=${JSON.stringify(job)}`);

    // The SAS URI is a plain (unauthenticated) blob URL, valid ~15 min.
    const res = await httpJson('GET', sasUri);
    if (res.json) return Array.isArray(res.json) ? res.json : (res.json.rows || res.json.value || []);
    return parseCsv(res.raw); // fall back to CSV if the file isn't JSON
  }
}

// Tiny CSV parser (handles quoted fields) → array of row objects keyed by header.
function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) return [];
  const split = (line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out;
  };
  const headers = split(lines[0]);
  return lines.slice(1).map((l) => { const cells = split(l); return Object.fromEntries(headers.map((h, i) => [h, cells[i]])); });
}
