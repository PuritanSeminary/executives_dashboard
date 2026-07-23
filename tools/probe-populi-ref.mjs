// probe-populi-ref.mjs — reference-data probe (campuses + recent terms).
// Read-only. Prints campus names and term labels (institutional metadata, not PII)
// so we can build the globe's campus→geo map and pick the semester set correctly.
//
// USAGE:
//   $env:POPULI_API_KEY = "<token>"; node tools/probe-populi-ref.mjs
//   —or—  node tools/probe-populi-ref.mjs C:\path\to\populi.key

import { PopuliClient, rowsOf } from './aggregate/lib/populi.mjs';
import fs from 'node:fs';

const token = process.env.POPULI_API_KEY
  || (process.argv[2] && fs.existsSync(process.argv[2]) && fs.readFileSync(process.argv[2], 'utf8'))
  || null;
if (!token) { console.error('No token: set $env:POPULI_API_KEY or pass a key-file path.'); process.exit(1); }

const p = new PopuliClient({ token });

// 1) All campuses (id + name) — the real set behind the globe.
const campuses = await p.list('/campuses');
console.log(`\n=== CAMPUSES (${campuses.length}) ===`);
for (const c of campuses) console.log(`  ${String(c.id).padEnd(10)} ${c.name}`);

// 2) Recent transcript terms — to choose the semester set + census term.
const terms = await p.list('/academicterms');
const transcript = terms
  .filter((t) => t.is_for_transcript !== false)
  .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
  .slice(0, 18);
console.log(`\n=== RECENT TRANSCRIPT TERMS (newest first; ${terms.length} total) ===`);
console.log('  id         type_id  start        end          display_name');
for (const t of transcript) {
  console.log(
    `  ${String(t.id).padEnd(10)} ${String(t.academic_term_type_id ?? '').padEnd(7)} ` +
    `${String(t.start_date).padEnd(12)} ${String(t.end_date).padEnd(12)} ${t.display_name || t.name}`
  );
}

// 3) /people with student_programs expanded inline — confirm the expand shape
//    (where the array lands + its field names) for matriculation + outcomes.
const peopleResp = await p.get('/people', {
  expand: ['student_programs'],
  filter: { 0: { logic: 'ALL', fields: [{ name: 'role', value: { id: '5', status: 'ACTIVE' }, positive: '1' }] } },
  page: 1,
});
const people = rowsOf(peopleResp);
console.log(`\n=== /people (expand student_programs) — ${people.length} rows on page 1 ===`);
const r0 = people[0];
if (!r0) {
  console.log('  (no rows — check the role filter)');
} else {
  const sp = r0.student_programs || r0.report_data?.student_programs;
  console.log('  person top-level keys : ' + Object.keys(r0).join(', '));
  console.log('  student_programs at   : ' +
    (r0.student_programs ? 'row.student_programs'
      : r0.report_data?.student_programs ? 'row.report_data.student_programs'
      : 'NOT FOUND — expand may need a different key'));
  const first = Array.isArray(sp) ? sp[0] : null;
  console.log('  student_program keys  : ' + (first ? Object.keys(first).join(', ') : '(none / not an array)'));
  for (const f of ['program_id', 'entrance_term_id', 'first_time', 'started_on', 'exit_date', 'exit_reason_id']) {
    console.log(`    ${first && f in first ? 'FOUND' : ' miss'}  ${f}`);
  }
}

console.log('\nDone. Paste all three sections back.');
