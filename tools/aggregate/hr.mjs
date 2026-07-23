// hr.mjs — Paycor → PRTS_DATA.hr
//
// Live: headcount (FT/PT/student, current + 62-mo trend), tenure, payroll-by-department
// (annualized from current pay rates). Open positions = ATS (wired separately, if scoped).
//
// Student-worker rule (confirmed with Seth 2026-07-23): worker type "Seasonal" = student.
// Paycor has no native student flag; PRTS tags student workers as Seasonal.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaycorClient } from './lib/paycor.mjs';

// Fully-loaded compensation via a GL-derived employer load factor.
// The SKY Financial Edge API exposes account metadata but not period actuals, so
// we can't pull the totals live (Query API isn't entitled on this app). Instead we
// read a small set of FY totals for the personnel account groups — Payroll (5000),
// Payroll Taxes (5010), Retirement (5030), Insurance (5330-730) — from a gitignored
// local file, derive factor = (taxes+retirement+insurance)/salaries, and apply it to
// live Paycor base comp. The factor is stable; refresh it when finance re-runs the GL.
// Returns null (panel falls back to base-only) until the file has real numbers.
function loadedComp(baseTotal) {
  try {
    const p = path.join(path.dirname(fileURLToPath(import.meta.url)), 'comp-load.local.json');
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    const salaries = Number(c.salaries) || 0;
    if (!(salaries > 0) || !(baseTotal > 0)) return null;
    const parts = [
      { name: 'Employer payroll taxes', gl: Number(c.payrollTaxes) || 0 },
      { name: 'Retirement (employer)', gl: Number(c.retirement) || 0 },
      { name: 'Insurance / benefits', gl: Number(c.insurance) || 0 },
    ];
    const factor = parts.reduce((s, x) => s + x.gl, 0) / salaries;
    // Express each load component relative to our live base comp (not the GL salaries
    // figure) so the parts sum to the loaded total we show.
    const components = parts.map((x) => ({
      name: x.name,
      amount: Math.round(baseTotal * (x.gl / salaries)),
      share: +(x.gl / salaries).toFixed(4),
    }));
    return {
      base: Math.round(baseTotal),
      total: Math.round(baseTotal * (1 + factor)),
      factor: +factor.toFixed(4),
      components,
      basis: c.basis || null,
      asOf: c.asOf || null,
    };
  } catch {
    return null; // no config yet → base-only
  }
}

function classify(e) {
  if (e.statusData?.isFullTime === true) return 'ft';
  if (e.statusData?.type === 'Seasonal') return 'student';
  return 'pt';
}

const d10 = (s) => (s ? String(s).slice(0, 10) : null); // ISO datetime → YYYY-MM-DD

function lastMonthEnds(n = 62) {
  const out = [];
  const now = new Date();
  let y = now.getUTCFullYear(), mo = now.getUTCMonth();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(y, mo + 1, 0)); // last day of month (y,mo)
    out.unshift(d.toISOString().slice(0, 10));
    if (--mo < 0) { mo = 11; y--; }
  }
  return out;
}

function buildTenure(active) {
  const today = Date.now();
  const yrs = active
    .map((e) => d10(e.employmentDateData?.hireDate))
    .filter(Boolean)
    .map((h) => (today - new Date(h).getTime()) / (365.25 * 86400000));
  const buckets = [
    { range: '< 1 yr', min: 0, max: 1 }, { range: '1–3 yr', min: 1, max: 3 },
    { range: '3–7 yr', min: 3, max: 7 }, { range: '7–15 yr', min: 7, max: 15 },
    { range: '15+ yr', min: 15, max: Infinity },
  ].map((b) => ({ range: b.range, count: yrs.filter((y) => y >= b.min && y < b.max).length }));
  const sorted = [...yrs].sort((a, b) => a - b);
  const median = sorted.length ? +(sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1) : 0;
  return { median, buckets };
}

async function buildPayroll(client, active, deptName) {
  // Current annualized comp per active employee → group by department.
  const byDept = new Map();
  let total = 0;
  for (const e of active) {
    let rate = 0;
    try {
      const rows = await client.payrates(e.id);
      // current rate = no end date, else latest effectiveStartDate
      const current = rows
        .filter((r) => !r.effectiveEndDate || d10(r.effectiveEndDate) >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => String(b.effectiveStartDate).localeCompare(String(a.effectiveStartDate)))[0]
        || rows.sort((a, b) => String(b.effectiveStartDate).localeCompare(String(a.effectiveStartDate)))[0];
      rate = Number(current?.annualPayRate) || 0;
    } catch { /* skip employees whose payrates error */ }
    const dept = deptName.get(e.department?.id) || 'Unassigned';
    const g = byDept.get(dept) || { name: dept, amount: 0, fte: 0 };
    g.amount += rate; g.fte += 1;
    byDept.set(dept, g);
    total += rate;
  }
  const rows = [...byDept.values()]
    .map((g) => ({ name: g.name, amount: Math.round(g.amount), fte: g.fte, share: total ? +(g.amount / total).toFixed(3) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  // Confidentiality (k-anonymity): a 1–2 person department's slice is an individual's
  // salary. Never emit a dept with fewer than 3 people — fold those + the long tail
  // into "Other departments" (which also keeps the donut legible at ~8 slices).
  const KMIN = 3;
  const big = rows.filter((c) => c.fte >= KMIN);
  const head = big.slice(0, 7);
  const tail = [...rows.filter((c) => c.fte < KMIN), ...big.slice(7)];
  let categories = head;
  if (tail.length) {
    categories = [...head, {
      name: 'Other departments',
      amount: tail.reduce((s, c) => s + c.amount, 0),
      fte: tail.reduce((s, c) => s + c.fte, 0),
      share: +tail.reduce((s, c) => s + c.share, 0).toFixed(3),
    }];
  }
  return { categories, total: Math.round(total), basis: 'annualized base compensation (excludes benefits/taxes)' };
}

export async function buildHr() {
  const client = new PaycorClient();
  const depts = await client.departments();
  const deptName = new Map(depts.map((d) => [d.id, d.description || d.code || 'Unknown']));

  const all = await client.employees('?include=All'); // all statuses (for the trend)
  const active = all.filter((e) => e.statusData?.status === 'Active');

  // Current headcount split.
  const current = { ft: 0, pt: 0, student: 0 };
  for (const e of active) current[classify(e)]++;

  // Faculty for the student:faculty ratio (per Seth): FT resident professors =
  // full-time employees whose job title contains "Professor". (The "Non-Res"
  // department flag is an instruction/cost-center label, not the professor's residency.)
  const faculty = active.filter(
    (e) => e.statusData?.isFullTime === true && /professor/i.test(e.positionData?.jobTitle || '')
  ).length;

  // 62-month headcount trend from hire/termination dates (FT/PT/student by current type).
  const months = lastMonthEnds(62);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels = months.map((m) => { const [y, mo] = m.split('-'); return `${MON[+mo - 1]} '${y.slice(2)}`; });
  const headcount = months.map((m) => {
    const b = { ft: 0, pt: 0, student: 0 };
    for (const e of all) {
      const hire = d10(e.employmentDateData?.hireDate);
      if (!hire || hire > m) continue;
      const term = d10(e.employmentDateData?.terminationDate);
      if (term && term <= m) continue;
      b[classify(e)]++;
    }
    return b;
  });

  const tenure = buildTenure(active);
  const payroll = await buildPayroll(client, active, deptName);
  payroll.loaded = loadedComp(payroll.total); // fully-loaded comp via GL load factor (null until configured)
  // (Dropped the synthetic monthly payroll "series" — it implied real trailing spend
  // we don't have; the KPI now shows the annualized total honestly. Real trailing
  // spend would come from paystub/payitem endpoints — a later enhancement.)

  return {
    headcount,
    months: monthLabels, // x-axis labels aligned to the live headcount trend
    payroll,
    tenure,
    faculty, // teaching-faculty headcount (for student:faculty ratio)
    openPositions: null, // ATS — wired separately if Recruiting scope is enabled
    meta: { activeCount: active.length, allCount: all.length, current, faculty },
  };
}
