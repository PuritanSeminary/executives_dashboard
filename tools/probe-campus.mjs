// probe-campus.mjs — inspect the full field set of a campus record.
// Does /campuses (list) or /campuses/{id} carry city/state/country/address/geo?
// Campus addresses aren't PII, so values are printed. USAGE:
//   node tools\probe-campus.mjs populi.key
import { PopuliClient, rowsOf } from './aggregate/lib/populi.mjs';
import fs from 'node:fs';

const token = process.env.POPULI_API_KEY
  || (process.argv[2] && fs.existsSync(process.argv[2]) && fs.readFileSync(process.argv[2], 'utf8'))
  || null;
if (!token) { console.error('No token.'); process.exit(1); }
const p = new PopuliClient({ token });

// Full campus list with location fields — everything the globe needs, live.
const list = rowsOf(await p.get('/campuses'));
console.log(`=== /campuses (${list.length}) — id | ctry | state | primary | name ===`);
for (const c of list.sort((a, b) => String(a.country).localeCompare(String(b.country)))) {
  console.log(
    `  ${String(c.id).padEnd(6)} ${String(c.country ?? '--').padEnd(4)} ` +
    `${String(c.state ?? '').padEnd(16)} ${c.primary ? 'HUB' : '   '} ${String(c.name).padEnd(42)} :: ${String(c.city ?? '').replace(/\s+/g, ' ').trim()}`
  );
}
const countries = [...new Set(list.map((c) => c.country).filter(Boolean))].sort();
console.log(`\ncountries (${countries.length}): ${countries.join(', ')}`);
const missing = list.filter((c) => !c.country).map((c) => `${c.id} ${c.name}`);
if (missing.length) console.log(`NO country: ${missing.join(' | ')}`);
