// sky-refresh.mjs — exchange the stored SKY refresh_token for a fresh access_token.
// SKY refresh tokens ROTATE, so we persist the new refresh_token back to the config.
// Prints no secret values — only lengths + expiry.
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.join(__dirname, 'aggregate', 'blackbaud.local.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

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

const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cfg.refresh_token }).toString();
const basic = Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64');
const tok = await post(cfg.token_url, form, { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) });
if (tok.status === 200 && tok.json?.access_token) {
  cfg.access_token = tok.json.access_token;
  if (tok.json.refresh_token) cfg.refresh_token = tok.json.refresh_token; // rotated
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  console.log(`REFRESH_OK expires_in=${tok.json.expires_in} refresh_len=${(tok.json.refresh_token || '').length} (rotated & persisted)`);
} else {
  console.log('REFRESH_FAIL HTTP ' + tok.status + ' ' + (typeof tok.json === 'object' ? JSON.stringify(tok.json) : String(tok.raw).slice(0, 200)));
}
