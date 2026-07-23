// lib/populi.mjs — Populi API2 client.
//
// Encodes the hard-won rules from the SAA integration + the 2026-07-22 probe:
//   • Base https://prts.populiweb.com/api2, header `Authorization: Bearer <token>`.
//   • Filters / `expand` / `page` go in the GET *body* (query params are silently
//     ignored). Browser fetch forbids a GET body, so we use node:https.
//   • Pagination: numeric `page` in the body; stop when `has_more === false`.
//   • List envelope is `{ data|report_data: [...], has_more }` or a bare array.
//   • Throttle ~1 req / 400 ms — bursts 429 after ~200 calls. Retry 429 w/ backoff.

import https from 'node:https';

const DEFAULTS = {
  host: 'prts.populiweb.com',
  base: '/api2',
  throttleMs: 450,
  maxRetries: 4,
  maxPages: 500, // runaway backstop
};

export class PopuliClient {
  constructor({ token, ...opts } = {}) {
    if (!token) throw new Error('PopuliClient: token required');
    this.token = token.trim();
    this.cfg = { ...DEFAULTS, ...opts };
    this._lastCall = 0;
  }

  async _throttle() {
    const wait = this.cfg.throttleMs - (Date.now() - this._lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this._lastCall = Date.now();
  }

  // Single GET (optionally with a JSON body). Retries on 429 and transient 5xx.
  async get(path, body) {
    const payload = body != null ? JSON.stringify(body) : null;
    for (let attempt = 0; ; attempt++) {
      await this._throttle();
      let res;
      try {
        res = await this._request(path, payload);
      } catch (err) {
        if (attempt < this.cfg.maxRetries) { await backoff(attempt); continue; }
        throw new Error(`Populi ${path}: network error after ${attempt} retries — ${err.message}`);
      }
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < this.cfg.maxRetries) { await backoff(attempt, res.status); continue; }
        throw new Error(`Populi ${path}: ${res.status} after ${attempt} retries`);
      }
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Populi ${path}: HTTP ${res.status} — ${truncate(res.raw)}`);
      }
      return res.json;
    }
  }

  // Paginated GET → flat array of rows across all pages.
  async list(path, body = {}) {
    const out = [];
    for (let page = 1; page <= this.cfg.maxPages; page++) {
      const json = await this.get(path, { ...body, page });
      out.push(...rowsOf(json));
      if (!json || json.has_more !== true) return out;
    }
    throw new Error(`Populi ${path}: exceeded maxPages (${this.cfg.maxPages}) — check the has_more loop`);
  }

  _request(path, payload) {
    const opts = {
      host: this.cfg.host,
      path: this.cfg.base + path,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + this.token,
        Accept: 'application/json',
        ...(payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {}),
      },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch { /* leave null for non-2xx bodies */ }
          resolve({ status: res.statusCode, json, raw });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}

// Populi list responses nest under data / report_data, or are a bare array.
export const rowsOf = (json) =>
  Array.isArray(json) ? json
  : Array.isArray(json?.data) ? json.data
  : Array.isArray(json?.report_data) ? json.report_data
  : [];

// Merge a row's top-level + report_data fields (report_data wins), so callers can
// read either without caring where a field lives.
export const flat = (row) => (row?.report_data ? { ...row, ...row.report_data } : row);

function backoff(attempt, status) {
  const ms = Math.min(8000, 500 * 2 ** attempt) + Math.floor(attempt * 137);
  if (status) console.warn(`  ↻ Populi ${status} — backing off ${ms}ms (attempt ${attempt + 1})`);
  return new Promise((r) => setTimeout(r, ms));
}

const truncate = (s, n = 300) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s);
