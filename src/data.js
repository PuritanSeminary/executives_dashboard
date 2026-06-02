// ─────────────────────────────────────────────────────────────────────────────
// PRTS Executive Dashboard — data.js
// Financial data: REAL, from Financial Edge NXT via Power BI export
//   Source files: Financial_Summary_-_Apr.pdf + FS_for_dashboard.xlsx
//   As of: April 30, 2026 (YTD = 9 months, Aug 2025 – Apr 2026)
// Academic data: PARTIAL REAL (page 1 of 3 from Populi, A–H surnames)
//   Full count pending Populi pagination fix — see ITM-185
// Donations / HR: Mock (Raiser's Edge / Paycor integration pending)
// ─────────────────────────────────────────────────────────────────────────────

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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const START = { y: 2021, m: 4 };
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

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL — REAL DATA from Financial Edge NXT
// As of April 30, 2026  |  Fiscal Year: Aug 2025 – Jul 2026
// ─────────────────────────────────────────────────────────────────────────────

const finance = {};

// ── YTD Revenue (9 months, Aug 2025 – Apr 2026) ──────────────────────────────
finance.ytdRevenue = {
  asOf: 'Apr 30, 2026',
  periodLabel: 'YTD (9 months)',
  total:       9_206_793,
  budget:      8_274_508,
  priorYear:   7_424_182,
  vsbudget:      932_285,   // favorable
  vsPriorYear: 1_782_611,   // favorable
  byCategory: [
    { id: 'donations',   name: 'Donations',    actual: 5_607_199, budget: 5_587_934, priorYear: 5_464_861, share: 0.609 },
    { id: 'grants',      name: 'Grants',       actual: 1_335_085, budget: 1_285_714, priorYear:   694_382, share: 0.145 },
    { id: 'investments', name: 'Investments',  actual:   965_193, budget:         0, priorYear:   144_542, share: 0.105 },
    { id: 'tuition',     name: 'Tuition',      actual:   939_086, budget: 1_039_543, priorYear:   816_571, share: 0.102 },
    { id: 'rental',      name: 'Rental',       actual:   224_354, budget:   224_659, priorYear:   203_565, share: 0.024 },
    { id: 'bookstore',   name: 'Bookstore',    actual:    96_251, budget:   101_934, priorYear:    83_387, share: 0.010 },
    { id: 'other',       name: 'Other',        actual:    39_626, budget:    34_721, priorYear:    17_468, share: 0.004 },
  ],
};

// ── YTD Expenses (9 months) ───────────────────────────────────────────────────
finance.ytdExpense = {
  total:     5_436_845,
  budget:    5_454_669,
  priorYear: 4_948_303,
  vsbudget:    -17_824,   // favorable (under budget)
  byDepartment: [
    { id: 'academics',    name: 'Academics',            actual: 1_925_215, budget: 2_060_460, priorYear: 1_802_086 },
    { id: 'admin',        name: 'Administration',       actual: 1_284_776, budget: 1_355_684, priorYear: 1_240_728 },
    { id: 'projcomm',     name: 'Projects & Comm',      actual:   767_817, budget:   625_931, priorYear:   574_185 },
    { id: 'chancellor',   name: 'Chancellor',           actual:   392_722, budget:   376_452, priorYear:   334_272 },
    { id: 'it',           name: 'Information Tech',     actual:   540_729, budget:   512_568, priorYear:   446_048 },
    { id: 'operations',   name: 'Operations',           actual:   307_322, budget:   482_653, priorYear:   352_255 },
    { id: 'facilities',   name: 'Facilities',           actual:   257_759, budget:   223_663, priorYear:   310_567 },
    { id: 'philanthropy', name: 'Philanthropy',         actual:   159_744, budget:   205_766, priorYear:   145_475 },
    { id: 'bookstore',    name: 'Bookstore',            actual:    88_859, budget:    94_132, priorYear:    85_341 },
    { id: 'hospitality',  name: 'Hospitality',          actual:    18_543, budget:    20_345, priorYear:    18_629 },
  ],
};

// ── Net Surplus ───────────────────────────────────────────────────────────────
finance.netSurplus = {
  ytdActual:    3_769_949,
  ytdBudget:    2_819_828,
  ytdPriorYear: 2_475_879,
  fyForecast:   2_144_802,
  fyBudget:     1_817_358,
};

// ── Full-Year Forecast ────────────────────────────────────────────────────────
finance.fyForecast = {
  revenue: { forecast: 9_478_522, budget: 9_032_451, priorYear: 8_696_444 },
  expense: { forecast: 7_333_719, budget: 7_215_092, priorYear: 7_268_463 },
  net:     { forecast: 2_144_802, budget: 1_817_358, priorYear: 1_427_982 },
};

// ── Monthly MTD (April 2026) ──────────────────────────────────────────────────
finance.mtd = {
  month: 'April 2026',
  revenue: { actual: 656_461, budget: 300_772, priorYear: 212_018 },
  expense: { actual: 560_854, budget: 604_839, priorYear: 581_253 },
  net:     { actual:  95_607, budget: -304_069, priorYear: -369_235 },
};

// ── Revenue by Fund (YTD) ─────────────────────────────────────────────────────
finance.byFund = [
  { name: 'General',     actual: 7_508_720, priorYear: 6_079_928, vsLY: 1_428_792 },
  { name: 'Global',      actual: 1_334_901, priorYear:   694_382, vsLY:   640_519 },
  { name: 'Scholarships',actual:   256_536, priorYear:   602_466, vsLY:  -345_930 },
  { name: 'Other',       actual:   106_636, priorYear:    48_000, vsLY:    58_636 },
];

// ── Investments (Apr 30, 2026) ────────────────────────────────────────────────
finance.investments = {
  asOf: 'Apr 30, 2026',
  total: 13_212_516,
  allocation: {
    shortTerm:  4_259_089,  // 32%
    equities:   6_512_718,  // 49%
    fixedIncome: 2_440_709, // 18%
  },
  // 13-month trend (Apr 2025 – Apr 2026), real from Excel
  history: {
    labels: ['Apr \'25','May \'25','Jun \'25','Jul \'25','Aug \'25','Sep \'25','Oct \'25','Nov \'25','Dec \'25','Jan \'26','Feb \'26','Mar \'26','Apr \'26'],
    shortTerm:   [1_737_200, 1_247_219, 1_480_653, 1_317_210,   871_972,   239_830, 2_408_620, 2_002_014, 2_389_825, 5_213_932, 5_088_569, 4_971_398, 4_259_089],
    equities:    [3_064_314, 3_242_530, 3_381_432, 3_431_996, 3_521_940, 3_631_195, 3_707_182, 3_718_519, 3_713_743, 3_808_205, 3_830_908, 4_598_349, 6_512_718],
    fixedIncome: [5_649_756, 5_616_385, 5_144_685, 5_124_270, 5_158_138, 5_161_010, 4_962_424, 4_975_394, 4_661_975, 4_554_029, 4_580_139, 3_530_499, 2_440_709],
    totals:      [10_451_270,10_106_134,10_006_770, 9_873_476, 9_552_050, 9_032_035,11_078_226,10_695_927,10_765_543,13_576_166,13_499_616,13_100_246,13_212_516],
  },
};

// ── Balance Sheet / Assets (Apr 30, 2026) ────────────────────────────────────
finance.assets = {
  asOf: 'Apr 30, 2026',
  totalAssets: 23_797_766,
  priorYearAssets: 21_000_347,
  items: [
    { name: 'Cash & Bank Accounts',  current: 286_320,    prior:    60_172 },
    { name: 'Accounts Receivable',   current: 256_843,    prior:   135_762 },
    { name: 'Inventory',             current: 132_952,    prior:    96_576 },
    { name: 'Prepaids & Software',   current: 318_668,    prior:   543_270 },
    { name: 'Fixed Assets (net)',     current: 9_590_467,  prior: 9_872_187 },
    { name: 'Investments',           current: 13_212_516, prior: 10_292_380 },
  ],
};

// ── Cash & Liquidity (Apr 30, 2026) ──────────────────────────────────────────
finance.cash = {
  asOf: 'Apr 30, 2026',
  expenseCoverageMonths: 7.51,
  operatingCash: 317_392,  // sum of all bank accounts
  accounts: [
    { name: 'Operations Checking',  balance: 25_224 },
    { name: 'BMO Operations',       balance: 139_641 },
    { name: 'BMO Canada USD',       balance:  11_857 },
    { name: 'BMO Canada CAD',       balance: 140_670 },
  ],
  // Monthly expense coverage trend (real)
  coverageTrend: {
    labels: ['Apr \'25','May \'25','Jun \'25','Jul \'25','Aug \'25','Sep \'25','Oct \'25','Nov \'25','Dec \'25','Jan \'26','Feb \'26','Mar \'26','Apr \'26'],
    months: [2.97, 2.35, 2.80, 2.43, 1.71, 1.41, 4.54, 4.37, 7.86, 9.56, 9.12, 8.58, 7.51],
  },
};

// ── Grants (keep mock names, update total to match real $1.335M YTD) ─────────
finance.grants = [
  { id: 'lilly-2023',  name: 'Lilly Endowment — Pastoral Formation',     funder: 'Lilly Endowment Inc.',       awarded: 1_250_000, start: 'Jul 2023', end: 'Jun 2027', spent:   712_000 },
  { id: 'crc-int',     name: 'CRC International Theological Education',   funder: 'Christian Reformed Church',  awarded:   480_000, start: 'Jan 2024', end: 'Dec 2026', spent:   296_000 },
  { id: 'maclellan',   name: 'Maclellan — Faculty Sabbatical',            funder: 'The Maclellan Foundation',   awarded:   180_000, start: 'Sep 2024', end: 'Aug 2026', spent:   124_000 },
  { id: 'dewolf',      name: 'DeWolf — Library Digitization',             funder: 'DeWolf Family Foundation',   awarded:    95_000, start: 'Mar 2025', end: 'Mar 2027', spent:    38_000 },
  { id: 'kern',        name: 'Kern Family — Preaching Pedagogy',          funder: 'Kern Family Foundation',     awarded:   340_000, start: 'Aug 2025', end: 'Jul 2028', spent:    47_000 },
];
finance.grantsYTDTotal = 1_335_085; // real

// ─────────────────────────────────────────────────────────────────────────────
// DONATIONS — Mock (Raiser's Edge NXT integration pending)
// NOTE: YTD total $5,607,199 is real — monthly series below is mock shape
// ─────────────────────────────────────────────────────────────────────────────

const donations = {};
const FUNDS = [
  { id: 'unrestricted', name: 'Unrestricted Annual Fund', color: 'ink' },
  { id: 'scholarship',  name: 'Scholarship Fund',         color: 'oxblood' },
  { id: 'library',      name: 'Library Acquisitions',     color: 'navy' },
  { id: 'international',name: 'International Students',   color: 'moss' },
  { id: 'chair',        name: 'Endowed Chairs',           color: 'gold' },
  { id: 'building',     name: 'Capital — Hekman Wing',    color: 'brick' },
];
donations.funds = FUNDS.map((f, fi) => {
  const baseMonthly = [1_180_000, 540_000, 230_000, 210_000, 950_000, 350_000][fi] / 12;
  const series = MONTHS.map((mo, i) => {
    const seasonal = mo.m === 11 ? 3.4 : mo.m === 5 ? 0.9 : mo.m === 0 ? 1.4 : 1;
    const growth = 1 + 0.22 * (i / (N_MONTHS - 1));
    let v = baseMonthly * seasonal * growth * (1 + noise(0.18));
    if (mo.mtd) v *= 0.45;
    return Math.round(v);
  });
  return { ...f, series, ytd: series.slice(-13, -1).reduce((s, v) => s + v, 0) };
});
donations.total = MONTHS.map((_, i) => donations.funds.reduce((s, f) => s + f.series[i], 0));
// Real YTD total — override the mock ytd sum for display
donations.ytdActual = 5_607_199;
donations.ytdBudget = 5_587_934;
donations.ytdPriorYear = 5_464_861;

donations.newDonors       = MONTHS.map((mo, i) => Math.round((38 + i * 0.4) * (mo.m === 11 ? 2.3 : 1) * (1 + noise(0.25))));
donations.newConstituents = MONTHS.map((mo, i) => Math.round((62 + i * 0.6) * (mo.m === 11 ? 1.9 : 1) * (1 + noise(0.22))));
donations.donorsActive    = MONTHS.map((mo, i) => Math.round((820 + i * 4) * (1 + noise(0.06))));
donations.monthlyDonors   = MONTHS.map((_, i) => Math.round(196 + i * 2.4 + noise(8)));
donations.plannedGivers   = MONTHS.map((_, i) => Math.round(34 + i * 0.32 + noise(2)));
donations.avgGift         = MONTHS.map((mo, i) => Math.round((312 + i * 1.8) * (mo.m === 11 ? 1.4 : 1) * (1 + noise(0.12))));

donations.fundraisers = [
  { name: 'Karla Soule',         raised: 1_842_000, gifts: 412, avg: 4471, share: 0.41 },
  { name: 'Mark Kelderman',      raised:   918_400, gifts: 287, avg: 3199, share: 0.20 },
  { name: 'Ruth VanGroningen',   raised:   624_000, gifts: 196, avg: 3184, share: 0.14 },
  { name: 'Dr. Joel Beeke',      raised:   486_200, gifts:  82, avg: 5929, share: 0.11 },
  { name: 'House file (no FR)',  raised:   612_800, gifts:1240, avg:  494, share: 0.14 },
];

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

donations.recentGifts = [
  { date: 'May 12', donor: 'Anonymous',               fund: 'Scholarship Fund',       fundraiser: 'Karla Soule',       amount:  50_000 },
  { date: 'May 11', donor: 'Reformed Trust Foundation',fund: 'Endowed Chairs',         fundraiser: 'Dr. Joel Beeke',    amount:  25_000 },
  { date: 'May 10', donor: 'J. & M. VanderHart',      fund: 'Unrestricted Annual',    fundraiser: 'Karla Soule',       amount:   5_000 },
  { date: 'May 09', donor: 'Heritage Reformed Cong.',  fund: 'International Students', fundraiser: 'Mark Kelderman',    amount:   8_400 },
  { date: 'May 08', donor: 'P. Veldkamp',              fund: 'Library Acquisitions',   fundraiser: 'House file',        amount:     500 },
  { date: 'May 08', donor: 'Anonymous (planned)',      fund: 'Endowed Chairs',         fundraiser: 'Dr. Joel Beeke',    amount: 100_000 },
  { date: 'May 07', donor: 'Free Church of Scotland',  fund: 'International Students', fundraiser: 'Ruth VanGroningen', amount:  12_000 },
  { date: 'May 06', donor: 'D. Hofstra',               fund: 'Capital — Hekman Wing',  fundraiser: 'Karla Soule',       amount:  15_000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HR — Mock (Paycor integration pending)
// ─────────────────────────────────────────────────────────────────────────────

const hr = {};
hr.headcount = MONTHS.map((mo, i) => {
  const baseFT  = 32 + Math.floor(i * 0.12);
  const basePT  = 14 + Math.floor(Math.sin(i / 4) * 2);
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
    { name: 'Operations',     amount:   780_000, share: 0.12, fte:  9 },
    { name: 'Library',        amount:   320_000, share: 0.05, fte:  4 },
    { name: 'IT',             amount:   295_000, share: 0.04, fte:  3 },
    { name: 'Student labor',  amount:   140_000, share: 0.02, fte: 26 },
    { name: 'Benefits & tax', amount: 1_204_000, share: 0.18, fte: null },
  ],
  total: 6_699_000,
};
hr.payroll.series = MONTHS.map((mo, i) => {
  const annual = 5_800_000 * (1 + 0.045 * (i / 12));
  let v = annual / 12;
  if (mo.m === 6) v *= 1.18;
  if (mo.mtd) v *= 0.5;
  return Math.round(v * (1 + noise(0.04)));
});

hr.openPositions = [
  { title: 'Assistant Professor of Old Testament',  dept: 'Faculty',      posted: '2026-02-10', stage: 'Search committee', candidates:  7 },
  { title: 'Director of Spiritual Formation',       dept: 'Student Life', posted: '2026-03-22', stage: 'Final interviews', candidates:  3 },
  { title: 'Annual Fund Officer',                   dept: 'Advancement',  posted: '2026-04-08', stage: 'Screening',        candidates: 14 },
  { title: 'Cataloging Librarian (PT)',             dept: 'Library',      posted: '2026-04-19', stage: 'Posted',           candidates:  5 },
];

hr.tenure = {
  median: 8.2,
  buckets: [
    { range: '< 1 yr',  count:  6 },
    { range: '1–3 yr',  count: 11 },
    { range: '3–7 yr',  count: 14 },
    { range: '7–15 yr', count: 12 },
    { range: '15+ yr',  count:  9 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC — Partial real (Populi page 1 only, A–H surnames, Fall 2025-2026)
// Full 467-student count pending pagination fix with Isaac — see ITM-185
// ─────────────────────────────────────────────────────────────────────────────

const academic = {};
academic.semesters = [
  'Fall 2021','Spring 2022','Fall 2022','Spring 2023','Fall 2023',
  'Spring 2024','Fall 2024','Spring 2025','Fall 2025','Spring 2026',
];

// NOTE: student counts below are from page 1 of 3 (200 rows, A–H surnames).
// Full-term total is 467 rows (per Populi metadata). These are real program
// distributions but undercounted — scale factor ~2.3x when full data available.
academic.programs = [
  { id: 'mdiv', name: 'Master of Divinity',                 students: 78,  gpa: 3.61, length: 4.2, capacity:  95, dataNote: 'partial' },
  { id: 'mar',  name: 'Master of Arts (Religion)',          students: 31,  gpa: 3.52, length: 2.8, capacity:  45, dataNote: 'partial' },
  { id: 'thm',  name: 'Master of Theology (course based)', students: 22,  gpa: 3.74, length: 2.1, capacity:  30, dataNote: 'partial' },
  { id: 'mabc', name: 'Master of Arts in Biblical Counseling', students: 14, gpa: 3.69, length: 2.5, capacity: 24, dataNote: 'partial' },
  { id: 'phd',  name: 'Doctor of Philosophy (PhD)',         students: 18,  gpa: 3.78, length: 5.4, capacity:  22, dataNote: 'partial' },
  { id: 'dmin', name: 'Doctor of Ministry (DMin)',          students:  3,  gpa: 3.69, length: 3.8, capacity:  24, dataNote: 'partial' },
];
// Real Populi metadata: 467 total rows across all programs (incl. non-matric)
academic.totalStudents = 172; // unique degree-seeking (est. from page 1 ratio; full=~400)
academic.totalStudentsNote = 'Partial (page 1 of 3 from Populi — full count ~400+ pending pagination fix)';
academic.populiTermId = 292286;
academic.populiTermName = 'Fall 2025-2026';

academic.funnel = academic.semesters.map((s, i) => {
  const t = i / (academic.semesters.length - 1);
  return {
    semester: s,
    inquiries:    Math.round(280 + 60 * t + noise(20)),
    applications: Math.round(140 + 30 * t + noise(12)),
    accepted:     Math.round(108 + 22 * t + noise(8)),
    matriculated: Math.round( 78 + 14 * t + noise(6)),
  };
});

academic.outcomes = [
  { year: '2021–22', matric: 0.71, retention: 0.91, graduation: 0.84 },
  { year: '2022–23', matric: 0.74, retention: 0.92, graduation: 0.86 },
  { year: '2023–24', matric: 0.72, retention: 0.93, graduation: 0.87 },
  { year: '2024–25', matric: 0.76, retention: 0.94, graduation: 0.89 },
  { year: '2025–26', matric: 0.78, retention: 0.93, graduation: 0.88, partial: true },
];

academic.partners = [
  { country: 'United States',  institution: 'PRTS — Grand Rapids',           courses: 84 },
  { country: 'Netherlands',    institution: 'Hersteld Hervormd Seminarie',   courses: 18 },
  { country: 'Brazil',         institution: 'Centro Presbiteriano Reformado', courses: 14 },
  { country: 'South Africa',   institution: 'Mukhanyo Theological College',   courses: 11 },
  { country: 'Indonesia',      institution: 'Reformed Institute Jakarta',      courses:  9 },
  { country: 'United Kingdom', institution: 'London Reformed Seminary',        courses:  7 },
  { country: 'Kenya',          institution: 'Reformed Institute of Kenya',     courses:  6 },
  { country: 'India',          institution: 'Reformed Presbyterian Seminary',  courses:  5 },
];
academic.totalCourses = academic.partners.reduce((s, p) => s + p.courses, 0);

academic.topCourses = [
  { code: 'ST-501', title: 'Systematic Theology I',            enrolled: 42, cap: 50, instructor: 'Dr. Beeke' },
  { code: 'OT-602', title: 'Hebrew Exegesis: Pentateuch',      enrolled: 18, cap: 24, instructor: 'Dr. Bilkes' },
  { code: 'CH-401', title: 'Reformation Church History',       enrolled: 36, cap: 45, instructor: 'Dr. Kuivenhoven' },
  { code: 'PT-510', title: 'Reformed Homiletics',              enrolled: 28, cap: 32, instructor: 'Dr. Neele' },
  { code: 'NT-603', title: 'Greek Exegesis: Pauline Epistles', enrolled: 21, cap: 24, instructor: 'Dr. Bilkes' },
  { code: 'ST-704', title: 'Puritan Theology Seminar',         enrolled: 14, cap: 18, instructor: 'Dr. Beeke' },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

window.PRTS_DATA = {
  months: MONTHS,
  finance,
  donations,
  hr,
  academic,
  meta: {
    dataQuality: {
      financial:  'REAL — Financial Edge NXT via Power BI, Apr 30 2026',
      donations:  'MOCK — Raiser\'s Edge NXT integration pending (YTD total $5.6M is real)',
      hr:         'MOCK — Paycor integration pending',
      academic:   'PARTIAL REAL — Populi page 1 of 3 (A–H surnames); full count pending pagination fix',
    },
    sources: {
      financial:  { system: 'Financial Edge NXT', cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      donations:  { system: "Raiser's Edge NXT",  cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      hr:         { system: 'Paycor',             cadence: 'Monthly', lastSync: 'Apr 30, 2026' },
      academic:   { system: 'Populi',             cadence: 'Per semester', lastSync: 'Jun 2, 2026' },
    },
  },
};
