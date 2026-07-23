// sky-oauth.mjs — one-time Blackbaud SKY OAuth (authorization_code) capture.
// Starts a localhost server, prints the authorize URL; on the browser redirect it
// exchanges the code for tokens and writes refresh_token + access_token into
// tools/aggregate/blackbaud.local.json. Read-only elsewhere; prints no secrets.
//
//   node tools\sky-oauth.mjs
// Prereq: register the printed redirect URI on the SKY app (Blackbaud dev portal).
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.join(__dirname, 'aggregate', 'blackbaud.local.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const PORT = process.env.PORT || 8899;
const REDIRECT = `http://localhost:${PORT}/callback`;
const state = 'prts-sky-oauth';

function post(urlStr, body, headers) {
  const u = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const r = https.request({ method: 'POST', hostname: u.hostname, path: u.pathname + u.search, headers }, (resp) => {
      let d = ''; resp.on('data', (c) => (d += c));
      resp.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: resp.statusCode, json: j, raw: d }); });
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}

const authUrl = `${cfg.authorize_url}?${new URLSearchParams({ client_id: cfg.client_id, response_type: 'code', redirect_uri: REDIRECT, state }).toString()}`;
console.log('REDIRECT_URI (register this on the SKY app): ' + REDIRECT);
console.log('AUTHORIZE_URL: ' + authUrl);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') { res.writeHead(404); return res.end(); }
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');
  if (err) { res.end('Auth error: ' + err); console.log('AUTH_ERROR: ' + err + ' — ' + (url.searchParams.get('error_description') || '')); server.close(); return; }
  if (!code) { res.writeHead(400); return res.end('no code'); }
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }).toString();
  const basic = Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64');
  const tok = await post(cfg.token_url, form, { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) });
  if (tok.status === 200 && tok.json && tok.json.access_token) {
    cfg.refresh_token = tok.json.refresh_token;
    cfg.access_token = tok.json.access_token;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    res.end('Success — SKY tokens captured. You can close this tab.');
    console.log(`TOKEN_OK expires_in=${tok.json.expires_in} refresh_len=${(tok.json.refresh_token || '').length} — written to blackbaud.local.json`);
    server.close();
  } else {
    res.end('Token exchange failed (HTTP ' + tok.status + ') — check the terminal.');
    console.log('TOKEN_FAIL HTTP ' + tok.status + ' ' + (typeof tok.json === 'object' ? JSON.stringify(tok.json) : String(tok.raw).slice(0, 300)));
    server.close();
  }
});
server.listen(PORT, () => console.log('LISTENING on ' + REDIRECT + ' — open the AUTHORIZE_URL above, then consent.'));
