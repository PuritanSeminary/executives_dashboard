# FE NXT GL query for fully-loaded compensation

The Personnel dashboard shows base compensation (live from Paycor) plus a **fully-loaded**
figure that adds employer taxes, retirement, and benefits. The load factor is derived from
Financial Edge NXT General Ledger actuals, pulled nightly via the SKY **Query API**.

The SKY Query API executes *saved* queries, so one query has to exist in FE NXT. It's the
direct sibling of the existing **"Executive Dashboard - Revenue by Account"** query.

## Query to create (Rachel / finance)

- **Module:** General Ledger
- **Query type:** Account
- **Name:** `Executive Dashboard - Personnel Expense by Account`
  (exact — the aggregator looks it up by name; or set `SKY_GL_QUERY` to override)
- **Filter:** account number begins with one of `10-5000`, `10-5010`, `10-5030`, `10-5210`,
  `10-5330-730` (Payroll Expense, Payroll Taxes, Retirement, Student Wages, Insurance).
  A range filter of `10-5000-*` … `10-5330-*` that includes those groups is fine — the
  aggregator filters to the exact prefixes it needs.
- **Output columns:** `Account` (account number) and net activity for the fiscal year —
  the same **`Net Activity`** field used in the Revenue query (it comes back as
  `Net Activity_1`). Account description is optional/ignored.
- **Fiscal period:** the full fiscal year you want the factor based on (e.g. most recent
  complete FY). Confirm the Net Activity field is actually populated — the Revenue query
  currently returns `0` for Net Activity, which suggests its period/field needs a look.

## How it's consumed

```
node tools/aggregate/finance-load.mjs --list     # confirm the query name/id
node tools/aggregate/finance-load.mjs            # run it → writes comp-load.local.json
```

`finance-load.mjs` executes the query, sums net activity by account-number prefix into
`{ salaries, payrollTaxes, retirement, insurance }`, and writes `comp-load.local.json`.
`hr.mjs` reads that file and computes `factor = (taxes + retirement + insurance) / salaries`,
applied to live Paycor base comp. No raw GL amounts are committed — only the derived factor
and loaded totals reach the snapshot.

## Bucketing (finance-load.mjs)

| Bucket | Account prefixes |
|---|---|
| `salaries` | `10-5000`, `10-5210` (payroll + student wages — matches Paycor base, which includes students) |
| `payrollTaxes` | `10-5010` |
| `retirement` | `10-5030` |
| `insurance` | `10-5330-730` |
