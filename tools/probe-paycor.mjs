// probe-paycor.mjs — verify Paycor OAuth + scope across v2 (employees/departments)
// and v1 (per-employee payroll). Reads tools/aggregate/paycor.local.json (gitignored).
// Read-only. Prints org structure (dept names, worker-type tallies) + payroll FIELD
// NAMES only — no employee PII, no pay amounts.
//
//   node tools\probe-paycor.mjs
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = process.argv[2] || path.join(__dirname, 'aggregate', 'paycor.local.json');
if (!fs.existsSync(cfgPath)) { console.error(`No config at ${cfgPath}. Copy paycor.local.example.json → paycor.local.json and fill it.`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const haveToken = cfg.access_token && !String(cfg.access_token).startsWith('<');
const need = (haveToken ? ['subscription_key'] : ['client_id', 'client_secret', 'subscription_key', 'token_url'])
  .filter((k) => !cfg[k] || String(cfg[k]).startsWith('<'));
if (need.length) { console.error('Config needs: ' + need.join(', ')); process.exit(1); }
const haveLeid = cfg.legal_entity_id && !String(cfg.legal_entity_id).startsWith('<');

function request(method, urlStr, { headers = {}, body = null } = {}) {
  const u = new URL(urlStr);
  const opts = { method, hostname: u.hostname, path: u.pathname + u.search, headers };
  return new Promise((resolve, reject) => {
    const r = https.request(opts, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = d; } resolve({ status: res.statusCode, json: j, raw: d }); }); });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
const rowsOf = (j) => (Array.isArray(j) ? j : Array.isArray(j?.records) ? j.records : Array.isArray(j?.data) ? j.data : []);
const tally = (arr, fn) => { const m = new Map(); for (const x of arr) { const k = fn(x); if (k == null) continue; m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };

async function main() {
  // 1) obtain a bearer token — prefer refresh_token (fresh + tests the prod path),
  //    fall back to a pasted access_token.
  let bearer;
  const haveRefresh = cfg.refresh_token && !String(cfg.refresh_token).startsWith('<');
  if (haveRefresh) {
    const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cfg.refresh_token, client_id: cfg.client_id, client_secret: cfg.client_secret }).toString();
    console.log(`\n[1] POST ${cfg.token_url} (refresh_token)`);
    const tok = await request('POST', cfg.token_url, { headers: { 'Ocp-Apim-Subscription-Key': cfg.subscription_key, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, body: form });
    if (tok.status === 200 && tok.json?.access_token) {
      bearer = tok.json.access_token;
      console.log(`   ✓ refreshed access token (expires_in ${tok.json.expires_in || '?'}s)`);
      if (tok.json.refresh_token && tok.json.refresh_token !== cfg.refresh_token) {
        cfg.refresh_token = tok.json.refresh_token;
        cfg.access_token = bearer;
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        console.log('   ↻ refresh_token rotated — saved the new one to config');
      }
    } else {
      console.log(`   ✗ refresh HTTP ${tok.status}: ${typeof tok.json === 'object' ? JSON.stringify(tok.json) : String(tok.raw).slice(0, 300)}`);
    }
  }
  if (!bearer && haveToken) {
    bearer = String(cfg.access_token).replace(/^Bearer\s+/i, '').trim();
    console.log('[1b] refresh unavailable — using the pasted access_token');
  }
  if (!bearer) { console.log('   ✗ no usable token'); return; }
  const auth = { Authorization: 'Bearer ' + bearer, 'Ocp-Apim-Subscription-Key': cfg.subscription_key, Accept: 'application/json' };
  const leid = cfg.legal_entity_id;
  if (!haveLeid) { console.log('\n[2-4] skipped — set legal_entity_id in the config to test data endpoints.'); return; }

  // 2) departments (v2) — verifies scope + gives dept id→name
  console.log(`\n[2] GET ${cfg.base_v2}/legalentities/${leid}/departments`);
  const dep = await request('GET', `${cfg.base_v2}/legalentities/${leid}/departments`, { headers: auth });
  console.log(`   HTTP ${dep.status}`);
  if (dep.status === 200) for (const d of rowsOf(dep.json).slice(0, 40)) console.log(`     ${String(d.id ?? d.code ?? '').padEnd(12)} ${d.name || d.departmentName || ''}`);
  else console.log('   ' + String(dep.raw).slice(0, 300));

  // 3) employees (v2) — verify data scope + tally worker structure (find the student bucket)
  console.log(`\n[3] GET ${cfg.base_v2}/legalentities/${leid}/employees?include=All`);
  const emp = await request('GET', `${cfg.base_v2}/legalentities/${leid}/employees?include=All`, { headers: auth });
  console.log(`   HTTP ${emp.status}`);
  let firstEmpId = null;
  if (emp.status === 200) {
    const rows = rowsOf(emp.json);
    firstEmpId = rows[0]?.id;
    console.log(`   employees on page: ${rows.length}  hasMoreResults: ${emp.json.hasMoreResults}`);
    console.log(`   isFullTime: ${JSON.stringify(tally(rows, (e) => e.statusData?.isFullTime))}`);
    console.log(`   statusData.type: ${JSON.stringify(tally(rows, (e) => e.statusData?.type))}`);
    console.log(`   statusData.status: ${JSON.stringify(tally(rows, (e) => e.statusData?.status))}`);
    console.log(`   workerCategory: ${JSON.stringify(tally(rows, (e) => e.workerCategory))}`);
    console.log(`   department.id counts: ${JSON.stringify(tally(rows, (e) => e.department?.id))}`);
    console.log(`   payGroupId counts: ${JSON.stringify(tally(rows, (e) => e.positionData?.payGroupId))}`);
    console.log(`   distinct jobTitles: ${JSON.stringify([...new Set(rows.map((e) => e.positionData?.jobTitle).filter(Boolean))].slice(0, 25))}`);
  } else {
    console.log('   ' + String(emp.raw).slice(0, 300));
  }

  // 4) payroll (v1 per-employee) — verify payroll scope; field names only
  if (firstEmpId) {
    console.log(`\n[4] GET ${cfg.base_v1}/employees/${firstEmpId}/payrates`);
    const pr = await request('GET', `${cfg.base_v1}/employees/${firstEmpId}/payrates`, { headers: auth });
    console.log(`   HTTP ${pr.status}`);
    const row = rowsOf(pr.json)[0];
    if (pr.status === 200) console.log('   payrate keys: ' + (row ? Object.keys(row).join(', ') : '(no records)'));
    else console.log('   ' + String(pr.raw).slice(0, 300) + '  → payroll scope may be missing.');
  }
  console.log('\nDone. Paste the output back (org structure + field names only, no PII/amounts).');
}
main().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(1); });
