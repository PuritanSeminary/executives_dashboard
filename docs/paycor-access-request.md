# Paycor API access request — PRTS Executive Dashboard

**Purpose:** hand this to the Paycor rep / developer-portal admin to provision a
**read-only, server-to-server** integration that pulls HR data nightly into an
internal executive dashboard. Least-privilege — only "View" permissions, no writes.

## How Paycor's permissions work (why the list looks huge)

Two layers:
1. **Scope Name** — a *single* value Paycor assigns to the app; the OAuth `scope`
   string is `cc[CompanyID] [ScopeName]`. We don't pick it; Paycor sets it and we
   read it off the app's General tab.
2. **Data Access tab** — the long granular list. **Read = "View …"** rows;
   **write = "create and update" / delete** rows. Least-privilege for us =
   **enable only the "View" rows below, leave every create/update/delete off.**

## What to ask Paycor to provision

1. **OAuth app** (App ID + Secret) + **APIm Subscription Key** for our tenant.
2. **Grant type:** confirm **`client_credentials`** (no user login). Confirm the
   **token endpoint + host/version** — we need to know which pair applies:
   `api.paycor.com/v1/legalentities/…` vs `apis.paycor.com/v2/tenants/…`, and the
   token URL (`.../sts/v1/common/token`?). *(No `offline_access` needed for
   client_credentials — only if we're put on the authorization_code flow.)*
3. **Scope Name:** tell us the exact `cc[CompanyID] [ScopeName]` string for PRTS
   (and per-entity IDs if we have multiple legal entities).
4. **Legal-entity grants:** grant the app **read** access to legal entity/entities:
   `______________` (PRTS to fill in).

## Data Access — enable ONLY these "View" permissions

Employee core / identity:
- View Employee Information, View Employee Records, View Legal Entity Employees,
  View Employee Person, View Person Information

Employment / status / position (for headcount, FT/PT, hire dates):
- View Employee Employment Dates, View Employee Status, View Employee Position,
  View Employee Manager & Position

Work location *(optional — travels with the employee payload)*:
- View Employee Work Location, View Legal Entity Work Locations

Compensation & pay (for payroll totals by category):
- View Employee Compensation / Pay Rates / Earnings
- View Employee Deductions
- View Employee Taxes
- View Pay Statements / Pay Stubs, View Pay Items

Org structure (to resolve department names — Paycor may return dept ID, not name):
- View Job Titles / Labor Categories / Labor Codes

Student-worker identification (for the FT/PT/student split):
- View Employee Custom Fields

Recruiting / ATS (open-positions table — PRTS confirmed Recruiting is licensed):
- View ATS Accounts, View ATS Jobs, View ATS Candidates
- **Confirm Paycor Recruiting product is active** on our account (the ATS endpoints
  are product-gated, separate from core HR).

## Explicitly do NOT enable
- Any **create / update / delete** permission (read-only integration).
- Benefits, Time / Accruals / Scheduling, General Ledger areas (not used).

## After provisioning — send back to us
- The final **enabled-permission list** (audit trail — we'll confirm it matches this).
- The **Scope Name**, **legal-entity IDs**, token endpoint, and host/version.

---

### Note for the build (internal)
Exact "View" permission strings for compensation/deductions/taxes/paystubs/labor/
customfields/ATS are gated behind the partner portal — match the wording above to
the actual toggles. Once access is live, first calls:
1. `GET /me` → confirm visible legal entities.
2. Pull one `/employees/{id}` (with includes) + one `/paystubs` → **inspect the live
   payload** to pin: the FT/PT field + enum, whether dept is a name or ID, and the
   paystub line-item category codes (FICA/retirement/benefits).
3. Enumerate **departments / pay groups / custom fields** → identify how student
   workers are tagged (open item — PRTS was unsure), then set the student-bucket rule.
