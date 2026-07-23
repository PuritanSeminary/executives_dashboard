# Academic — clickable schools + historical classes

**Date:** 2026-07-23 · **Status:** approved

## Goal
Two enhancements to the Academic view's globe/courses section:
1. Clicking a school in the "Courses by country & partner" card selects that campus —
   syncing the globe to it and showing its class list.
2. A term selector to view **past classes taught** (last 5 years, Fall/Spring only).

## Decisions
- The term selector drives **only** the classes/globe section (courses table, globe
  pin counts, per-campus class lists). Enrollment / GPA / funnel KPIs stay on the
  current census term.
- History = the ~10 primary (Fall/Spring) transcript terms already used for trends.
- **Storage: JSON in the existing Blob snapshot — no database.** Populi is the system
  of record; the snapshot is a cache re-derived nightly. (~+350 KB.) A dedicated store
  is only warranted later for point-in-time archival of source-overwritten metrics.

## Data (aggregator — `tools/aggregate/academic.mjs`)
For each primary term, pull its `courseofferings` and run the existing `buildGlobe`
grouping. Emit:
```jsonc
academic.termClasses = {
  "Spring 2026": { totalCourses, campuses:[…], partners:[…], campusCourses:{…} },
  "Fall 2025":   { … }, …            // ~10 terms
}
academic.classTerms = ["Fall 2021", …, "Spring 2026"]  // dropdown order, oldest→newest
academic.currentClassTerm = "Spring 2026"
```
Top-level `campuses/partners/campusCourses/totalCourses` remain = current term (default;
keeps every other consumer unchanged). Reuses `buildCourses` + `buildGlobe` per term.

## Frontend (`src/views-academic.jsx`)
- **Clickable schools:** the "Courses by country & partner" card renders the selected
  term's campuses as clickable rows (grouped by country, course counts), each calling
  the existing `setCampusSel(id)`. Globe-centering (`selectedId` effect in globe.jsx)
  and the campus-detail class list are already built — no globe.jsx change.
- **Term dropdown:** a selector in that card's header; state `classTerm` defaults to
  `academic.currentClassTerm`. The globe `campuses` prop, the schools list, and the
  campus-detail `campusCourses` all read from `academic.termClasses[classTerm]`.
- **Fallback:** if `termClasses` is absent (mock / pre-hydrate), use top-level
  `campuses/partners/campusCourses` so the view never breaks.

## Out of scope
Enrollment/GPA/funnel history; open positions; any DB. Re-run aggregator + re-upload
snapshot after the change (part of the reviewable diff, not auto-pushed).
