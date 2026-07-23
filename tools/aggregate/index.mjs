// index.mjs — aggregator entrypoint.
//
//   node index.mjs --only=academic --dry-run     # build academic, print summary, no upload
//   node index.mjs --dry-run                      # build all available, write snapshot.json
//   node index.mjs                                # build all + upload to Blob (needs AZURE_* env)
//
// Populi token (academic) resolved from — in order — $POPULI_API_KEY, --key=<path>,
// or a positional *.key file arg. Never paste the token on the command line.
// Paycor + Blob env come online in later phases.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAcademic } from './academic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flags = {};
const positionals = [];
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? true; }
  else positionals.push(a);
}
const only = flags.only ? String(flags.only).split(',') : ['academic', 'hr'];
const dryRun = !!flags['dry-run'];
const outPath = flags.out || path.join(__dirname, 'snapshot.json');

function resolvePopuliToken() {
  if (process.env.POPULI_API_KEY) return process.env.POPULI_API_KEY.trim();
  const keyPath = flags.key || positionals.find((a) => a.endsWith('.key') || fs.existsSync(a));
  if (keyPath && fs.existsSync(keyPath)) return fs.readFileSync(keyPath, 'utf8').trim();
  return null;
}

const iso = () => new Date().toISOString();
const stamp = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

async function run() {
  const snapshot = {
    generatedAt: iso(),
    academic: null,
    hr: null,
    meta: {
      sources: {
        academic: { system: 'Populi', cadence: 'Per semester', lastSync: null },
        hr: { system: 'Paycor', cadence: 'Monthly', lastSync: null },
      },
      partial: { academic: true, hr: true },
    },
  };

  if (only.includes('academic')) {
    const token = resolvePopuliToken();
    if (!token) throw new Error('No Populi token — set $POPULI_API_KEY, pass --key=<path>, or a *.key file arg');
    console.error('→ Building academic from Populi…');
    snapshot.academic = await buildAcademic({ token });
    snapshot.meta.sources.academic.lastSync = stamp();
    snapshot.meta.partial.academic = false;
    summarizeAcademic(snapshot.academic);
  }

  if (only.includes('hr')) {
    console.error('→ Building HR from Paycor…');
    const { buildHr } = await import('./hr.mjs');
    snapshot.hr = await buildHr();
    snapshot.meta.sources.hr.lastSync = stamp();
    snapshot.meta.partial.hr = false;
    summarizeHr(snapshot.hr);
  }

  if (dryRun) {
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
    console.error(`\n✓ Dry run — wrote ${outPath} (not uploaded).`);
  } else {
    // Dynamic import keeps the dry-run path dependency-free (@azure/storage-blob
    // only needed for a real upload).
    const { uploadSnapshot } = await import('./lib/blob.mjs');
    const res = await uploadSnapshot(snapshot);
    console.error(`\n✓ Uploaded ${res.bytes} bytes → ${res.container}/${res.blob}`);
  }
}

function summarizeAcademic(a) {
  if (!a) return;
  console.error(`\n  ACADEMIC — census term: ${a.censusTerm?.label} (${a.censusTerm?.display_name})`);
  console.error(`    total enrolled : ${a.totalStudents} degree-seeking  (+${a.visitingStudents} visiting)`);
  console.error(`    weighted GPA   : ${a.gpaWeighted}`);
  console.error(`    programs (${a.programs.length}):`);
  for (const p of a.programs) {
    console.error(`      ${String(p.students).padStart(4)}  gpa ${p.gpa ?? ' n/a'}  ${p.name}`);
  }
  console.error(`    courses offered: ${a.totalCourses}`);
  console.error(`    globe: ${a.campuses?.length || 0} campuses plotted across ${a.partners?.length || 0} countries`);
  for (const p of a.partners || []) {
    console.error(`      ${String(p.courses).padStart(3)} courses  ${p.country}`);
  }
  if (a.unmappedCampuses?.length) {
    console.error(`    NOT plotted (${a.unmappedCampuses.length} — virtual/unconfirmed/untagged):`);
    for (const u of a.unmappedCampuses.sort((x, y) => y.courses - x.courses)) {
      console.error(`      ${String(u.courses).padStart(3)} courses  ${String(u.enrolled).padStart(4)} enr  ${u.label}${u.virtual ? ' [virtual]' : ''}`);
    }
  }
  console.error(`    top courses    :`);
  for (const c of a.topCourses) {
    console.error(`      ${String(c.enrolled).padStart(3)}/${String(c.cap ?? '∞').padEnd(3)}  ${c.code}  ${c.title}`);
  }
  console.error(`    funnel (${a.funnel.length} terms):`);
  for (const f of a.funnel.slice(-4)) {
    console.error(`      ${f.semester.padEnd(12)} inq ${f.inquiries}  app ${f.applications}  acc ${f.accepted}  mat ${f.matriculated}`);
  }
  if (a.outcomes?.length) {
    console.error(`    outcomes (cohort by AY — provisional):`);
    for (const o of a.outcomes) {
      console.error(`      ${o.year}  n=${String(o.cohortSize).padStart(3)}  matric ${o.matric ?? '—'}  reten ${o.retention ?? '—'}  grad ${o.graduation ?? '—'}${o.partial ? '  (partial)' : ''}`);
    }
  }
}

function summarizeHr(h) {
  if (!h) return;
  const c = h.meta.current;
  console.error(`\n  HR — ${h.meta.activeCount} active (of ${h.meta.allCount} on file)`);
  console.error(`    headcount: ${c.ft} FT · ${c.pt} PT · ${c.student} student`);
  console.error(`    tenure median: ${h.tenure.median} yr  ${h.tenure.buckets.map((b) => `${b.range}:${b.count}`).join('  ')}`);
  console.error(`    payroll (annualized base comp): $${(h.payroll.total / 1e6).toFixed(2)}M across ${h.payroll.categories.length} depts`);
  for (const p of h.payroll.categories.slice(0, 8)) {
    console.error(`      $${String((p.amount / 1e6).toFixed(2)).padStart(6)}M  ${String(p.fte).padStart(3)} fte  ${p.name}`);
  }
}

run().catch((e) => { console.error('\n✗ AGGREGATE FAILED:', e.message); process.exit(1); });
