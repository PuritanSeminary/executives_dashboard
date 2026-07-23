// academic.mjs — Populi → PRTS_DATA.academic
//
// Confirmed-clean pieces (probe 2026-07-22): term selection, per-program
// enrollment + GPA, admissions funnel, per-course enrolled/cap/instructor.
// TWO pieces wait on the /campuses reference probe:
//   • partners[]/campuses[] country grouping + globe geo   → needs campus→geo map
//   • outcomes[] retention/graduation cohort walk           → derived, multi-term
// Those are marked TODO and left null so the frontend keeps mock for them until wired.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PopuliClient, flat } from './lib/populi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC = JSON.parse(fs.readFileSync(path.join(__dirname, 'academic-static.json'), 'utf8'));

// Census decision: most recent Fall/Spring transcript term that has STARTED.
// (Populi defines future terms + Winter/Summer intensives; the dashboard trend is
// Fall/Spring, so those are the census + funnel terms.)
const isPrimary = (t) => /\b(fall|spring)\b/i.test(t.display_name || t.name || '');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
const num = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;

// Populi returns HTML-escaped strings (e.g. "Testament&#039;s"). Decode for display.
const decode = (s) =>
  typeof s !== 'string' ? s
  : s
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

function semesterLabel(t) {
  const dn = t.display_name || t.name || '';
  const season = (dn.match(/(Fall|Spring|Summer|Winter)/i) || [])[0] || dn;
  // Fall belongs to the start calendar year; Spring/Summer to the end year.
  const year = /fall/i.test(season) ? t.start_year : t.end_year;
  return year ? `${cap(season)} ${year}` : dn;
}

export function selectTerms(allTerms, { semesterCount = 10, asOf } = {}) {
  const today = asOf || new Date().toISOString().slice(0, 10);
  const started = allTerms
    .filter((t) => t.is_for_transcript !== false)
    .filter((t) => String(t.start_date) <= today) // exclude future terms
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date))); // oldest→newest
  const primary = started.filter(isPrimary);
  const census = primary[primary.length - 1] || started[started.length - 1];
  const semesters = primary.slice(-semesterCount);
  return { census, semesters, started };
}

async function buildPrograms(client, censusTermId) {
  const roster = (await client.list(`/academicterms/${censusTermId}/students`)).map(flat);
  const byProg = new Map();
  let visitingStudents = 0; // non-matriculating / visiting / audit — reported separately
  for (const r of roster) {
    const id = r.program_id;
    if (id == null) continue;
    if (r.program_name && NON_MATRIC.test(r.program_name)) { visitingStudents++; continue; }
    const g = byProg.get(id) || { id, name: r.program_name, students: 0, gpaSum: 0, gpaN: 0 };
    g.students++;
    const gpa = Number(r.cum_gpa);
    if (Number.isFinite(gpa) && gpa > 0) { g.gpaSum += gpa; g.gpaN++; }
    byProg.set(id, g);
  }
  const programs = [...byProg.values()]
    .map((g) => ({
      id: String(g.id),
      name: decode(g.name),
      students: g.students,
      gpa: g.gpaN ? +(g.gpaSum / g.gpaN).toFixed(2) : null,
      length: null, // time-to-grad not on a single endpoint; static table or derive later
    }))
    .sort((a, b) => b.students - a.students);
  const totalStudents = programs.reduce((s, p) => s + p.students, 0); // degree-seeking only
  const gpaVals = programs.filter((p) => p.gpa != null);
  const gpaWeighted = gpaVals.length
    ? +(gpaVals.reduce((s, p) => s + p.gpa * p.students, 0) /
        gpaVals.reduce((s, p) => s + p.students, 0)).toFixed(2)
    : null;
  return { programs, totalStudents, gpaWeighted, visitingStudents };
}

// Cumulative funnel: a lead's status is its furthest stage, so "reached stage X" =
// rank(status) >= rank(X). That yields the descending inquiry→matriculated shape.
const STAGE_RANK = {
  prospect: 0, inquiry: 1,
  application_started: 2, application_completed: 2,
  accepted: 3, confirmed: 3,
  enrolled: 4,
};
async function loadLeads(client) {
  return (await client.list('/leads')).map(flat);
}

// Accepted-or-beyond (rank ≥ 3) per term — reused by the funnel and the cohort yield.
function acceptedByTermMap(leads) {
  const m = new Map();
  for (const l of leads) {
    const tid = l.academic_term_id;
    if (tid == null) continue;
    if (STAGE_RANK[l.status] >= 3) m.set(tid, (m.get(tid) || 0) + 1);
  }
  return m;
}

// inquiries/applications/accepted from /leads (rank). matriculated is OVERRIDDEN with
// the real new-enrollment count per term (lead 'enrolled' status undercounts) when a
// cohort map is supplied; falls back to lead-status otherwise.
function buildFunnel(leads, semesters, matByTerm) {
  const byTerm = new Map();
  for (const l of leads) {
    const tid = l.academic_term_id;
    if (tid == null) continue;
    const rank = STAGE_RANK[l.status];
    if (rank == null) continue;
    const b = byTerm.get(tid) || { inquiries: 0, applications: 0, accepted: 0, matriculated: 0 };
    if (rank >= 1) b.inquiries++;
    if (rank >= 2) b.applications++;
    if (rank >= 3) b.accepted++;
    if (rank >= 4) b.matriculated++;
    byTerm.set(tid, b);
  }
  return semesters.map((t) => {
    const b = byTerm.get(t.id) || { inquiries: 0, applications: 0, accepted: 0, matriculated: 0 };
    const realMat = matByTerm?.get(t.id);
    return {
      semester: semesterLabel(t),
      inquiries: b.inquiries,
      applications: b.applications,
      accepted: b.accepted,
      matriculated: realMat != null ? realMat : b.matriculated,
    };
  });
}

// Pull the student roster with student_programs expanded INLINE (body expand+filter),
// avoiding a per-person fan-out. One dataset feeds both matriculation and outcomes.
// NOTE: expand landing spot + field names flagged for probe confirmation (probe-ref).
async function loadStudentPrograms(client, status) {
  const people = await client.list('/people', {
    expand: ['student_programs', 'student_degrees'],
    filter: { 0: { logic: 'ALL', fields: [{ name: 'role', value: { id: '5', status }, positive: '1' }] } },
  });
  const progs = [];
  for (const person of people) {
    const sp = person.student_programs || person.report_data?.student_programs || [];
    const gradDates = (person.student_degrees || person.report_data?.student_degrees || [])
      .map((d) => d && d.graduation_date)
      .filter(Boolean); // graduation_date is the authoritative "graduated" signal
    for (const p of Array.isArray(sp) ? sp : []) {
      // Credit a degree to this cohort only if earned on/after entering the program.
      const gradDate = gradDates.filter((gd) => !p.started_on || gd >= p.started_on).sort()[0] || null;
      progs.push({
        personId: person.id,
        programId: p.program_id,
        programName: p.name,
        entranceTermId: p.entrance_term_id,
        firstTime: p.first_time === true || p.first_time === 1,
        startedOn: p.started_on,
        exitDate: p.exit_date,
        exitReasonId: p.exit_reason_id,
        graduated: !!gradDate,
        graduationDate: gradDate,
      });
    }
  }
  return progs;
}

// Full student population (active + inactive/alumni) — needed for cohort retention
// and graduation. Deduped in case a person appears under both statuses.
async function loadAllStudentPrograms(client) {
  const active = await loadStudentPrograms(client, 'ACTIVE');
  const inactive = await loadStudentPrograms(client, 'INACTIVE');
  const seen = new Set();
  const all = [];
  for (const p of [...active, ...inactive]) {
    const k = `${p.personId}:${p.programId}:${p.entranceTermId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    all.push(p);
  }
  return all;
}

// Matriculated in term T = distinct students whose program entrance term is T.
// (NOT first_time — that's first-time-in-college, ~never true at a grad seminary.)
// Caveat: built from the ACTIVE roster, so counts for older terms decay as those
// students graduate/leave. Recent terms are accurate; see note in buildAcademic.
const NON_MATRIC = /non-matriculat|visiting|audit/i; // visiting/non-degree — not admissions matriculants
function matriculatedByTerm(studentPrograms) {
  const byTerm = new Map(); // entranceTermId -> Set(personId)
  for (const p of studentPrograms) {
    if (p.entranceTermId == null) continue;
    if (p.programName && NON_MATRIC.test(p.programName)) continue;
    let set = byTerm.get(p.entranceTermId);
    if (!set) { set = new Set(); byTerm.set(p.entranceTermId, set); }
    set.add(p.personId);
  }
  const m = new Map();
  for (const [tid, set] of byTerm) m.set(tid, set.size);
  return m;
}

async function buildCourses(client, censusTermId) {
  const offerings = (await client.list(`/academicterms/${censusTermId}/courseofferings`)).map(flat);
  // report_data.num_students = enrolled; max_enrolled = cap. No roster fan-out needed.
  const courses = offerings
    .map((o) => ({
      code: decode(o.course_abbrv || o.section || ''),
      title: decode(o.name || ''),
      enrolled: num(o.num_students),
      cap: num(o.max_enrolled) || null, // 0 = uncapped in Populi → null (no fill bar)
      instructor: decode(o.primary_faculty_display_name || ''),
      campusId: o.campus_id ?? null,
      campus: o.campus_name || '',
      dept: o.department_name || '',
    }))
    .filter((c) => c.title);
  const topCourses = [...courses].sort((a, b) => b.enrolled - a.enrolled).slice(0, 6)
    .map(({ campusId, campus, dept, ...keep }) => keep);
  return { courses, topCourses, totalCourses: courses.length };
}

// Campus location comes LIVE from /campuses (country/state/primary); lat/lon from the
// country-centroid table. Campuses sharing a country are spread around the centroid.
async function loadCampuses(client) {
  const rows = await client.list('/campuses');
  const m = new Map();
  for (const c of rows) {
    m.set(String(c.id), {
      name: decode(c.name),
      country: c.country,               // ISO-2
      countryFull: c.country_full || c.country,
      state: c.state || '',
      hub: !!c.primary,
    });
  }
  return m;
}

// Golden-angle spread so multiple campuses in one country don't stack on the centroid.
function spread([lat, lon], i) {
  if (!i) return [lat, lon];
  const ang = (i * 137.5) * Math.PI / 180;
  const r = 2.2;
  return [+(lat + r * Math.sin(ang)).toFixed(3), +(lon + r * Math.cos(ang)).toFixed(3)];
}

function buildGlobe(courses, campusMap) {
  const centroids = STATIC.countryCentroids || {};
  const overrides = STATIC.campusOverrides || {};
  const byCampus = new Map();
  for (const c of courses) {
    const key = c.campusId == null ? 'unassigned' : String(c.campusId);
    const g = byCampus.get(key) || { id: key, list: [], enrolled: 0 };
    g.list.push(c);
    g.enrolled += c.enrolled;
    byCampus.set(key, g);
  }
  const campuses = [];
  const campusCourses = {};
  const countryAgg = new Map();
  const unmapped = [];
  const perCountry = {}; // for centroid spread
  for (const [key, g] of byCampus) {
    campusCourses[key] = g.list
      .map((c) => ({ code: c.code, title: c.title, instructor: c.instructor, enrolled: c.enrolled, cap: c.cap }))
      .sort((a, b) => b.enrolled - a.enrolled);
    const meta = campusMap.get(key);
    const isVirtual = meta && /virtual/i.test(meta.name);
    const coords = Array.isArray(overrides[key]) ? overrides[key] : centroids[meta?.country];
    if (meta && !isVirtual && coords) {
      const idx = (perCountry[meta.country] = (perCountry[meta.country] ?? -1) + 1);
      const [lat, lon] = Array.isArray(overrides[key]) ? overrides[key] : spread(coords, idx);
      campuses.push({
        id: key, institution: meta.name, city: meta.state, country: meta.countryFull,
        lat, lon, hub: meta.hub, courses: g.list.length, enrolled: g.enrolled,
      });
      const ca = countryAgg.get(meta.countryFull) || { country: meta.countryFull, institution: meta.name, courses: 0 };
      ca.courses += g.list.length;
      countryAgg.set(meta.countryFull, ca);
    } else {
      unmapped.push({
        id: key,
        label: isVirtual ? 'Virtual Campus' : meta?.name || g.list[0]?.campus || 'Unassigned',
        virtual: !!isVirtual,
        reason: !meta ? 'untagged' : isVirtual ? 'virtual' : `no centroid for ${meta.country}`,
        courses: g.list.length, enrolled: g.enrolled,
      });
    }
  }
  campuses.sort((a, b) => (b.hub ? 1 : 0) - (a.hub ? 1 : 0) || b.enrolled - a.enrolled);
  const partners = [...countryAgg.values()].sort((a, b) => b.courses - a.courses);
  return { campuses, partners, campusCourses, unmapped };
}

// Per-semester census + GPA + course counts, so KPI sparklines/deltas are live-vs-live
// (not live-vs-mock). One roster + one courseofferings call per semester term.
async function buildTrends(client, semesters) {
  const enrollmentTrend = [];
  const gpaTrend = [];
  const coursesTrend = [];
  for (const t of semesters) {
    const roster = (await client.list(`/academicterms/${t.id}/students`)).map(flat);
    let count = 0, gpaSum = 0, gpaN = 0;
    for (const r of roster) {
      if (r.program_id == null) continue;                              // match buildPrograms
      if (r.program_name && NON_MATRIC.test(r.program_name)) continue; // degree-seeking only
      count++;
      const g = Number(r.cum_gpa);
      if (Number.isFinite(g) && g > 0) { gpaSum += g; gpaN++; }
    }
    enrollmentTrend.push(count);
    gpaTrend.push(gpaN ? +(gpaSum / gpaN).toFixed(2) : null);
    coursesTrend.push((await client.list(`/academicterms/${t.id}/courseofferings`)).length);
  }
  // Prior-year baseline = same season one year back = 2 semesters back (Fall/Spring alternate).
  const priorYr = (arr) => (arr.length >= 3 ? arr[arr.length - 3] : arr[0]);
  return {
    enrollmentTrend,
    gpaTrend,
    coursesTrend,
    priorYearEnrollment: priorYr(enrollmentTrend),
    gpaPriorYear: priorYr(gpaTrend),
    coursesPriorYear: priorYr(coursesTrend),
  };
}

// Per-term class data for the historical class browser (one globe-grouping per term).
// Cheap: one courseofferings call per term. Keyed by dashboard semester label.
async function buildTermClasses(client, semesters, campusMap) {
  const termClasses = {};
  const classTerms = [];
  for (const t of semesters) {
    const label = semesterLabel(t);
    const { courses, totalCourses } = await buildCourses(client, t.id);
    const g = buildGlobe(courses, campusMap);
    termClasses[label] = { totalCourses, campuses: g.campuses, partners: g.partners, campusCourses: g.campusCourses };
    classTerms.push(label);
  }
  return { termClasses, classTerms, currentClassTerm: classTerms[classTerms.length - 1] || null };
}

// Outcomes by academic year, from the FULL student population.
// PROVISIONAL DEFINITIONS — confirm with the registrar before treating as official IR:
//   • cohort(AY)   = degree-seeking student-programs whose entrance term is in that AY
//   • matric/yield = cohort size ÷ accepted-in-AY (leads at 'accepted' or beyond)
//   • retention    = 1 − (early withdrawals ÷ cohort); early = exited ≤ ~400 days in,
//                    not graduated (a proxy for first-year retention)
//   • graduation   = graduated ÷ cohort, where graduated = exit_reason_id 49 (Graduated).
//                    Cumulative-to-date, so the newest cohorts are inherently partial.
const GRADUATED_EXIT_REASON = 49; // fallback signal (per SAA lessons: exit_reason_id 49 == Graduated)
// Prefer the authoritative StudentDegree.graduation_date (p.graduated); fall back to exit reason.
const isGraduated = (p) => p.graduated || p.exitReasonId === GRADUATED_EXIT_REASON || p.exitReasonId === String(GRADUATED_EXIT_REASON);
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / 86400000;

function ayLabel(term) {
  const m = String(term.display_name || '').match(/(\d{4})-(\d{4})/);
  return m ? `${m[1]}–${m[2].slice(2)}` : `AY ${term.academic_year_id}`;
}

function buildOutcomes(allTerms, fullSP, acceptedByTerm, { tableYears = 6, computeYears = 9, matureYears = 6, asOf } = {}) {
  const today = asOf || new Date().toISOString().slice(0, 10);
  const nowMs = new Date(today).getTime();
  const ayMap = new Map(); // academic_year_id -> { label, termIds:Set, start }
  for (const t of allTerms) {
    if (t.academic_year_id == null) continue;
    let e = ayMap.get(t.academic_year_id);
    if (!e) { e = { label: ayLabel(t), termIds: new Set(), start: t.start_date }; ayMap.set(t.academic_year_id, e); }
    e.termIds.add(t.id);
    if (String(t.start_date) < String(e.start)) e.start = t.start_date;
  }
  const window = [...ayMap.values()]
    .filter((a) => a.start && String(a.start) <= today)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(-computeYears);

  const rows = window.map((ay) => {
    const cohort = fullSP.filter(
      (p) => p.entranceTermId != null && ay.termIds.has(p.entranceTermId) &&
        p.programId != null && !(p.programName && NON_MATRIC.test(p.programName))
    );
    const size = cohort.length;
    const graduated = cohort.filter(isGraduated).length;
    const earlyWithdraw = cohort.filter(
      (p) => p.exitDate && !isGraduated(p) && p.startedOn && daysBetween(p.startedOn, p.exitDate) <= 400
    ).length;
    const accepted = [...ay.termIds].reduce((s, tid) => s + (acceptedByTerm.get(tid) || 0), 0);
    const ageYears = (nowMs - new Date(ay.start).getTime()) / (365.25 * 86400000);
    return {
      year: ay.label,
      matric: accepted ? +(size / accepted).toFixed(2) : null,
      retention: size ? +(1 - earlyWithdraw / size).toFixed(2) : null,
      graduation: size ? +(graduated / size).toFixed(2) : null,
      partial: ageYears < matureYears - 1, // graduation not yet mature (cumulative-to-date)
      cohortSize: size,
      ageYears: +ageYears.toFixed(1),
    };
  });

  // Headline graduation KPI comes from the most recent MATURE cohort (≥ matureYears old),
  // not the newest (whose grad rate is still ~0). Table shows recent years, flagged partial.
  const mature = [...rows].reverse().filter((r) => r.ageYears >= matureYears && r.graduation != null);
  const table = rows.slice(-tableYears).map(({ ageYears, ...r }) => r);
  return {
    outcomes: table,
    gradRate: mature[0]?.graduation ?? null,
    gradRatePrev: mature[1]?.graduation ?? null,
    gradRateYear: mature[0]?.year ?? null,
  };
}

// Median time-to-degree (years) per program, from graduated student-programs
// (graduation_date − started_on). Keyed by String(program_id) to match programs[].id.
function timeToDegreeByProgram(studentPrograms) {
  const byProg = new Map();
  for (const p of studentPrograms) {
    if (!p.graduationDate || !p.startedOn || p.programId == null) continue;
    const years = (new Date(p.graduationDate) - new Date(p.startedOn)) / (365.25 * 86400000);
    if (!(years > 0) || years > 20) continue; // drop bad/implausible spans
    const k = String(p.programId);
    if (!byProg.has(k)) byProg.set(k, []);
    byProg.get(k).push(years);
  }
  const out = new Map();
  for (const [k, arr] of byProg) {
    const s = arr.sort((a, b) => a - b);
    const n = s.length;
    out.set(k, +(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2).toFixed(1));
  }
  return out;
}

export async function buildAcademic({ token, semesterCount = 10 } = {}) {
  const client = new PopuliClient({ token });
  const allTerms = await client.list('/academicterms');
  const { census, semesters } = selectTerms(allTerms, { semesterCount });
  if (!census) throw new Error('academic: no transcript term found for census');

  const { programs, totalStudents, gpaWeighted, visitingStudents } = await buildPrograms(client, census.id);
  const studentPrograms = await loadAllStudentPrograms(client); // active + inactive → accurate cohorts
  // Populate each program's median time-to-degree from graduated students.
  const ttd = timeToDegreeByProgram(studentPrograms);
  for (const p of programs) { const t = ttd.get(p.id); if (t != null) p.length = t; }
  const matMap = matriculatedByTerm(studentPrograms);
  const leads = await loadLeads(client);
  const acceptedByTerm = acceptedByTermMap(leads);
  const funnel = buildFunnel(leads, semesters, matMap);
  const outcomesR = buildOutcomes(allTerms, studentPrograms, acceptedByTerm);
  if (process.env.DEBUG) {
    console.error(`[debug] studentPrograms(all)=${studentPrograms.length} matMap=${matMap.size} leads=${leads.length}`);
    console.error(`[debug] gradKPI=${outcomesR.gradRate} (mature cohort ${outcomesR.gradRateYear}) prev=${outcomesR.gradRatePrev}`);
    console.error(`[debug] outcomes: ${outcomesR.outcomes.map((o) => `${o.year}:n${o.cohortSize} m${o.matric} r${o.retention} g${o.graduation}${o.partial ? '*' : ''}`).join('  ')}`);
  }
  const { courses, topCourses, totalCourses } = await buildCourses(client, census.id);
  const campusMap = await loadCampuses(client);
  const globe = buildGlobe(courses, campusMap);
  const trends = await buildTrends(client, semesters);
  const classHistory = await buildTermClasses(client, semesters, campusMap);

  return {
    censusTerm: { id: census.id, label: semesterLabel(census), display_name: census.display_name },
    semesters: semesters.map(semesterLabel),
    programs,
    totalStudents,
    visitingStudents,
    gpaWeighted,
    funnel,
    courses,
    topCourses,
    totalCourses,
    partners: globe.partners,
    campuses: globe.campuses,
    campusCourses: globe.campusCourses,
    unmappedCampuses: globe.unmapped, // virtual / unconfirmed / untagged — counted, not plotted
    ...trends, // enrollmentTrend, gpaTrend, coursesTrend + priorYear baselines
    outcomes: outcomesR.outcomes, // retention/graduation cohort-walk (provisional — see buildOutcomes)
    gradRate: outcomesR.gradRate, // headline KPI from a MATURE cohort, not the newest
    gradRatePrev: outcomesR.gradRatePrev,
    gradRateYear: outcomesR.gradRateYear,
    // Historical class browser: per-term {totalCourses, campuses, partners, campusCourses}
    termClasses: classHistory.termClasses,
    classTerms: classHistory.classTerms,
    currentClassTerm: classHistory.currentClassTerm,
  };
}
