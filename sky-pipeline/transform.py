"""
Transform a Financial Edge query-71 (Transactions) CSV into the v1 financial
figures the dashboard's Financial tab consumes: YTD revenue by category, total
YTD expense, and net surplus.

This reproduces the logic of the proven local pull (sky_source/sky_run_revenue.py)
and the .pbix recipe, with two deliberate, verified refinements:

  1. Account Type comes from the ACCOUNT-CODE PREFIX RULE, not a frozen lookup CSV
     (verified identical to the pbix "Account Category" column):
         1 -> Asset      4 -> Revenue      5/6/7 -> Expense
         2 -> Liability  3 -> Net Assets   else  -> Other
     New account codes classify automatically instead of dropping to "Unknown".

  2. Department code is the LAST '-' segment of the Account field, joined to the
     hand-maintained Departments table as a ZERO-PADDED STRING (never an int, or
     '000' would collapse to 0 and '110' would lose its identity). Verified: the
     Account field is `{fund}-{accountcode}-{dept}` and its last segment equals the
     Department Code in 396/396 distinct account strings.

  3. Department 999 ("Non-Operations", investment/endowment activity ~$1.25M) is
     EXCLUDED from operating revenue to match the Power BI report (confirmed by
     Alec). The excluded amount is logged and reported, never silently dropped.

Sign convention (matches sky_run_revenue.py): GL stores revenue as negative, so
revenue is summed then multiplied by -1; expense is stored positive and summed
as-is; net = revenue - expense.

The YTD window is computed from the RUN DATE against an Aug-1 fiscal-year start
(matches the pbix Fiscal Periods YTD flag): the complete periods of the current
fiscal year, EXCLUDING the current partial period. Nothing is read from a static
fiscal-periods file.

The SKY API is the source of truth; Power BI is the reference to validate against,
so this mapping mirrors the .pbix exactly (including cases where a department's
category differs from its name, e.g. 600 -> Administration, 601 -> Investments).
"""

import logging
from datetime import date, datetime

log = logging.getLogger(__name__)

# --- Query-71 CSV columns (as produced by the SKY export; see sky_run_revenue.py) ---
ACCOUNT_CODE_COL = "Account code"   # e.g. "1300" -> prefix drives Account Type
ACCOUNT_COL = "Account"             # e.g. "10-1300-000" -> last segment is the dept
AMOUNT_COL = "Amount"
POST_DATE_COL = "Post date"
POST_DATE_FMT = "%m/%d/%Y"

# Departments excluded from OPERATING revenue to match the Power BI report. 999
# ("Non-Operations") is investment/endowment activity (~$1.25M), not operating
# revenue — confirmed by Alec; PBI excludes it, so we do too. Tracked, not dropped.
EXCLUDED_REVENUE_DEPTS = {"999"}

# Department Code -> Category. Hand-maintained inline table lifted verbatim from the
# pbix "Departments" table (29 rows), verified 1:1 against Transactions (0 gaps,
# 0 orphans) and 29/29 faithful to the pbix categories. Kept as code because the
# pbix itself hardcodes it inline and it changes rarely; codes are STRINGS to
# preserve leading zeros.
DEPT_CATEGORY = {
    "000": "Operations",
    "100": "Academics",
    "110": "Academics",
    "111": "Tuition",
    "120": "Academics",
    "130": "Academics",
    "140": "Academics",
    "200": "Bookstore",
    "300": "Philanthropy",
    "301": "Donations",
    "302": "Grants",
    "400": "Projects & Comm",
    "401": "Other",
    "600": "Administration",
    "601": "Investments",
    "610": "Facilities",
    "611": "Rental",
    "620": "Administration",
    "710": "Administration",
    "720": "Administration",
    "730": "Administration",
    "800": "Information Tech",
    "810": "Information Tech",
    "820": "Information Tech",
    "900": "Chancellor",
    "901": "Other",
    "910": "Special Projects",
    "914": "Projects & Comm",
    "999": "Non-Operations",
}


def classify_account_type(account_code: str) -> str:
    """Prefix rule -> Asset / Liability / Net Assets / Revenue / Expense / Other."""
    code = (account_code or "").strip()
    if not code:
        return "Other"
    first = code[0]
    if first == "1":
        return "Asset"
    if first == "2":
        return "Liability"
    if first == "3":
        return "Net Assets"
    if first == "4":
        return "Revenue"
    if first in ("5", "6", "7"):
        return "Expense"
    return "Other"


def _fiscal_year_and_period(d: date) -> tuple[int, int]:
    """Calendar date -> (fiscal_year, fiscal_period 1..12). Fiscal year starts Aug 1."""
    if d.month >= 8:
        return d.year + 1, d.month - 7
    return d.year, d.month + 5


def year_period_key(d: date) -> str:
    """Calendar date -> fiscal 'YYYY-PP' key (e.g. Aug 2025 -> '2026-01')."""
    fy, period = _fiscal_year_and_period(d)
    return f"{fy}-{period:02d}"


def ytd_window(today: date) -> tuple[set[str], int, int]:
    """
    Return (ytd_period_keys, current_fiscal_year, last_full_period).

    YTD = every COMPLETE period of the current fiscal year, i.e. periods 1 through
    (current period - 1). The current, still-accumulating period is EXCLUDED
    (matches the pbix YTD flag and the dashboard's YTD definition). At the very
    start of a fiscal year (August, period 1) last_full_period is 0 and the set is
    empty, which is correct.
    """
    if today.month >= 8:
        cfy, current_period = today.year + 1, today.month - 7
    else:
        cfy, current_period = today.year, today.month + 5
    last_full = current_period - 1
    keys = {f"{cfy}-{p:02d}" for p in range(1, last_full + 1)}
    return keys, cfy, last_full


def parse_department(account: str) -> str:
    """Last '-' segment of the Account field, zero-padded to 3 chars (STRING join)."""
    acct = (account or "").strip()
    seg = acct.split("-")[-1].strip() if "-" in acct else ""
    return seg.zfill(3) if seg else ""


def to_float(s: str) -> float:
    s = (s or "").replace(",", "").replace("$", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def build_financial(rows, today: date, generated_at_iso: str) -> dict:
    """
    Aggregate query-71 rows into the v1 payload.

    `rows` is any iterable of dict rows (e.g. csv.DictReader). Only rows whose Post
    date falls in the YTD window are counted.
    """
    ytd_keys, cfy, last_full = ytd_window(today)

    rev_total = 0.0
    exp_total = 0.0
    rev_by_cat: dict[str, float] = {}
    rows_in_window = 0
    skipped_dates = 0
    unmapped_rev: dict[str, float] = {}
    excluded_rev: dict[str, float] = {}

    for row in rows:
        raw_date = (row.get(POST_DATE_COL) or "").strip()
        try:
            dt = datetime.strptime(raw_date, POST_DATE_FMT).date()
        except ValueError:
            skipped_dates += 1
            continue
        if year_period_key(dt) not in ytd_keys:
            continue

        rows_in_window += 1
        atype = classify_account_type(row.get(ACCOUNT_CODE_COL))
        amt = to_float(row.get(AMOUNT_COL))

        if atype == "Revenue":
            dept = parse_department(row.get(ACCOUNT_COL))
            if dept in EXCLUDED_REVENUE_DEPTS:
                # Non-operating (investment/endowment) — excluded to match Power BI.
                # Kept out of rev_total AND rev_by_cat; tracked below for reporting.
                excluded_rev[dept] = excluded_rev.get(dept, 0.0) + amt
                continue
            rev_total += amt
            cat = DEPT_CATEGORY.get(dept, "Unknown")
            rev_by_cat[cat] = rev_by_cat.get(cat, 0.0) + amt
            if cat == "Unknown":
                unmapped_rev[dept] = unmapped_rev.get(dept, 0.0) + amt
        elif atype == "Expense":
            exp_total += amt

    # GL stores revenue negative -> flip sign so revenue reads positive.
    rev_total = round(rev_total * -1, 2)
    rev_by_cat = {k: round(v * -1, 2) for k, v in rev_by_cat.items()}
    exp_total = round(exp_total, 2)
    net = round(rev_total - exp_total, 2)

    log.info(
        "Transformed FY%s YTD (periods 1..%d): %d rows in window, revenue=%.2f, "
        "expense=%.2f, net=%.2f", cfy, last_full, rows_in_window, rev_total, exp_total, net,
    )
    if skipped_dates:
        log.info("Skipped %d row(s) with unparseable Post date.", skipped_dates)

    result = {
        "generated_at": generated_at_iso,
        "fiscal_year": cfy,
        "ytd_last_period": last_full,
        "ytd_period_keys": sorted(ytd_keys),
        "rows_in_window": rows_in_window,
        "revenue": {"ytd_actual": rev_total, "by_category": rev_by_cat},
        "expense": {"ytd_actual": exp_total},
        "net": {"ytd_actual": net},
    }
    excluded_display = {k: round(v * -1, 2) for k, v in excluded_rev.items()}
    if excluded_display:
        # Not dropped silently: report what was excluded from operating revenue.
        log.info("Excluded from operating revenue to match Power BI: %s", excluded_display)
        result["excluded_revenue_departments"] = excluded_display
    if unmapped_rev:
        # Surface (don't silently drop) any revenue that landed on an unmapped dept.
        flipped = {k: round(v * -1, 2) for k, v in unmapped_rev.items()}
        log.warning("Revenue on %d unmapped department code(s): %s", len(flipped), flipped)
        result["warnings"] = {"unmapped_revenue_departments": flipped}
    return result
