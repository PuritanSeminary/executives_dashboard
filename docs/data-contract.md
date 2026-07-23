# Data contract — Academic (Populi) & Personnel (Paycor)

Phase 0 deliverable. Left column = the exact shape the nightly aggregator must
emit into `snapshot.json` (verified against `src/data.js` + the view code).
Right column = source endpoint/field — filled from the Populi (repo) and Paycor
(docs) research. `⟵ derived` = computed by the aggregator, not a raw source field.

The frontend reads these off `window.PRTS_DATA.academic` / `.hr`. Views read
**synchronously** at mount, so the snapshot must be fully hydrated before render.

---

## ACADEMIC → `PRTS_DATA.academic`  (source: Populi API2, cadence: per semester)

Consumed by `src/views-academic.jsx` (+ derived trends in `data.js`).

**Auth/transport (proven in `student-account-automation`):**
- Base `https://prts.populiweb.com/api2`; header `Authorization: Bearer <token>`
  (secret `POPULI_API_KEY`, Registrar-scoped static token).
- **Filters & `expand` go in the GET *body*** (JSON) — `?filter=`/`?expand=` query
  params are *silently ignored* (200 + unfiltered result, no error).
- Pagination: numeric `page` in the body; stop when `has_more === false`.
  Response envelope `{ data:[...], has_more }` (container key sometimes `report_data`).
- **Rate limit: throttle to 1 req / 400 ms (~150/min)** — bursts 429 after ~200 calls,
  and under n8n `continueRegularOutput` the run falsely reports success while dropping
  rows. Verify row counts, don't trust status.

Legend: 🟢 live (proven endpoint) · 🟡 live but needs a dig / heuristic · 🔴 not
available via proven Populi usage — stays mock/derived this phase.

| Target field | Used for | Populi source | Status |
|---|---|---|---|
| `semesters[]` | axis labels, funnel keys | `GET /academicterms` → `display_name`, `start_date`, `end_date`; "current" = start≤today≤end (no flag) | 🟢 |
| `programs[].{id,name}` | program table | `GET /programs` → `id`, `name`, `graduate_level` | 🟢 |
| `programs[].students` | per-program enrollment | `GET /people` roster with `expand:["student_programs"]` in body (role id **5**=Student, status ACTIVE), group by `program_id` | 🟢 |
| `totalStudents` | "Total enrolled" KPI | ⟵ Σ; cross-check vs `GET /enrollments` (status `ENROLLED`, `term_end_date ≥ AY-start` ≈ ~600) | 🟢 |
| `programs[].gpa`, `gpaWeighted`, `gpaTrend[]` | GPA KPI/spark | `GET /academicterms/{id}/students` → per-student **`cum_gpa`**/`term_gpa` (+ `program_id`); group by program. *(Not `/gpa` — that's why the SAA spike 404'd; GPA is a term-roster sub-resource.)* | 🟢 |
| `programs[].length` | time-to-grad | derive from `StudentProgram.started_on` vs `graduation_date`, or static per-program table | 🟡 |
| `funnel[]` (inquiry→app→accepted→matriculated, per term) | admissions funnel | `GET /leads` (body-filter `academic_term`+`status`); enum `prospect/inquiry/application_started/application_completed/accepted/confirmed/enrolled` maps all 4 stages | 🟢 |
| `outcomes[].graduation` | outcomes table, grad KPI | `GET /people/{id}/degrees` (`StudentDegree`) → `status=='granted'` / `graduation_date`, measured vs entering cohort | 🟡 derive |
| `outcomes[].{matric,retention}` | outcomes table | cohort by `StudentProgram.entrance_term_id`+`first_time`; walk forward across terms via `/academicterms/{id}/students`; attrition via `exit_date`/`exit_reason_id` | 🟡 derive |
| `partners[].courses`, `totalCourses`, `coursesTrend[]` | courses-by-country, KPI/spark | count `GET /academicterms/{id}/courseofferings` grouped by `campus_id`→country | 🟢 |
| `campuses[]` counts / `offered[]` | globe coverage | offerings per campus (`campus_id` on offering); coverage = offered∩coreCatalog | 🟢 |
| `campuses[].{lat,lon,institution,city,country}`, `coreCatalog[]` | globe geometry, catalog baseline | **static reference** (checked-in `academic-static.json`) — Populi has 41 campuses w/ only `id`,`name` | ⚪ static |
| `topCourses[]`/`campusCourses{}` `.enrolled` | course tables | count `GET /courseofferings/{id}/students` where `status=='enrolled'` | 🟢 |
| `topCourses[]`/`campusCourses{}` `.cap` | fill bars | `GET /courseofferings/{id}` → **`max_enrolled`** (+ `max_auditors`) | 🟢 |
| `enrollmentTrend[]`, `priorYearEnrollment` | enrollment spark | per-term census via `/enrollments` (status ENROLLED) per term window | 🟢 |

**Scope implications (updated after the official-docs dig — Academic can go 100% live):**
- 🟢 **Enrollment, programs, courses, campus coverage, per-course enrolled + capacity,
  admissions funnel, and GPA** are all direct single-object reads. The dig resolved
  every earlier 🔴:
  - **Funnel** ← `GET /leads`, `status` enum covers inquiry→application→accepted→enrolled.
  - **GPA** ← `GET /academicterms/{id}/students`.`cum_gpa` (term-roster sub-resource).
  - **Capacity** ← `courseoffering.max_enrolled`.
- 🟡 **Retention / matriculation / graduation** are **derivable but not single calls** —
  they need a client-side multi-term cohort walk (`StudentProgram.entrance_term_id` +
  `StudentDegree.graduation_date`, forward across terms). More compute, but real.
- ⚪ Campus lat/lon + institution names + core catalog stay static reference (checked-in
  JSON); only the counts come live.
- ✅ **Probe-confirmed against `prts.populiweb.com` (2026-07-22, `tools/probe-populi.mjs`):**
  - GPA field is **`cum_gpa`** (+ `term_gpa`) on term-students `report_data`; no
    `total_cum_gpa`/`resident_cum_gpa` on this tenant. Person id = top-level **`id`**.
  - Funnel: `/leads.status` live values seen — `inquiry`, `application_started`,
    `application_completed`, `accepted`, `enrolled` (+ `prospect`/`confirmed` per docs).
    `academic_term_id`, `person_id`, `program_id` all top-level.
  - Capacity: **`max_enrolled`** (+ `max_auditors`) top-level on courseoffering.
  - 🎯 **Efficiency:** `courseoffering.report_data` already includes **`num_students`**
    (enrolled count), `num_withdrawn`, `campus_name`, `department_name`, `course_abbrv`,
    `name`, `section`, `credits`, `primary_faculty_display_name`, `program_name_ids`.
    → **No `/courseofferings/{id}/students` fan-out needed** — per-course enrolled/cap,
    campus, title, and instructor all come from one `courseofferings` call per term.
  - `StudentDegree` (`status`,`graduation_date`) and `StudentProgram`
    (`entrance_term_id`,`first_time`,`exit_date`,`exit_reason_id`,`started_on`) confirmed
    for the outcomes cohort walk.
  - Terms: 133 total, `display_name` like `"2025-2026: Summer"`; use
    `is_for_transcript`/`academic_term_type_id`/`start_year` to map → dashboard semester
    labels and to enumerate the funnel/enrollment history windows.

---

## PERSONNEL → `PRTS_DATA.hr`  (source: Paycor, cadence: monthly)

Consumed by `src/views-hr.jsx`.

**Auth/transport (from Paycor docs — several items need portal confirmation):**
- OAuth2 **`client_credentials`** (no refresh token; re-request on expiry, token
  lifetime **~30 min** — cache it) **plus** an Azure APIM key on *every* call:
  `Authorization: Bearer <token>` **and** `Ocp-Apim-Subscription-Key: <key>`.
- Credentials needed: OAuth App ID+Secret (self-serve), **APIM subscription key**
  and **scope** (`cc[CompanyID] [ScopeName]`, both issued by Paycor after partner
  approval), and **Legal Entity ID(s)** (discover via `GET /me`; data is partitioned
  per legal entity).
- Pagination: cursor **`continuationToken`** param + **`HasMoreResults`** bool; loop
  until false. Rate limit **1,000 calls/min** → 429. Errors carry `CorrelationId`.
- **No aggregate/reporting endpoints** — the API is record-level. Every rollup
  (monthly headcount, payroll-by-dept, tenure) is the aggregator's job, and comp
  data is **per-`employeeId` fan-out** (N employees ⇒ several×N calls).

Legend: 🟢 clean · 🟡 aggregation/heuristic required · 🔴 may be unavailable · ⚠️ field/enum unconfirmed (inspect live payload).

| Target field | Used for | Paycor source | Status |
|---|---|---|---|
| `headcount[].{ft,pt,student}` (62 monthly) | headcount KPIs, 5-yr area chart | `GET /legalentities/{id}/employees?include=EmploymentDates,Status,Position`; reconstruct each month-end from Start/End dates | 🟡 |
| — ft / pt split | | employee **Type**/Position classification — **field name & enum unconfirmed** | ⚠️ |
| — student bucket | | **no native "student" type** — heuristic on dept / pay group / `customfields` | 🟡 needs PRTS rule |
| `tenure.{median,buckets}` | tenure distribution | `include=EmploymentDates` → Start Date; `now − StartDate`, bucket | 🟢 |
| `payroll.series[]` (62 monthly total) | payroll spark, TTM KPI | sum `GET /legalentities/{id}/payitems` (or entity `paystubs`) by pay date | 🟡 |
| `payroll.categories[].{name,amount}` | payroll donut | sum paystub/payitem line items, bucket by employee dept | 🟡 |
| — benefits / FICA / retirement rows | | paystub **tax/deduction line-item category codes — unconfirmed** | ⚠️ |
| — `dept` name | bucketing | employee may return dept **ID/URL, not name** → resolve via labor/org lookup | ⚠️ |
| `payroll.categories[].fte` | donut FTE labels | derive from Position/FTE field | 🟡 |
| `payroll.total` | donut center | ⟵ Σ categories | 🟢 derived |
| `openPositions[]` `{title,dept,posted,stage,candidates}` | open-positions table + HR signals | **Paycor Recruiting (ATS)** — `atsaccounts/{id}/jobs` + `/candidates` | 🔴 only if PRTS licenses Recruiting |

**Scope implications (surfaced to Seth):**
- 🟢 **Tenure** and 🟡 **total/monthly headcount** and 🟡 **payroll totals** are
  achievable — but every one needs aggregation we write, and several field details
  (FT/PT enum, dept name, paystub category codes) can only be pinned by inspecting a
  **live payload** or the logged-in developer portal.
- 🟡 **Student-employee bucket** needs a **PRTS-specific rule** — how are student
  workers tagged in Paycor? (dedicated department? pay group? custom field?) Once you
  tell me the tag, the heuristic is trivial.
- 🔴 **Open positions + candidate counts** require **Paycor Recruiting** licensed and
  API-scoped. If PRTS isn't on Recruiting, this table stays mock (or manual entry).
- **Monthly history:** reconstruct from hire/termination dates as-of each month-end
  (available immediately) rather than accumulating snapshots forward.
- **Payroll lag:** paystub/payitem data only exists *after a payroll run finalizes*,
  so nightly comp totals trail the current pay cycle by design.

**Portal confirmations blocking a clean build** (need Seth's Paycor access / a live
payload): (1) exact token endpoint + host/version (`api.paycor.com/v1/legalentities`
vs `apis.paycor.com/v2/tenants`), (2) FT/PT field + enum, (3) dept name vs lookup,
(4) paystub line-item category codes for FICA/retirement/benefits, (5) Recruiting license.

---

## Aggregator output envelope (`snapshot.json`)

```jsonc
{
  "generatedAt": "2026-07-22T07:00:00Z",   // stamped by the job (UTC)
  "academic": { /* shape above */ },
  "hr":       { /* shape above */ },
  "meta": {
    "sources": {
      "academic": { "system": "Populi", "cadence": "Per semester", "lastSync": "..." },
      "hr":       { "system": "Paycor", "cadence": "Monthly",      "lastSync": "..." }
    },
    "partial": { "academic": false, "hr": false }  // true if a source failed → frontend shows mock fallback for that domain
  }
}
```

Finance + Donations remain mock (out of scope this phase) — the frontend merges
the live `academic`/`hr` over the existing mock `PRTS_DATA`, so a missing/partial
snapshot degrades gracefully to the seeded mock rather than an empty dashboard.
