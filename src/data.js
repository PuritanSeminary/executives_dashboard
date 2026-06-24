// Mock 5-year data for PRTS Executive Dashboard.
// All numbers are illustrative — shaped to feel plausible for a small Reformed seminary
// (~150 students, ~50 staff, $8-12M operating budget). Seeded RNG keeps figures stable
// across renders so trends actually mean something.

const RNG_SEED = 1741;
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(RNG_SEED);
const noise = (mag = 1) => (rng() - 0.5) * 2 * mag;

// 62 months: May 2021 → Jun 2026. The FINAL month (Jun 2026) is the current,
// partial month — "month-to-date" (MTD). Everything before it is a COMPLETE
// month. MTD_FRAC is the share of the current month elapsed; the live backend
// will compute this from the calendar (days elapsed / days in month). Until
// then it is a single source of truth that scales the partial month's actuals
// AND the budget it is measured against, so MTD-vs-budget stays apples-to-apples.
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const START = { y: 2021, m: 4 }; // May 2021 (0-indexed month)
const N_MONTHS = 62;            // last index (61) = Jun 2026 = MTD
const MTD_FRAC = 0.07;          // ≈ share of the current month elapsed (as of Jun 2)

function makeMonths() {
  const arr = [];
  for (let i = 0; i < N_MONTHS; i++) {
    const y = START.y + Math.floor((START.m + i) / 12);
    const m = (START.m + i) % 12;
    arr.push({ y, m, idx: i, label: `${MONTH_NAMES[m]} '${String(y).slice(2)}`, full: `${MONTH_NAMES[m]} ${y}`, mtd: i === N_MONTHS - 1 });
  }
  return arr;
}
const MONTHS = makeMonths();

// ── Period helpers (shared by every domain) ─────────────────────────────
// CURRENT_YEAR is the calendar year of the MTD month. "YTD" means every
// COMPLETE month of CURRENT_YEAR (the partial MTD month is excluded — that is
// what was dragging the trend lines down). "MTD" is the partial month alone.
const MTD_IDX = MONTHS.findIndex(m => m.mtd);
const CURRENT_YEAR = MONTHS[MTD_IDX].y;
const YTD_IDXS = MONTHS.map((m, i) => (m.y === CURRENT_YEAR && !m.mtd ? i : -1)).filter(i => i >= 0);
const YTD_MONTHS = YTD_IDXS.length; // complete months elapsed this year
// Sum the complete year-to-date slice of any monthly series.
const sumYtd = (series) => YTD_IDXS.reduce((s, i) => s + series[i], 0);

// ───────────────────────────────────────────────────────────────────────
// FINANCIAL — Financial Edge NXT, refresh monthly
// ───────────────────────────────────────────────────────────────────────

// Real expense cost centers from the PRTS Statement of Activities (FY 2025–26,
// as of Apr 30, 2026). Each carries the real YTD and MTD actual/budget plus the
// prior-year YTD. Department heads are the responsible cabinet officers.
const DEPARTMENTS = [
  { id: 'academics',  name: 'Academics',            head: 'Dr. Bilkes',     ytdActual: 1_925_215, ytdBudget: 2_060_460, priorYear: 1_802_086, mtdActual: 205_592, mtdBudget: 228_608 },
  { id: 'admin',      name: 'Administration',       head: 'Dr. Neele',      ytdActual: 1_284_776, ytdBudget: 1_355_684, priorYear: 1_240_728, mtdActual: 145_482, mtdBudget: 153_506 },
  { id: 'bookstore',  name: 'Bookstore',            head: 'Bill Thies',     ytdActual:    88_859, ytdBudget:    94_140, priorYear:    85_341, mtdActual:   8_823, mtdBudget:  10_460 },
  { id: 'chancellor', name: 'Chancellor',           head: 'Dr. Beeke',      ytdActual:   392_722, ytdBudget:   376_468, priorYear:   334_272, mtdActual:  41_077, mtdBudget:  39_052 },
  { id: 'facilities', name: 'Facilities',           head: 'Bill Thies',     ytdActual:   257_759, ytdBudget:   223_671, priorYear:   310_567, mtdActual:  30_109, mtdBudget:  25_519 },
  { id: 'tech',       name: 'Information Tech',     head: 'Seth Huckstead', ytdActual:   540_729, ytdBudget:   512_568, priorYear:   446_048, mtdActual:  43_750, mtdBudget:  56_952 },
  { id: 'philanthropy', name: 'Philanthropy',       head: 'Karla Soule',    ytdActual:   159_744, ytdBudget:   205_749, priorYear:   145_475, mtdActual:  11_732, mtdBudget:  22_861 },
  { id: 'projects',   name: 'Projects & Comm',      head: 'Jo DeBlois',     ytdActual:   787_039, ytdBudget:   625_929, priorYear:   583_785, mtdActual:  74_289, mtdBudget:  67_881 },
];

const finance = {};
// Build a plausible 5-year monthly series for each cost center whose level sits
// around its real monthly run-rate, ends near the latest month's actual, and
// carries mild seasonality + noise. The TABLE and KPIs read the REAL aggregate
// fields above; this series only drives the trend lines and sparklines.
finance.departments = DEPARTMENTS.map(d => {
  const monthly = d.ytdActual / 12;
  const series = MONTHS.map((mo, i) => {
    const t = i / (N_MONTHS - 1);
    const ramp = 0.82 + 0.18 * t;                              // gentle growth to today
    const seasonal = 1 + Math.sin((mo.m / 12) * Math.PI * 2) * 0.07;
    let v = monthly * ramp * seasonal * (1 + noise(0.06));
    if (mo.mtd) v *= MTD_FRAC;                                 // partial current month
    return Math.round(v);
  });
  const variance = (d.ytdActual - d.ytdBudget) / d.ytdBudget;
  const mtdVariance = (d.mtdActual - d.mtdBudget) / d.mtdBudget;
  return {
    ...d, series,
    budget: d.ytdBudget, annualBudget: d.ytdBudget,
    monthlyBudget: Math.round(d.ytdBudget / 12),
    variance, mtdVariance,
  };
});

// Tuition realization — list price vs net (after aid). Per-semester.
finance.tuition = {
  list: 17400, // per student / year tuition
  realization: [
    { year: 2021, list: 17400, net: 13110, students: 142, rate: 0.753 },
    { year: 2022, list: 17400, net: 12889, students: 148, rate: 0.741 },
    { year: 2023, list: 18200, net: 13104, students: 156, rate: 0.720 },
    { year: 2024, list: 18900, net: 13325, students: 161, rate: 0.705 },
    { year: 2025, list: 19600, net: 13524, students: 168, rate: 0.690 },
    { year: 2026, list: 20400, net: 13872, students: 172, rate: 0.680, mtd: true },
  ],
};

// Investments — held at Greenleaf Trust. Total ties to the balance sheet
// ($13.21M); asset-class composition matches the Statement investments chart.
finance.investments = {
  asOf: 'Apr 30, 2026',
  custodian: 'Greenleaf Trust',
  composition: [
    { name: 'Equities',         value: 6_500_000, pct: 0.49 },
    { name: 'Cash Equivalents', value: 4_300_000, pct: 0.32 },
    { name: 'Fixed Income',     value: 2_412_516, pct: 0.18 },
  ],
  accounts: [
    { name: 'General Endowment',         balance: 8_200_000, ytd: 0.062, alloc: { eq: 0.62, fi: 0.30, alt: 0.06, cash: 0.02 } },
    { name: 'Beeke Family Chair',        balance: 1_180_000, ytd: 0.071, alloc: { eq: 0.65, fi: 0.28, alt: 0.05, cash: 0.02 } },
    { name: 'Scholarship Endowment',     balance: 2_190_000, ytd: 0.058, alloc: { eq: 0.55, fi: 0.35, alt: 0.08, cash: 0.02 } },
    { name: 'Library Acquisitions Fund', balance:   380_000, ytd: 0.044, alloc: { eq: 0.45, fi: 0.45, alt: 0.05, cash: 0.05 } },
    { name: 'Operating Reserve',         balance: 1_262_516, ytd: 0.038, alloc: { eq: 0.20, fi: 0.60, alt: 0.00, cash: 0.20 } },
  ],
};
finance.investments.total = finance.investments.accounts.reduce((s, a) => s + a.balance, 0);
// 5-year trajectory of total investments
finance.investments.history = (() => {
  const target = finance.investments.total;
  const start = target * 0.71;
  return MONTHS.map((mo, i) => {
    const t = i / (N_MONTHS - 1);
    const trend = start + (target - start) * t;
    const cyc = Math.sin(i / 6) * target * 0.018;
    const shock = i === 18 ? -target * 0.07 : 0; // late 2022 drawdown
    return Math.round(trend + cyc + shock + noise(target * 0.012));
  });
})();

// Grants — initial balance, spent to date, monthly
finance.grants = [
  { id: 'lilly-2023', name: 'Lilly Endowment — Pastoral Formation', funder: 'Lilly Endowment Inc.', awarded: 1_250_000, start: 'Jul 2023', end: 'Jun 2027', spent: 712_000 },
  { id: 'crc-int', name: 'CRC International Theological Education', funder: 'Christian Reformed Church', awarded: 480_000, start: 'Jan 2024', end: 'Dec 2026', spent: 296_000 },
  { id: 'maclellan', name: 'Maclellan — Faculty Sabbatical', funder: 'The Maclellan Foundation', awarded: 180_000, start: 'Sep 2024', end: 'Aug 2026', spent: 124_000 },
  { id: 'dewolf', name: 'DeWolf — Library Digitization', funder: 'DeWolf Family Foundation', awarded: 95_000, start: 'Mar 2025', end: 'Mar 2027', spent: 38_000 },
  { id: 'kern', name: 'Kern Family — Preaching Pedagogy', funder: 'Kern Family Foundation', awarded: 340_000, start: 'Aug 2025', end: 'Jul 2028', spent: 47_000 },
];

// Total operating spend — sum of all dept series
finance.operatingSpend = MONTHS.map((_, i) =>
  finance.departments.reduce((s, d) => s + d.series[i], 0)
);

// ───────────────────────────────────────────────────────────────────────
// DONATIONS — Raiser's Edge NXT, refresh monthly
// ───────────────────────────────────────────────────────────────────────

const donations = {};
const FUNDS = [
  { id: 'unrestricted', name: 'Unrestricted Annual Fund', color: 'ink' },
  { id: 'scholarship',  name: 'Scholarship Fund',         color: 'oxblood' },
  { id: 'library',      name: 'Library Acquisitions',     color: 'navy' },
  { id: 'international', name: 'International Students',  color: 'moss' },
  { id: 'chair',        name: 'Endowed Chairs',           color: 'gold' },
  { id: 'building',     name: 'Capital — Perkins Wing',    color: 'brick' },
];
donations.funds = FUNDS.map((f, fi) => {
  // Annual baseline per fund (TTM target ≈ $4.6M total across funds)
  // Tuned so TTM total lands ≈ $4.6M (matches the overview brief copy)
  const baseMonthly = [1180000, 540000, 230000, 210000, 950000, 350000][fi] / 12;
  const series = MONTHS.map((mo, i) => {
    const seasonal = mo.m === 11 ? 3.4 : mo.m === 5 ? 0.9 : mo.m === 0 ? 1.4 : 1; // Dec spike, Jun dip, Jan rebound
    const growth = 1 + 0.22 * (i / (N_MONTHS - 1));
    let v = baseMonthly * seasonal * growth * (1 + noise(0.18));
    if (mo.mtd) v *= MTD_FRAC;
    return Math.round(v);
  });
  return { ...f, series, ytd: series.slice(-13, -1).reduce((s, v) => s + v, 0) };
});
donations.total = MONTHS.map((_, i) => donations.funds.reduce((s, f) => s + f.series[i], 0));

// New donors / new constituents / retained / planned givers / monthly donors
donations.newDonors      = MONTHS.map((mo, i) => Math.round((38 + i * 0.4) * (mo.m === 11 ? 2.3 : 1) * (1 + noise(0.25))));
donations.newConstituents = MONTHS.map((mo, i) => Math.round((62 + i * 0.6) * (mo.m === 11 ? 1.9 : 1) * (1 + noise(0.22))));
donations.donorsActive   = MONTHS.map((mo, i) => Math.round((820 + i * 4) * (1 + noise(0.06))));
donations.monthlyDonors  = MONTHS.map((_, i) => Math.round(196 + i * 2.4 + noise(8)));
donations.plannedGivers  = MONTHS.map((_, i) => Math.round(34 + i * 0.32 + noise(2)));
donations.avgGift        = MONTHS.map((mo, i) => Math.round((312 + i * 1.8) * (mo.m === 11 ? 1.4 : 1) * (1 + noise(0.12))));

// Top fundraisers (gift officers) — current year
donations.fundraisers = [
  { name: 'Karla Soule',  raised: 1_842_000, gifts: 412, avg: 4471, share: 0.41 },
  { name: 'Mark Kelderman',  raised:   918_400, gifts: 287, avg: 3199, share: 0.20 },
  { name: 'Ruth VanGroningen', raised: 624_000, gifts: 196, avg: 3184, share: 0.14 },
  { name: 'Dr. Joel Beeke',   raised:   486_200, gifts:  82, avg: 5929, share: 0.11 },
  { name: 'House file (no FR)', raised: 612_800, gifts:1240, avg:  494, share: 0.14 },
];

// Gifts by country (cumulative current FY)
donations.byCountry = [
  { country: 'United States', code: 'US', amount: 3_240_000, donors: 1842 },
  { country: 'Canada',        code: 'CA', amount:   612_000, donors:  286 },
  { country: 'Netherlands',   code: 'NL', amount:   384_000, donors:  204 },
  { country: 'United Kingdom',code: 'UK', amount:   142_000, donors:   78 },
  { country: 'South Africa',  code: 'ZA', amount:    96_000, donors:   54 },
  { country: 'Australia',     code: 'AU', amount:    72_000, donors:   41 },
  { country: 'Brazil',        code: 'BR', amount:    48_400, donors:   22 },
  { country: 'Other',         code: '··', amount:    62_100, donors:   38 },
];

// Recent gifts (last 30 days, sampled)
donations.recentGifts = [
  { date: 'May 12', donor: 'Anonymous',                   fund: 'Scholarship Fund',        fundraiser: 'Karla Soule',    amount: 50000 },
  { date: 'May 11', donor: 'Reformed Trust Foundation',   fund: 'Endowed Chairs',          fundraiser: 'Dr. Joel Beeke',    amount: 25000 },
  { date: 'May 10', donor: 'J. & M. VanderHart',          fund: 'Unrestricted Annual',     fundraiser: 'Karla Soule',    amount:  5000 },
  { date: 'May 09', donor: 'Heritage Reformed Cong.',     fund: 'International Students',  fundraiser: 'Mark Kelderman',    amount:  8400 },
  { date: 'May 08', donor: 'P. Veldkamp',                 fund: 'Library Acquisitions',    fundraiser: 'House file',        amount:   500 },
  { date: 'May 08', donor: 'Anonymous (planned)',         fund: 'Endowed Chairs',          fundraiser: 'Dr. Joel Beeke',    amount: 100000 },
  { date: 'May 07', donor: 'Free Church of Scotland',     fund: 'International Students',  fundraiser: 'Ruth VanGroningen', amount: 12000 },
  { date: 'May 06', donor: 'D. Hofstra',                  fund: 'Capital — Perkins Wing',   fundraiser: 'Karla Soule',    amount: 15000 },
  { date: 'May 05', donor: 'Anonymous',                   fund: 'Unrestricted Annual',     fundraiser: 'House file',        amount:   250 },
  { date: 'May 04', donor: 'W. & E. Beeke',               fund: 'Scholarship Fund',        fundraiser: 'Karla Soule',    amount:  3500 },
];

// ───────────────────────────────────────────────────────────────────────
// HR — Paycor, refresh monthly
// ───────────────────────────────────────────────────────────────────────

const hr = {};
hr.headcount = MONTHS.map((mo, i) => {
  const baseFT = 32 + Math.floor(i * 0.12);
  const basePT = 14 + Math.floor(Math.sin(i / 4) * 2);
  const baseStu = (mo.m >= 7 && mo.m <= 11) || mo.m <= 4 ? 24 + Math.floor(i * 0.05) : 8;
  return {
    ft: baseFT + Math.round(noise(1)),
    pt: basePT + Math.round(noise(1)),
    student: baseStu + Math.round(noise(2)),
  };
});

hr.payroll = {
  categories: [
    { name: 'Faculty',        amount: 2_840_000, share: 0.42, fte: 18 },
    { name: 'Administration', amount: 1_120_000, share: 0.17, fte: 11 },
    { name: 'Operations',     amount:   780_000, share: 0.12, fte: 9 },
    { name: 'Library',        amount:   320_000, share: 0.05, fte: 4 },
    { name: 'IT',             amount:   295_000, share: 0.04, fte: 3 },
    { name: 'Student labor',  amount:   140_000, share: 0.02, fte: 26 },
    { name: 'Benefits & tax', amount: 1_204_000, share: 0.18, fte: null },
  ],
  total: 6_699_000,
};
hr.payroll.series = MONTHS.map((mo, i) => {
  // Monthly payroll total trending up ~4.5%/yr
  const annual = 5_800_000 * (1 + 0.045 * (i / 12));
  let v = annual / 12;
  if (mo.m === 6) v *= 1.18; // contract renewal bonus month
  if (mo.mtd) v *= MTD_FRAC;
  return Math.round(v * (1 + noise(0.04)));
});

hr.openPositions = [
  { title: 'Assistant Professor of Old Testament',  dept: 'Faculty',       posted: '2026-02-10', stage: 'Search committee',     candidates: 7 },
  { title: 'Director of Spiritual Formation',       dept: 'Student Life',  posted: '2026-03-22', stage: 'Final interviews',     candidates: 3 },
  { title: 'Annual Fund Officer',                   dept: 'Advancement',   posted: '2026-04-08', stage: 'Screening',            candidates: 14 },
  { title: 'Cataloging Librarian (PT)',             dept: 'Library',       posted: '2026-04-19', stage: 'Posted',               candidates: 5 },
];

// Tenure / retention pulse
hr.tenure = {
  median: 8.2,
  buckets: [
    { range: '< 1 yr',  count: 6 },
    { range: '1–3 yr',  count: 11 },
    { range: '3–7 yr',  count: 14 },
    { range: '7–15 yr', count: 12 },
    { range: '15+ yr',  count: 9 },
  ],
};

// ───────────────────────────────────────────────────────────────────────
// ACADEMIC — Populi, refresh 4×/year (semester)
// ───────────────────────────────────────────────────────────────────────

const academic = {};
academic.semesters = [
  'Fall 2021','Spring 2022','Fall 2022','Spring 2023','Fall 2023',
  'Spring 2024','Fall 2024','Spring 2025','Fall 2025','Spring 2026',
];

academic.programs = [
  { id: 'mdiv',  name: 'Master of Divinity',           students: 78, gpa: 3.61, length: 4.2 },
  { id: 'thm',   name: 'Master of Theology',           students: 22, gpa: 3.74, length: 2.1 },
  { id: 'mts',   name: 'Master of Theological Studies',students: 31, gpa: 3.52, length: 2.8 },
  { id: 'phd',   name: 'Doctor of Philosophy',         students: 18, gpa: 3.78, length: 5.4 },
  { id: 'dmin',  name: 'Doctor of Ministry',           students: 14, gpa: 3.69, length: 3.8 },
  { id: 'cert',  name: 'Certificate Programs',         students:  9, gpa: 3.44, length: 1.2 },
];
academic.totalStudents = academic.programs.reduce((s, p) => s + p.students, 0);

// Funnel — by semester
academic.funnel = academic.semesters.map((s, i) => {
  const t = i / (academic.semesters.length - 1);
  return {
    semester: s,
    inquiries: Math.round(280 + 60 * t + noise(20)),
    applications: Math.round(140 + 30 * t + noise(12)),
    accepted: Math.round(108 + 22 * t + noise(8)),
    matriculated: Math.round(78 + 14 * t + noise(6)),
  };
});

// Matriculation / drop-out / graduation rates — annualized
academic.outcomes = [
  { year: '2021–22', matric: 0.71, retention: 0.91, graduation: 0.84 },
  { year: '2022–23', matric: 0.74, retention: 0.92, graduation: 0.86 },
  { year: '2023–24', matric: 0.72, retention: 0.93, graduation: 0.87 },
  { year: '2024–25', matric: 0.76, retention: 0.94, graduation: 0.89 },
  { year: '2025–26', matric: 0.78, retention: 0.93, graduation: 0.88, partial: true },
];

// Courses offered — by country / partner seminary
academic.partners = [
  { country: 'United States',   institution: 'PRTS — Grand Rapids',          courses: 84 },
  { country: 'Netherlands',     institution: 'Hersteld Hervormd Seminarie',  courses: 18 },
  { country: 'Brazil',          institution: 'Centro Presbiteriano Reformado',courses: 14 },
  { country: 'South Africa',    institution: 'Mukhanyo Theological College',  courses: 11 },
  { country: 'Indonesia',       institution: 'Reformed Institute Jakarta',    courses:  9 },
  { country: 'United Kingdom',  institution: 'London Reformed Seminary',      courses:  7 },
  { country: 'Kenya',           institution: 'Reformed Institute of Kenya',   courses:  6 },
  { country: 'India',           institution: 'Reformed Presbyterian Seminary',courses:  5 },
];
academic.totalCourses = academic.partners.reduce((s, p) => s + p.courses, 0);

// ── Global campus course coverage ───────────────────────────────────────
// MOCK / REPRESENTATIVE DATA — wire to real Populi offering export later.
// A core catalog every campus is expected to teach; each campus offers a
// subset. Coverage status is derived from offered.length / catalog.length.
academic.coreCatalog = [
  { id: 'st1',   title: 'Systematic Theology I',              code: 'ST-501', instructor: 'Dr. Beeke' },
  { id: 'st2',   title: 'Systematic Theology II',             code: 'ST-502', instructor: 'Dr. Beeke' },
  { id: 'heb',   title: 'Hebrew & OT Exegesis',               code: 'OT-602', instructor: 'Dr. Bilkes' },
  { id: 'grk',   title: 'Greek & NT Exegesis',                code: 'NT-603', instructor: 'Dr. Bilkes' },
  { id: 'otb',   title: 'Old Testament Biblical Theology',    code: 'OT-510', instructor: 'Dr. Kuivenhoven' },
  { id: 'ntb',   title: 'New Testament Biblical Theology',    code: 'NT-510', instructor: 'Dr. Bilkes' },
  { id: 'chh',   title: 'Church History & Reformation',       code: 'CH-401', instructor: 'Dr. Kuivenhoven' },
  { id: 'apol',  title: 'Apologetics',                        code: 'AP-520', instructor: 'Dr. Neele' },
  { id: 'hom',   title: 'Reformed Homiletics',                code: 'PT-510', instructor: 'Dr. Neele' },
  { id: 'eth',   title: 'Christian Ethics',                   code: 'ET-530', instructor: 'Dr. Neele' },
  { id: 'miss',  title: 'Missions & Evangelism',              code: 'MI-540', instructor: 'Dr. Kuivenhoven' },
  { id: 'wor',   title: 'Reformed Worship & Liturgy',         code: 'WO-550', instructor: 'Dr. Neele' },
];

// lat/lon are approximate campus-city coordinates. Brazil and India each
// carry two partners to demonstrate multiple campuses within one country.
academic.campuses = [
  { id: 'grand-rapids', institution: 'PRTS — Grand Rapids',           city: 'Grand Rapids', country: 'United States', lat: 42.96, lon: -85.67, hub: true,
    offered: ['st1','st2','heb','grk','otb','ntb','chh','apol','hom','eth','miss','wor'] },
  { id: 'amersfoort',   institution: 'Hersteld Hervormd Seminarie',   city: 'Amersfoort',   country: 'Netherlands',   lat: 52.16, lon:   5.39,
    offered: ['st1','st2','heb','grk','otb','ntb','chh','apol','hom','eth'] },
  { id: 'london',       institution: 'London Reformed Seminary',       city: 'London',       country: 'United Kingdom', lat: 51.51, lon:  -0.13,
    offered: ['st1','st2','grk','ntb','chh','apol','hom'] },
  { id: 'sao-paulo',    institution: 'Centro Presbiteriano Reformado', city: 'São Paulo',    country: 'Brazil',        lat: -23.55, lon: -46.63,
    offered: ['st1','st2','heb','grk','otb','ntb','chh','hom','eth'] },
  { id: 'recife',       institution: 'Seminário Reformado do Nordeste',city: 'Recife',       country: 'Brazil',        lat:  -8.05, lon: -34.88,
    offered: ['st1','heb','grk','chh','hom'] },
  { id: 'kwamhlanga',   institution: 'Mukhanyo Theological College',   city: 'KwaMhlanga',   country: 'South Africa',  lat: -25.43, lon:  28.69,
    offered: ['st1','st2','heb','grk','chh','hom','eth','miss'] },
  { id: 'nairobi',      institution: 'Reformed Institute of Kenya',    city: 'Nairobi',      country: 'Kenya',         lat:  -1.29, lon:  36.82,
    offered: ['st1','grk','chh','hom'] },
  { id: 'jakarta',      institution: 'Reformed Institute Jakarta',     city: 'Jakarta',      country: 'Indonesia',     lat:  -6.21, lon: 106.85,
    offered: ['st1','st2','grk','chh','hom','miss'] },
  { id: 'dehradun',     institution: 'Reformed Presbyterian Seminary', city: 'Dehradun',     country: 'India',         lat:  30.32, lon:  78.03,
    offered: ['st1','chh','hom'] },
  { id: 'bangalore',    institution: 'Bangalore Reformed Institute',   city: 'Bengaluru',    country: 'India',         lat:  12.97, lon:  77.59,
    offered: ['st1','st2','grk','ntb','chh','hom'] },
  { id: 'mcmurdo',      institution: 'McMurdo Chaplaincy Extension',   city: 'McMurdo Station', country: 'Antarctica', lat: -77.85, lon: 166.67,
    offered: ['st1','chh'] },
];

// Course enrollment — top current courses
academic.topCourses = [
  { code: 'ST-501', title: 'Systematic Theology I',          enrolled: 42, cap: 50, instructor: 'Dr. Beeke' },
  { code: 'OT-602', title: 'Hebrew Exegesis: Pentateuch',    enrolled: 18, cap: 24, instructor: 'Dr. Bilkes' },
  { code: 'CH-401', title: 'Reformation Church History',     enrolled: 36, cap: 45, instructor: 'Dr. Kuivenhoven' },
  { code: 'PT-510', title: 'Reformed Homiletics',            enrolled: 28, cap: 32, instructor: 'Dr. Neele' },
  { code: 'NT-603', title: 'Greek Exegesis: Pauline Epistles', enrolled: 21, cap: 24, instructor: 'Dr. Bilkes' },
  { code: 'ST-704', title: 'Puritan Theology Seminar',       enrolled: 14, cap: 18, instructor: 'Dr. Beeke' },
];

// Per-campus course enrollments (representative). Generated deterministically
// from each campus's relative size + course so figures are stable across
// renders. Each entry lists that campus's offered courses sorted by enrolment.
academic.campusSize = {
  'grand-rapids': 1.0, 'amersfoort': 0.58, 'london': 0.42, 'sao-paulo': 0.52,
  'recife': 0.30, 'kwamhlanga': 0.46, 'nairobi': 0.30, 'jakarta': 0.36,
  'dehradun': 0.24, 'bangalore': 0.40,
};
(function buildCampusCourses() {
  const meta = {};
  academic.coreCatalog.forEach(c => { meta[c.id] = c; });
  const seed = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  academic.campusCourses = {};
  academic.campuses.forEach(camp => {
    const size = academic.campusSize[camp.id] || 0.4;
    const rows = camp.offered.map(id => {
      const m = meta[id];
      const s = seed(camp.id + ':' + id);
      const r1 = (s % 1000) / 1000;
      const r2 = ((s >> 10) % 1000) / 1000;
      const cap = Math.round(12 + size * 42 + r2 * 8);
      const enrolled = Math.max(4, Math.min(cap, Math.round(cap * (0.55 + r1 * 0.42))));
      return { code: m.code, title: m.title, instructor: m.instructor, enrolled, cap };
    }).sort((a, b) => b.enrolled - a.enrolled);
    academic.campusCourses[camp.id] = rows;
  });
})();

// ───────────────────────────────────────────────────────────────────────
// DERIVED SNAPSHOTS + KPI TRENDS
// Everything the KPI cards + sparklines display is derived here so the
// dashboard stays in sync when the source numbers above are replaced.
// ───────────────────────────────────────────────────────────────────────

// FINANCE — weighted investment return, tuition realization snapshots, reserve
finance.investments.ytdWeighted =
  finance.investments.accounts.reduce((s, a) => s + a.balance * a.ytd, 0) / finance.investments.total;

finance.tuition.current  = finance.tuition.realization[finance.tuition.realization.length - 1];
finance.tuition.prevYear = finance.tuition.realization[finance.tuition.realization.length - 2];
finance.tuition.priorAY  = finance.tuition.realization[finance.tuition.realization.length - 3]; // "vs. AY '24–25"

// Operating reserve — days of unrestricted cash on hand (last value = current).
finance.reserve = {
  targetDays: 180,
  unrestricted: 3_800_000,
  trend: [156, 152, 150, 148, 145, 142],
};
finance.reserve.days = finance.reserve.trend[finance.reserve.trend.length - 1];

// ACADEMIC — enrollment census is a snapshot; build a per-semester history
// whose final point equals the current totals so sparklines stay honest.
academic.gpaWeighted = +(
  academic.programs.reduce((s, p) => s + p.gpa * p.students, 0) / academic.totalStudents
).toFixed(2);
academic.gradRate     = academic.outcomes[academic.outcomes.length - 1].graduation;
academic.gradRatePrev = academic.outcomes[academic.outcomes.length - 2].graduation;

academic.enrollmentTrend = academic.semesters.map((s, i) => {
  const t = i / (academic.semesters.length - 1);
  return Math.round(academic.totalStudents * (0.86 + 0.14 * t));
});
academic.enrollmentTrend[academic.enrollmentTrend.length - 1] = academic.totalStudents;
academic.priorYearEnrollment = academic.enrollmentTrend[academic.enrollmentTrend.length - 3]; // 2 semesters back

academic.gpaTrend = academic.semesters.map((s, i) => {
  const t = i / (academic.semesters.length - 1);
  return +(academic.gpaWeighted - 0.08 * (1 - t)).toFixed(2);
});
academic.gpaTrend[academic.gpaTrend.length - 1] = academic.gpaWeighted;
academic.gpaPriorYear = academic.gpaTrend[academic.gpaTrend.length - 3];

academic.coursesTrend = [124, 134, 138, 142, 148, academic.totalCourses];
academic.coursesPriorYear = academic.coursesTrend[academic.coursesTrend.length - 2];

// ───────────────────────────────────────────────────────────────────────
// FINANCE — calendar-year aggregates, YTD pacing, prior-year baselines, and
// a full income statement (all derived from the monthly series so the totals
// tie out when the source numbers change).
// ───────────────────────────────────────────────────────────────────────
const FY_YEARS = [2023, 2024, 2025, 2026];
const yearIdxs = (y) => MONTHS.map((m, i) => (m.y === y ? i : -1)).filter(i => i >= 0);
const sumYear = (series, y) => yearIdxs(y).reduce((s, i) => s + series[i], 0);

finance.annualBudget = finance.departments.reduce((s, d) => s + d.budget, 0);
finance.monthlyBudget = Math.round(finance.annualBudget / 12);

// ── Real Statement of Activities (FY 2025–26, as of Apr 30, 2026) ──────────
// Operating EXPENSE, YTD (fiscal year to date) and MTD (current month). Each
// compared against the budget for that same period — the annual budget is
// phased across the months, so MTD uses the month's own budget.
finance.ytd = {
  spend: 5_436_845, budget: 5_454_669, priorYear: 4_948_303,
  elapsedMonths: 12, monthLabel: 'Apr 2026',
};
finance.ytd.variance = (finance.ytd.spend - finance.ytd.budget) / finance.ytd.budget;

finance.mtd = {
  spend: 560_854, budget: 604_839, priorYear: 581_253,
  monthlyBudget: finance.monthlyBudget, monthLabel: 'Apr 2026',
};
finance.mtd.variance = (finance.mtd.spend - finance.mtd.budget) / finance.mtd.budget;

// Operating REVENUE by category, YTD + MTD (Actual / Budget / Prior Year).
finance.revenue = {
  ytd: { actual: 9_206_793, budget: 8_274_506, priorYear: 7_424_777 },
  mtd: { actual:   656_461, budget:   300_771, priorYear:   212_133 },
  categories: [
    { name: 'Tuition',     ytdActual:   939_086, ytdBudget: 1_039_543, priorYear:   816_571, mtdActual:  95_069, mtdBudget: 117_000 },
    { name: 'Donations',   ytdActual: 5_607_199, ytdBudget: 5_587_934, priorYear: 5_464_861, mtdActual: 184_621, mtdBudget:  73_054 },
    { name: 'Grants',      ytdActual: 1_335_085, ytdBudget: 1_285_716, priorYear:   694_382, mtdActual:  71_429, mtdBudget:       0 },
    { name: 'Investments', ytdActual:   965_193, ytdBudget:         0, priorYear:   144_542, mtdActual: 339_180, mtdBudget:       0 },
    { name: 'Rental',      ytdActual:   224_354, ytdBudget:   224_658, priorYear:   203_565, mtdActual:  25_781, mtdBudget:  24_962 },
    { name: 'Bookstore',   ytdActual:    96_251, ytdBudget:   101_934, priorYear:    83_387, mtdActual:  11_691, mtdBudget:  11_326 },
    { name: 'Other',       ytdActual:    39_626, ytdBudget:    34_721, priorYear:    17_468, mtdActual:     118, mtdBudget:   3_000 },
  ],
};
finance.revenue.ytd.variance = (finance.revenue.ytd.actual - finance.revenue.ytd.budget) / finance.revenue.ytd.budget;
finance.revenue.mtd.variance = (finance.revenue.mtd.actual - finance.revenue.mtd.budget) / finance.revenue.mtd.budget;

// Net surplus / (deficit).
finance.net = {
  ytd: { actual: 3_769_949, budget: 2_819_837, priorYear: 2_476_474 },
  mtd: { actual:    95_607, budget:  -304_068, priorYear:  -369_120 },
};

// Statement of Activities convenience structure consumed by the Financial view.
finance.statement = {
  revenue: finance.revenue.categories,
  revenueTotal: { ytd: finance.revenue.ytd, mtd: finance.revenue.mtd },
  expense: finance.departments.map(d => ({
    name: d.name, ytdActual: d.ytdActual, ytdBudget: d.ytdBudget,
    priorYear: d.priorYear, mtdActual: d.mtdActual, mtdBudget: d.mtdBudget,
  })),
  expenseTotal: {
    ytd: { actual: finance.ytd.spend, budget: finance.ytd.budget, priorYear: finance.ytd.priorYear },
    mtd: { actual: finance.mtd.spend, budget: finance.mtd.budget, priorYear: finance.mtd.priorYear },
  },
  net: finance.net,
};

// Year-to-date by fund (the GL fund dimension), Actual vs. Prior Year.
finance.byFund = {
  revenue: [
    { name: 'General',      actual: 7_508_720, priorYear: 6_079_928 },
    { name: 'Global',       actual: 1_334_901, priorYear:   694_382 },
    { name: 'Scholarships', actual:   256_536, priorYear:   602_466 },
    { name: 'Other',        actual:   106_636, priorYear:    48_000 },
  ],
  revenueTotal: { actual: 9_206_793, priorYear: 7_424_777 },
  expense: [
    { name: 'General',      actual: 3_759_645, priorYear: 3_563_075 },
    { name: 'Scholarships', actual:   579_501, priorYear:   523_779 },
    { name: 'Global',       actual:   544_969, priorYear:   220_037 },
    { name: 'Lilly',        actual:   357_857, priorYear:   247_245 },
    { name: 'Other',        actual:   194_872, priorYear:   394_167 },
  ],
  expenseTotal: { actual: 5_436_845, priorYear: 4_948_303 },
  net: { actual: 3_769_949, priorYear: 2_476_474 },
};

// Seminary assets (balance sheet snapshot).
finance.assets = {
  rows: [
    { name: 'Cash',                 current:    286_320, prior:     60_172 },
    { name: 'Accounts Receivable',  current:    256_843, prior:    135_762 },
    { name: 'Inventory',            current:    132_952, prior:     96_576 },
    { name: 'Prepaids & Software',  current:    318_668, prior:    543_270 },
    { name: 'Fixed Assets — Cost',  current: 13_363_582, prior: 13_271_740 },
    { name: 'Depreciation',         current: -3_773_115, prior: -3_399_553 },
    { name: 'Investments',          current: 13_212_516, prior: 10_292_380 },
  ],
  total: { current: 23_797_766, prior: 21_000_347 },
};

// Prior-year baselines for KPI deltas.
finance.grantsBalance     = finance.grants.reduce((s, g) => s + (g.awarded - g.spent), 0);
finance.grantsPriorBalance = 1_040_000;

// ───────────────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────────────

window.PRTS_DATA = {
  months: MONTHS,
  finance,
  donations,
  hr,
  academic,
  // Period metadata so views don't re-derive the calendar.
  period: {
    mtdIdx: MTD_IDX,
    mtdFrac: MTD_FRAC,
    mtdLabel: MONTHS[MTD_IDX].full,
    currentYear: CURRENT_YEAR,
    ytdMonths: YTD_MONTHS,
    lastCompleteLabel: MONTHS[YTD_IDXS[YTD_IDXS.length - 1]].full,
  },
  meta: {
    sources: {
      financial:  { system: 'Financial Edge NXT', cadence: 'Monthly', lastSync: 'May 31, 2026' },
      donations:  { system: "Raiser's Edge NXT",  cadence: 'Monthly', lastSync: 'May 31, 2026' },
      hr:         { system: 'Paycor',             cadence: 'Monthly', lastSync: 'May 31, 2026' },
      academic:   { system: 'Populi',             cadence: 'Per semester', lastSync: 'Mar 15, 2026' },
    },
  },
};

// ───────────────────────────────────────────────────────
// VIEW HELPERS — drop the partial current month from a monthly series unless
// the active range is explicitly MTD. Charts call these so the trend lines end
// on the last fully-posted month instead of dipping into a half-empty one.
// ───────────────────────────────────────────────────────
window.PRTS_VIEW = {
  isMtd: (rangeId) => rangeId === 'mtd',
  // months array for the chart x-axis (drops MTD unless rangeId === 'mtd')
  months: (rangeId) => (rangeId === 'mtd' ? MONTHS : MONTHS.slice(0, MTD_IDX)),
  // a monthly series trimmed to match .months()
  trend: (series, rangeId) => (rangeId === 'mtd' ? series : series.slice(0, MTD_IDX)),
  // drop MTD unconditionally (for detail views that aren't MTD-specific)
  complete: (series) => series.slice(0, MTD_IDX),
};

// ───────────────────────────────────────────────────────
// DATA ACCESS LAYER — every chart that needs a server round-trip reads through
// PRTS_API. Today these return slices of the mock series above; when the
// backend is live, replace each body with the matching fetch() and keep the
// SAME return shape ([{ idx, label, full, mtd, value }]) and the components
// won't need to change. The `live` stubs show the intended endpoint.
// ───────────────────────────────────────────────────────
window.PRTS_API = {
  // Monthly donations for one fund (fundId) or all funds (fundId == null),
  // trailing `months` COMPLETE months. The partial current month is excluded
  // unless includeMtd is true.
  donationsMonthly({ fundId = null, months = 12, includeMtd = false } = {}) {
    const src = fundId
      ? donations.funds.find(f => f.id === fundId).series
      : donations.total;
    const points = MONTHS.map((m, i) => ({ idx: i, label: m.label, full: m.full, mtd: m.mtd, value: src[i] }));
    const usable = includeMtd ? points : points.filter(p => !p.mtd);
    return usable.slice(-months);
    // LIVE: const q = new URLSearchParams({ fund: fundId ?? 'all', months, includeMtd });
    //       return (await fetch(`/api/donations/monthly?${q}`)).json();
  },
  // Monthly operating spend, trailing `months` complete months (+ optional MTD).
  operatingMonthly({ months = 60, includeMtd = false } = {}) {
    const points = MONTHS.map((m, i) => ({ idx: i, label: m.label, full: m.full, mtd: m.mtd, value: finance.operatingSpend[i] }));
    const usable = includeMtd ? points : points.filter(p => !p.mtd);
    return usable.slice(-months);
    // LIVE: return (await fetch(`/api/finance/operating?months=${months}`)).json();
  },
};

// ───────────────────────────────────────────────────────
// MANUAL REFRESH — re-pulls the latest figures on demand. In production this
// re-reads the cache the cron job maintains (see Architecture UML reference);
// here it simulates fresh intraday postings landing in the current (still
// open) month and stamps a new sync time. Returns the new "HH:MM GMT" stamp.
// Settled (complete) months are never touched — only the open month moves,
// which is exactly how a real on-demand pull behaves between nightly syncs.
// ───────────────────────────────────────────────────────
window.PRTS_API.refresh = function refresh() {
  const D = window.PRTS_DATA;
  const i = D.period.mtdIdx; // index of the current, still-accumulating month
  const drift = () => 1 + (Math.random() * 0.011 - 0.001); // ~ -0.1% … +1.0%
  const bump = (arr) => {
    if (Array.isArray(arr) && typeof arr[i] === 'number') arr[i] = Math.round(arr[i] * drift());
  };

  // Live monthly series — the open month grows as transactions post.
  bump(finance.operatingSpend);
  if (finance.investments && Array.isArray(finance.investments.history)) bump(finance.investments.history);
  // Donations: bump each fund, then keep the headline total = sum of funds.
  if (Array.isArray(donations.funds)) {
    let sum = 0;
    donations.funds.forEach((f) => { bump(f.series); if (typeof f.series[i] === 'number') sum += f.series[i]; });
    if (sum > 0 && Array.isArray(donations.total)) donations.total[i] = sum;
  } else {
    bump(donations.total);
  }

  // Stamp the sync time in GMT/UTC.
  const now = new Date();
  const stamp = String(now.getUTCHours()).padStart(2, '0') + ':' +
                String(now.getUTCMinutes()).padStart(2, '0') + ' GMT';
  D.meta.lastRefresh = stamp;

  // Hand back a NEW top-level object so React memos keyed on PRTS_DATA recompute
  // (nested finance/donations objects are mutated in place and shared through).
  window.PRTS_DATA = Object.assign({}, D);
  return stamp;
};
