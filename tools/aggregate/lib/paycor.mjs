// lib/paycor.mjs — Paycor Public API v2/v1 client.
//
// Auth: OAuth refresh_token grant (the app uses the Connect/authorization flow;
//   client_credentials is disabled). Every call sends Bearer + Ocp-Apim-Subscription-Key.
//   IMPORTANT: the app must be General-category → "Standard" type, or /employees 403s.
// Pagination: continuationToken + hasMoreResults, records[] (max 100/page).
// Rate limit: 1000 calls/min per app → throttle + 429 backoff.

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config from env (CI) or the gitignored paycor.local.json (local).
export function loadPaycorConfig() {
  const e = process.env;
  if (e.PAYCOR_CLIENT_ID) {
    return {
      clientId: e.PAYCOR_CLIENT_ID, clientSecret: e.PAYCOR_CLIENT_SECRET,
      subscriptionKey: e.PAYCOR_SUBSCRIPTION_KEY, refreshToken: e.PAYCOR_REFRESH_TOKEN,
      tokenUrl: e.PAYCOR_TOKEN_URL, legalEntityId: e.PAYCOR_LEGAL_ENTITY_ID,
      baseV2: e.PAYCOR_BASE_V2 || 'https://apis.paycor.com/v2',
      baseV1: e.PAYCOR_BASE_V1 || 'https://apis.paycor.com/v1',
    };
  }
  const p = path.join(__dirname, '..', 'paycor.local.json');
  if (!fs.existsSync(p)) throw new Error('No Paycor config: set PAYCOR_* env or create tools/aggregate/paycor.local.json');
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  return {
    clientId: c.client_id, clientSecret: c.client_secret, subscriptionKey: c.subscription_key,
    refreshToken: c.refresh_token, tokenUrl: c.token_url, legalEntityId: c.legal_entity_id,
    baseV2: c.base_v2 || 'https://apis.paycor.com/v2', baseV1: c.base_v1 || 'https://apis.paycor.com/v1',
  };
}

export class PaycorClient {
  constructor(cfg = loadPaycorConfig()) {
    for (const k of ['clientId', 'clientSecret', 'subscriptionKey', 'refreshToken', 'tokenUrl', 'legalEntityId']) {
      if (!cfg[k]) throw new Error(`PaycorClient: missing ${k}`);
    }
    this.cfg = cfg;
    this._access = null;
    this._exp = 0;
    this._last = 0;
    this.throttleMs = 120; // ~500/min, under the 1000/min ceiling
    this.newRefreshToken = null; // set if Paycor rotates it (caller should persist)
  }

  async _throttle() {
    const wait = this.throttleMs - (Date.now() - this._last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this._last = Date.now();
  }

  _raw(method, urlStr, { headers = {}, body = null } = {}) {
    const u = new URL(urlStr);
    const opts = { method, hostname: u.hostname, path: u.pathname + u.search, headers };
    return new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, json: j, raw: d }); });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  async _token() {
    if (this._access && Date.now() < this._exp) return this._access;
    const form = new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: this.cfg.refreshToken,
      client_id: this.cfg.clientId, client_secret: this.cfg.clientSecret,
    }).toString();
    const r = await this._raw('POST', this.cfg.tokenUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': this.cfg.subscriptionKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) },
      body: form,
    });
    if (r.status !== 200 || !r.json?.access_token) {
      throw new Error(`Paycor token: HTTP ${r.status} — ${typeof r.json === 'object' ? JSON.stringify(r.json) : String(r.raw).slice(0, 200)}`);
    }
    this._access = r.json.access_token;
    this._exp = Date.now() + ((r.json.expires_in || 1800) - 120) * 1000; // refresh 2 min early
    if (r.json.refresh_token && r.json.refresh_token !== this.cfg.refreshToken) {
      this.newRefreshToken = r.json.refresh_token; // rotated — caller persists to the secret store
      this.cfg.refreshToken = r.json.refresh_token;
    }
    return this._access;
  }

  async _authHeaders() {
    return { Authorization: 'Bearer ' + (await this._token()), 'Ocp-Apim-Subscription-Key': this.cfg.subscriptionKey, Accept: 'application/json' };
  }

  // Single GET with 429/5xx retry. `url` is a full URL.
  async get(url) {
    for (let attempt = 0; ; attempt++) {
      await this._throttle();
      const r = await this._raw('GET', url, { headers: await this._authHeaders() });
      if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
        if (attempt < 4) { await new Promise((res) => setTimeout(res, Math.min(8000, 500 * 2 ** attempt))); continue; }
      }
      if (r.status < 200 || r.status >= 300) throw new Error(`Paycor GET ${url}: HTTP ${r.status} — ${String(r.raw).slice(0, 200)}`);
      return r.json;
    }
  }

  // Paginated GET → all records across pages. `pathWithQuery` is relative to the base.
  async list(base, pathWithQuery) {
    const out = [];
    let url = base + pathWithQuery;
    for (let page = 0; page < 200; page++) {
      const json = await this.get(url);
      out.push(...(Array.isArray(json?.records) ? json.records : Array.isArray(json) ? json : []));
      if (!json || json.hasMoreResults !== true) return out;
      // Prefer the server-provided next URL; else append the continuation token.
      if (json.additionalResultsUrl) url = new URL(json.additionalResultsUrl, base).href;
      else { const sep = url.includes('?') ? '&' : '?'; url = base + pathWithQuery + `${sep}continuationToken=${json.continuationToken}`; }
    }
    throw new Error(`Paycor list ${pathWithQuery}: exceeded page cap`);
  }

  // Convenience wrappers.
  employees(query = '') { return this.list(this.cfg.baseV2, `/legalentities/${this.cfg.legalEntityId}/employees${query}`); }
  departments() { return this.list(this.cfg.baseV2, `/legalentities/${this.cfg.legalEntityId}/departments`); }
  payrates(employeeId) { return this.list(this.cfg.baseV1, `/employees/${employeeId}/payrates`); }
}
