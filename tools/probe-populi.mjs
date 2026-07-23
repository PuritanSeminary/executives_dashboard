// probe-populi.mjs — one-shot field-name confirmation against the live PRTS
// Populi tenant. Read-only. Prints FIELD NAMES only (no student PII), so the
// output is safe to paste back.
//
// USAGE (token never enters source control or chat):
//   $env:POPULI_API_KEY = "<token>"; node tools/probe-populi.mjs
//   —or—  node tools/probe-populi.mjs C:\path\to\populi.key
//
// Confirms the field spellings the academic aggregator depends on:
//   • /academicterms/{id}/students → cum_gpa / term_gpa / program fields
//   • /leads                       → status enum (funnel stages) + academic_term_id
//   • /academicterms/{id}/courseofferings → max_enrolled / campus_id
//   • /programs, and StudentDegree / StudentProgram fields for outcomes
//
// Respects Populi's ~1 req / 400 ms throttle (bursts 429 after ~200 calls).

import https from 'node:https';
import fs from 'node:fs';

const HOST = 'prts.populiweb.com';
const BASE = '/api2';
const THROTTLE_MS = 450;

function getToken() {
  if (process.env.POPULI_API_KEY) return process.env.POPULI_API_KEY.trim();
  const p = process.argv[2];
  if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  console.error('ERROR: no token. Set $env:POPULI_API_KEY or pass a key-file path as arg 1.');
  process.exit(1);
}
const TOKEN = getToken();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET-with-body via node:https (fetch forbids a body on GET; Populi requires it).
function api(path, body) {
  const payload = body ? JSON.stringify(body) : null;
  const opts = {
    host: HOST,
    path: BASE + path,
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/json',
      ...(payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Populi list responses nest under data / report_data / or are a bare array.
const rowsOf = (json) =>
  Array.isArray(json) ? json
  : Array.isArray(json?.data) ? json.data
  : Array.isArray(json?.report_data) ? json.report_data
  : [];

const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : []);

function report(label, row, expected) {
  console.log(`\n── ${label} ──`);
  if (!row) { console.log('   (no rows returned)'); return; }
  console.log('   top-level keys : ' + keys(row).join(', '));
  const rd = row.report_data;
  if (rd) console.log('   report_data    : ' + keys(rd).join(', '));
  for (const f of expected) {
    const where = f in row ? 'top' : rd && f in rd ? 'report_data' : null;
    console.log(`   ${where ? 'FOUND' : ' miss'}  ${f}${where ? '  (' + where + ')' : ''}`);
  }
}

async function main() {
  console.log('PRTS Populi probe — read-only. Field names only; no PII printed.\n');

  // 1) Academic terms → pick the current one.
  let r = await api('/academicterms');
  const terms = rowsOf(r.json);
  console.log(`/academicterms  status=${r.status}  count=${terms.length}`);
  report('academicterms[0]', terms[0], ['id', 'name', 'display_name', 'start_date', 'end_date']);
  const today = new Date().toISOString().slice(0, 10);
  const current =
    terms.find((t) => t.start_date <= today && today <= t.end_date) ||
    terms[terms.length - 1];
  console.log(`\n   → current term id = ${current?.id} (${current?.display_name || current?.name})`);
  await sleep(THROTTLE_MS);

  // 2) Term student roster → GPA + program fields.
  r = await api(`/academicterms/${current.id}/students`, { page: 1 });
  const students = rowsOf(r.json);
  console.log(`\n/academicterms/{id}/students  status=${r.status}  count=${students.length}  has_more=${r.json?.has_more}`);
  report('term-student[0]', students[0], [
    'cum_gpa', 'total_cum_gpa', 'resident_cum_gpa', 'term_gpa',
    'program_id', 'program_name', 'standing_name', 'full_time',
    'student_person_id', 'person_id',
  ]);
  const samplePid =
    students[0]?.report_data?.student_person_id ||
    students[0]?.student_person_id || students[0]?.person_id || students[0]?.id;
  await sleep(THROTTLE_MS);

  // 3) Leads → funnel status enum.
  r = await api('/leads', { page: 1 });
  const leads = rowsOf(r.json);
  console.log(`\n/leads  status=${r.status}  count=${leads.length}  has_more=${r.json?.has_more}`);
  report('lead[0]', leads[0], ['status', 'academic_term_id', 'person_id', 'program_id', 'added_on']);
  const statuses = [...new Set(leads.map((l) => l.status ?? l.report_data?.status).filter(Boolean))];
  console.log('   distinct status values on page 1: ' + (statuses.join(', ') || '(none)'));
  await sleep(THROTTLE_MS);

  // 4) Course offerings → capacity + campus.
  r = await api(`/academicterms/${current.id}/courseofferings`, { page: 1 });
  const offerings = rowsOf(r.json);
  console.log(`\n/academicterms/{id}/courseofferings  status=${r.status}  count=${offerings.length}`);
  report('courseoffering[0]', offerings[0], [
    'id', 'max_enrolled', 'max_auditors', 'campus_id', 'academic_term_id', 'finalized',
  ]);
  await sleep(THROTTLE_MS);

  // 5) Programs catalog.
  r = await api('/programs');
  const programs = rowsOf(r.json);
  console.log(`\n/programs  status=${r.status}  count=${programs.length}`);
  report('program[0]', programs[0], ['id', 'name', 'graduate_level']);

  // 6) Per-student outcomes objects (keys only).
  if (samplePid) {
    await sleep(THROTTLE_MS);
    r = await api(`/people/${samplePid}/degrees`);
    report('studentdegree[0]', rowsOf(r.json)[0], ['status', 'graduation_date', 'degree_id', 'anticipated_completion_date']);
    await sleep(THROTTLE_MS);
    r = await api(`/people/${samplePid}/programs`);
    report('studentprogram[0]', rowsOf(r.json)[0], ['entrance_term_id', 'first_time', 'most_recent', 'exit_date', 'exit_reason_id', 'started_on']);
  }

  console.log('\nDone. Paste the section headers + FOUND/miss lines back — that confirms the mapper field names.');
}

main().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1); });
