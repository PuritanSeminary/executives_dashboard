// probe-degrees.mjs — does /people support a degrees expand (for graduation_date)?
// Tries a couple of expand keys against INACTIVE students (alumni → likely graduated).
// USAGE: node tools\probe-degrees.mjs populi.key
import { PopuliClient, rowsOf } from './aggregate/lib/populi.mjs';
import fs from 'node:fs';

const token = (process.env.POPULI_API_KEY
  || (process.argv[2] && fs.existsSync(process.argv[2]) && fs.readFileSync(process.argv[2], 'utf8')) || '').trim();
if (!token) { console.error('No token.'); process.exit(1); }
const p = new PopuliClient({ token });

const filter = { 0: { logic: 'ALL', fields: [{ name: 'role', value: { id: '5', status: 'INACTIVE' }, positive: '1' }] } };

for (const key of ['student_degrees', 'degrees']) {
  const resp = await p.get('/people', { expand: ['student_programs', key], filter, page: 1 });
  const rows = rowsOf(resp);
  // find a row that actually carries the degrees array under some location
  let where = null, sample = null;
  for (const r of rows) {
    const arr = r[key] || r.report_data?.[key];
    if (Array.isArray(arr) && arr.length) { where = r[key] ? `row.${key}` : `row.report_data.${key}`; sample = arr[0]; break; }
  }
  console.log(`\n=== expand ['student_programs','${key}'] — ${rows.length} rows ===`);
  if (where) {
    console.log(`  degrees land at: ${where}`);
    console.log(`  degree keys    : ${Object.keys(sample).join(', ')}`);
    for (const f of ['status', 'graduation_date', 'degree_id', 'conferred', 'awarded_on'])
      console.log(`    ${f in sample ? 'FOUND' : ' miss'}  ${f}`);
  } else {
    console.log(`  no '${key}' array found on any row (expand not supported under this key)`);
  }
}
console.log('\nDone.');
