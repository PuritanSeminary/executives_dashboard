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

// 60 months: May 2021 → May 2026 (inclusive of current month, May 2026 = MTD)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const START = { y: 2021, m: 4 }; // May 2021 (0-indexed month)
const N_MONTHS = 61;

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

// ───────────────────────────────────────────────────────────────────────
// FINANCIAL — Financial Edge NXT, refresh monthly
// ───────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { id: 'academic',    name: 'Academic Affairs',       budget: 1820000, head: 'Dr. Bilkes' },
  { id: 'faculty',     name: 'Faculty & Instruction',  budget: 2640000, head: 'Dr. Beeke' },
  { id: 'library',     name: 'Hekman Library',         budget:  420000, head: 'M. VanderMeer' },
  { id: 'student',     name: 'Student Life',           budget:  295000, head: 'P. Tuininga' },
  { id: 'advancement', name: 'Advancement',            budget:  710000, head: 'K. Bartlema' },
  { id: 'operations',  name: 'Operations & Facilities',budget: 1180000, head: 'J. Bilkes' },
  { id: 'tech',        name: 'Information Technology', budget:  340000, head: 'A. DeJong' },
  { id: 'admin',       name: 'Administration',         budget:  680000, head: 'Dr. Neele' },
  { id: 'international', name: 'International Programs', budget: 540000, head: 'Dr. Macleod' },
];

// Spending pattern: each dept has a baseline monthly burn + seasonal + noise + a
// "story" — some over budget, some under, a couple with one-off events.
const DEPT_STORIES = {
  academic:     { drift:  1.02, season: 0.05, event: null },
  faculty:      { drift:  1.04, season: 0.02, event: null }, // slightly over
  library:      { drift:  1.14, season: 0.08, event: { idx: 56, mag: 1.4 } }, // OVER >10%, journal renewal spike
  student:      { drift:  0.93, season: 0.12, event: null }, // UNDER >10%
  advancement:  { drift:  1.08, season: 0.18, event: { idx: 52, mag: 1.6 } }, // gala
  operations:   { drift:  1.11, season: 0.10, event: { idx: 47, mag: 1.5 } }, // boiler replacement → OVER
  tech:         { drift:  1.22, season: 0.06, event: { idx: 54, mag: 1.8 } }, // SIS migration → OVER
  admin:        { drift:  0.98, season: 0.04, event: null },
  international:{ drift:  0.86, season: 0.20, event: null }, // UNDER, deferred travel
};

const finance = {};
finance.departments = DEPARTMENTS.map(d => {
  const story = DEPT_STORIES[d.id];
  const monthlyBudget = d.budget / 12;
  const series = MONTHS.map((mo, i) => {
    const seasonal = 1 + Math.sin((mo.m / 12) * Math.PI * 2) * story.season;
    const eventMul = story.event && story.event.idx === i ? story.event.mag : 1;
    const drift = 1 + (story.drift - 1) * (i / (N_MONTHS - 1));
    let v = monthlyBudget * seasonal * eventMul * drift * (1 + noise(0.08));
    if (mo.mtd) v *= 0.42; // MTD partial
    return Math.round(v);
  });
  // Last 12 months actual vs same period budget
  const last12 = series.slice(-13, -1);
  const ytdActual = series.slice(-13, -1).reduce((s, v) => s + v, 0);
  const ytdBudget = d.budget;
  const variance = (ytdActual - ytdBudget) / ytdBudget;
  return { ...d, series, ytdActual, ytdBudget, variance };
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

// Investment accounts — Greenleaf Trust
finance.investments = {
  asOf: 'Apr 30, 2026',
  custodian: 'Greenleaf Trust',
  accounts: [
    { name: 'General Endowment',         balance: 14_820_000, ytd: 0.062, alloc: { eq: 0.62, fi: 0.30, alt: 0.06, cash: 0.02 } },
    { name: 'Beeke Family Chair',        balance:  2_140_000, ytd: 0.071, alloc: { eq: 0.65, fi: 0.28, alt: 0.05, cash: 0.02 } },
    { name: 'Scholarship Endowment',     balance:  3_960_000, ytd: 0.058, alloc: { eq: 0.55, fi: 0.35, alt: 0.08, cash: 0.02 } },
    { name: 'Library Acquisitions Fund', balance:    680_000, ytd: 0.044, alloc: { eq: 0.45, fi: 0.45, alt: 0.05, cash: 0.05 } },
    { name: 'Operating Reserve',         balance:  1_240_000, ytd: 0.038, alloc: { eq: 0.20, fi: 0.60, alt: 0.00, cash: 0.20 } },
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
  { id: 'building',     name: 'Capital — Hekman Wing',    color: 'brick' },
];
donations.funds = FUNDS.map((f, fi) => {
  // Annual baseline per fund (TTM target ≈ $4.6M total across funds)
  // Tuned so TTM total lands ≈ $4.6M (matches the overview brief copy)
  const baseMonthly = [1180000, 540000, 230000, 210000, 950000, 350000][fi] / 12;
  const series = MONTHS.map((mo, i) => {
    const seasonal = mo.m === 11 ? 3.4 : mo.m === 5 ? 0.9 : mo.m === 0 ? 1.4 : 1; // Dec spike, Jun dip, Jan rebound
    const growth = 1 + 0.22 * (i / (N_MONTHS - 1));
    let v = baseMonthly * seasonal * growth * (1 + noise(0.18));
    if (mo.mtd) v *= 0.45;
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
  { name: 'Karla Bartlema',  raised: 1_842_000, gifts: 412, avg: 4471, share: 0.41 },
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
  { date: 'May 12', donor: 'Anonymous',                   fund: 'Scholarship Fund',        fundraiser: 'Karla Bartlema',    amount: 50000 },
  { date: 'May 11', donor: 'Reformed Trust Foundation',   fund: 'Endowed Chairs',          fundraiser: 'Dr. Joel Beeke',    amount: 25000 },
  { date: 'May 10', donor: 'J. & M. VanderHart',          fund: 'Unrestricted Annual',     fundraiser: 'Karla Bartlema',    amount:  5000 },
  { date: 'May 09', donor: 'Heritage Reformed Cong.',     fund: 'International Students',  fundraiser: 'Mark Kelderman',    amount:  8400 },
  { date: 'May 08', donor: 'P. Veldkamp',                 fund: 'Library Acquisitions',    fundraiser: 'House file',        amount:   500 },
  { date: 'May 08', donor: 'Anonymous (planned)',         fund: 'Endowed Chairs',          fundraiser: 'Dr. Joel Beeke',    amount: 100000 },
  { date: 'May 07', donor: 'Free Church of Scotland',     fund: 'International Students',  fundraiser: 'Ruth VanGroningen', amount: 12000 },
  { date: 'May 06', donor: 'D. Hofstra',                  fund: 'Capital — Hekman Wing',   fundraiser: 'Karla Bartlema',    amount: 15000 },
  { date: 'May 05', donor: 'Anonymous',                   fund: 'Unrestricted Annual',     fundraiser: 'House file',        amount:   250 },
  { date: 'May 04', donor: 'W. & E. Beeke',               fund: 'Scholarship Fund',        fundraiser: 'Karla Bartlema',    amount:  3500 },
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
  if (mo.mtd) v *= 0.5;
  return Math.round(v * (1 + noise(0.04)));
});

hr.openPositions = [
  { title: 'Assistant Professor of Old Testament',  dept: 'Faculty',       posted: '2026-02-10', stage: 'Search committee',     candidates: 7 },
  { title: 'Director of Spiritual Formation',       dept: 'Student Life',  posted: '2026-03-22', stage: 'Final interviews',     candidates: 3 },
  { title: 'Annual Fund Officer',                   dept: 'Advancement',   posted: '2026-04-08', stage: 'Screening',            candidates: 14 },
  { title: 'Cataloging Librarian (PT)',             dept: 'Library',       posted: '2026-04-19', stage: 'Posted',               candidates: 5 },
  { title: 'Network Administrator',                 dept: 'IT',            posted: '2026-01-30', stage: 'Re-opening — declined offer', candidates: 0 },
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
  { id: 'mdiv',  name: 'Master of Divinity',           students: 78, gpa: 3.61, length: 4.2, capacity: 95 },
  { id: 'thm',   name: 'Master of Theology',           students: 22, gpa: 3.74, length: 2.1, capacity: 30 },
  { id: 'mts',   name: 'Master of Theological Studies',students: 31, gpa: 3.52, length: 2.8, capacity: 45 },
  { id: 'phd',   name: 'Doctor of Philosophy',         students: 18, gpa: 3.78, length: 5.4, capacity: 22 },
  { id: 'dmin',  name: 'Doctor of Ministry',           students: 14, gpa: 3.69, length: 3.8, capacity: 24 },
  { id: 'cert',  name: 'Certificate Programs',         students:  9, gpa: 3.44, length: 1.2, capacity: 20 },
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

// Course enrollment — top current courses
academic.topCourses = [
  { code: 'ST-501', title: 'Systematic Theology I',          enrolled: 42, cap: 50, instructor: 'Dr. Beeke' },
  { code: 'OT-602', title: 'Hebrew Exegesis: Pentateuch',    enrolled: 18, cap: 24, instructor: 'Dr. Bilkes' },
  { code: 'CH-401', title: 'Reformation Church History',     enrolled: 36, cap: 45, instructor: 'Dr. Murray' },
  { code: 'PT-510', title: 'Reformed Homiletics',            enrolled: 28, cap: 32, instructor: 'Dr. Neele' },
  { code: 'NT-603', title: 'Greek Exegesis: Pauline Epistles', enrolled: 21, cap: 24, instructor: 'Dr. Smith' },
  { code: 'ST-704', title: 'Puritan Theology Seminar',       enrolled: 14, cap: 18, instructor: 'Dr. Beeke' },
];

// ───────────────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────────────

window.PRTS_DATA = {
  months: MONTHS,
  finance,
  donations,
  hr,
  academic,
  meta: {
    sources: {
      financial:  { system: 'Financial Edge NXT', cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      donations:  { system: "Raiser's Edge NXT",  cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      hr:         { system: 'Paycor',             cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      academic:   { system: 'Populi',             cadence: 'Per semester', lastSync: 'Mar 15, 2026' },
    },
  },
};
