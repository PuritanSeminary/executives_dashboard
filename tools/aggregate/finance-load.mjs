// finance-load.mjs — pull personnel-expense actuals from a saved FE NXT GL query and
// write them to comp-load.local.json, which hr.mjs reads to compute the fully-loaded
// comp factor. Decoupled on purpose: the Query API is the source, comp-load.local.json
// is the contract, hr.mjs is the consumer.
//
//   node finance-load.mjs            # run the query, refresh the load config
//   node finance-load.mjs --list     # list saved GL queries (to confirm the name)
//
// The saved query (see docs/sky-gl-query.md) must output one row per GL account with:
//   - an account-number column   (matched by /account.*(number|no)/i)
//   - a fiscal-year actual column (matched by AMOUNT_COL below)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SkyClient } from './lib/sky.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG_OUT = path.join(__dirname, 'comp-load.local.json');

// Matches the sibling of Rachel's "Executive Dashboard - Revenue by Account" query.
const QUERY_NAME = process.env.SKY_GL_QUERY || 'Executive Dashboard - Personnel Expense by Account';
const AMOUNT_COL = /net activity|activity|this year|ytd|actual|end.*balance|balance/i; // FY actual column ("Net Activity_1" in FE)
const ACCT_COL = /account.*(number|no)|^account$/i; // "Account" holds the account number

// Which account-number prefixes roll into each load bucket.
const BUCKETS = {
  salaries: [/^10-5000/, /^10-5210/], // payroll expense + student wages (matches Paycor base, which includes students)
  payrollTaxes: [/^10-5010/],
  retirement: [/^10-5030/],
  insurance: [/^10-5330-730/],
};

const num = (v) => Number(String(v ?? '').replace(/[$,()\s]/g, '').replace(/^-?$/, '0')) * (String(v).includes('(') ? -1 : 1) || 0;

function pickCol(row, re) {
  const key = Object.keys(row).find((k) => re.test(k));
  return key ? row[key] : undefined;
}

export async function refreshCompLoad() {
  const sky = new SkyClient();
  await sky.refresh();
  const rows = await sky.runQueryByName(QUERY_NAME);
  if (!rows.length) throw new Error(`query "${QUERY_NAME}" returned 0 rows`);

  const totals = { salaries: 0, payrollTaxes: 0, retirement: 0, insurance: 0 };
  let matched = 0;
  for (const row of rows) {
    const acct = String(pickCol(row, ACCT_COL) ?? '').trim();
    const amt = num(pickCol(row, AMOUNT_COL));
    if (!acct) continue;
    for (const [bucket, pats] of Object.entries(BUCKETS)) {
      if (pats.some((p) => p.test(acct))) { totals[bucket] += amt; matched++; break; }
    }
  }
  if (!matched) throw new Error('no rows matched the personnel account prefixes — check the query output columns');

  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    basis: `FE NXT GL query "${QUERY_NAME}" (${rows.length} accounts, ${matched} personnel)`,
    salaries: Math.round(totals.salaries),
    payrollTaxes: Math.round(totals.payrollTaxes),
    retirement: Math.round(totals.retirement),
    insurance: Math.round(totals.insurance),
  };
  fs.writeFileSync(CFG_OUT, JSON.stringify(out, null, 2));
  const factor = out.salaries ? (out.payrollTaxes + out.retirement + out.insurance) / out.salaries : 0;
  console.log(`comp-load written: salaries $${out.salaries.toLocaleString()}, load factor ${(factor * 100).toFixed(1)}%`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--list')) {
    const sky = new SkyClient();
    await sky.refresh();
    const qs = await sky.listGlQueries();
    console.log(`${qs.length} saved GL queries:`);
    for (const q of qs) console.log(`  [${q.id}] type ${q.type_id} — ${q.name}`);
  } else {
    await refreshCompLoad();
  }
}
