// views-academic.jsx — Academic deep dive
// Programs, funnel, outcomes, partner courses, top courses.

// Country → ISO-3166 alpha-2, for real flag images in the partner-courses
// table. (Emoji flags don't render on Windows/Chromium — they fall back to
// bare letter pairs — so we use flagcdn raster flags instead.)
const COUNTRY_ISO = {
  'United States': 'us', 'Netherlands': 'nl', 'Brazil': 'br', 'South Africa': 'za',
  'Indonesia': 'id', 'United Kingdom': 'gb', 'Kenya': 'ke', 'India': 'in', 'Antarctica': 'aq',
  'Mexico': 'mx', 'Peru': 'pe', 'Colombia': 'co', 'Hungary': 'hu', 'Belarus': 'by',
  'Chile': 'cl', 'Germany': 'de', 'Thailand': 'th', 'Egypt': 'eg', 'Cambodia': 'kh',
  'Mozambique': 'mz', 'Portugal': 'pt', 'Taiwan': 'tw', 'Latvia': 'lv', 'Australia': 'au',
  'Ghana': 'gh', 'Bolivia': 'bo', 'Malawi': 'mw', 'Ecuador': 'ec', 'Angola': 'ao',
  'Nigeria': 'ng', 'China': 'cn', 'Spain': 'es',
};

function CountryFlag({ name }) {
  const iso = COUNTRY_ISO[name];
  if (!iso) return null;
  return (
    <img
      className="cflag"
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      alt=""
      aria-hidden="true"
    />
  );
}

function AcademicView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const A = D.academic;
  const catalog = A.coreCatalog;
  const [campusSel, setCampusSel] = React.useState(null);
  // Historical class term — drives ONLY the classes/globe section (defaults to current).
  const [classTerm, setClassTerm] = React.useState(A.currentClassTerm || null);
  // Active term's class dataset; falls back to current top-level fields (mock / pre-hydrate).
  const TC = (A.termClasses && classTerm && A.termClasses[classTerm])
    || { campuses: A.campuses, partners: A.partners, campusCourses: A.campusCourses, totalCourses: A.totalCourses };
  const campuses = TC.campuses || [];
  const selected = campusSel ? campuses.find(c => c.id === campusSel) : null;

  // On a wide screen, cap the overview/courses card to the globe's height and
  // let its content scroll inside — so the row never stretches taller than the
  // globe sitting beside it, in either the default or the selected state.
  const overviewCardRef = React.useRef(null);
  React.useEffect(() => {
    const card = overviewCardRef.current;
    if (!card) return;
    const stage = document.querySelector('.globe__stage');
    const apply = () => {
      const wide = window.matchMedia('(min-width: 1200px)').matches;
      const h = stage ? stage.offsetHeight : 0;
      // Only cap + scroll when a campus pin is selected (its detail view can
      // run tall). The default "Courses by country & partner" table fits, so
      // leave it un-capped.
      if (wide && h > 60 && selected) {
        card.style.maxHeight = h + 'px';
        card.style.overflowY = 'auto';
      } else {
        card.style.maxHeight = '';
        card.style.overflowY = '';
      }
    };
    apply();
    let ro;
    if (stage && 'ResizeObserver' in window) { ro = new ResizeObserver(apply); ro.observe(stage); }
    window.addEventListener('resize', apply);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', apply); };
  }, [selected]);

  const funnel = A.funnel || [];
  const latestFunnel = funnel.length ? funnel[funnel.length - 1] : { semester: '', inquiries: 0, applications: 0, accepted: 0, matriculated: 0 };
  const funnelLabel = latestFunnel.semester || (A.censusTerm && A.censusTerm.label) || '';
  // Acceptance & yield rates across terms (from the funnel).
  const funnelLabels = funnel.map(f => f.semester);
  const acceptSeries = funnel.map(f => (f.applications ? +(f.accepted / f.applications * 100).toFixed(1) : 0));
  const yieldSeries = funnel.map(f => (f.accepted ? +(f.matriculated / f.accepted * 100).toFixed(1) : 0));

  // Null-safe percent delta — no comparison when the baseline is missing/zero.
  const pctDelta = (cur, prev) => (prev ? (cur - prev) / prev : null);
  // GPA display helpers (live data can carry null GPAs).
  const gpaPrograms = (A.programs || []).filter(p => p.gpa != null);
  const topGpaProgram = gpaPrograms.length ? gpaPrograms.reduce((a, b) => (b.gpa > a.gpa ? b : a)) : null;
  // Graduation sparkline: mature cohorts only — immature ones read ~0% and mislead.
  const gradSpark = (A.outcomes || []).filter(o => !o.partial).map(o => o.graduation);
  // Student : faculty ratio — residential degree-seeking students (excludes the distance
  // "MA (Religion)" degree) ÷ FT professors (faculty count from Paycor HR).
  const DISTANCE_PROGRAM = /\(religion\)/i;
  const residentialStudents = ((A.programs || []).filter(p => !DISTANCE_PROGRAM.test(p.name)).reduce((s, p) => s + p.students, 0)) || A.totalStudents;
  const distanceStudents = Math.max(0, (A.totalStudents || 0) - residentialStudents);
  const faculty = (D.hr && D.hr.faculty) || null;
  const sfRatio = (faculty && residentialStudents) ? residentialStudents / faculty : null;       // in-person
  const overallRatio = (faculty && A.totalStudents) ? A.totalStudents / faculty : null;           // incl. distance

  // Two course tables that live in the right column (and stay visible beneath
  // the campus overview when a pin is selected) — keeps everything in one place.
  const coursesByCountryBlock = (
    <div className={'card-sec' + (selected ? ' card-sec--div' : '')}>
      <div className="card__hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 className="card__title">Courses by country & partner<CardInfo>{TC.totalCourses} offerings in {classTerm || 'the current term'}. Click a school to focus the globe and see its classes.</CardInfo></h3>
        </div>
        {A.classTerms && A.classTerms.length > 1 && (
          <select
            value={classTerm}
            onChange={e => { setClassTerm(e.target.value); setCampusSel(null); }}
            aria-label="Class term"
            style={{ fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em', padding: '4px 8px', border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink-2)', borderRadius: 0, cursor: 'pointer' }}
          >
            {[...A.classTerms].reverse().map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>
      <div className="coursescroll">
      <table className="tbl">
        <thead>
          <tr>
            <th>Country</th>
            <th>Institution</th>
            <th style={{ width: 88 }}>Share</th>
            <th style={{ textAlign: 'right' }}>Courses</th>
          </tr>
        </thead>
        <tbody>
          {[...campuses]
            .sort((a, b) => String(a.country).localeCompare(String(b.country)) || b.courses - a.courses)
            .map((c) => {
              const pct = TC.totalCourses ? c.courses / TC.totalCourses : 0;
              const isSel = c.id === campusSel;
              return (
                <tr key={c.id}
                  onClick={() => setCampusSel(isSel ? null : c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCampusSel(isSel ? null : c.id); } }}
                  role="button" tabIndex={0}
                  aria-selected={isSel}
                  aria-label={`Show ${c.institution} classes`}
                  title={`Show ${c.institution}'s classes`}
                  style={{ cursor: 'pointer', background: isSel ? 'var(--vellum)' : undefined }}>
                  <td className="label" style={{ whiteSpace: 'nowrap' }}>
                    <CountryFlag name={c.country} />{c.country}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{c.institution}{c.hub && <span className="tag tag--ink" style={{ marginLeft: 6, fontSize: 9 }}>hub</span>}</td>
                  <td>
                    <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--blue)' }} />
                    </div>
                  </td>
                  <td className="num">{c.courses}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
      </div>
    </div>
  );

  const topCoursesTable = (rows) => (
    <div className="coursescroll">
    <table className="tbl">
      <thead>
        <tr>
          <th>Course</th>
          <th style={{ width: 96 }}>Fill</th>
          <th style={{ textAlign: 'right' }}>Enrolled</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, i) => {
          const uncapped = !c.cap;
          const over = !uncapped && c.enrolled > c.cap;
          const fill = uncapped ? 0 : Math.min(1, c.enrolled / c.cap);
          return (
            <tr key={i}>
              <td className="label">
                <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6, fontSize: 11 }}>{c.code}</span>{c.title}
                <span className="tbl__sub">{c.instructor}</span>
              </td>
              <td>
                {uncapped ? (
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>uncapped</span>
                ) : (
                  <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }} title={over ? `${c.enrolled - c.cap} over capacity` : undefined}>
                    <div style={{ width: `${fill * 100}%`, height: '100%', background: over ? 'var(--oxblood)' : 'var(--blue)' }} />
                  </div>
                )}
              </td>
              <td className="num">{c.enrolled}{!uncapped && <span style={{ color: over ? 'var(--oxblood)' : 'var(--ink-4)' }}> / {c.cap}{over ? ` (+${c.enrolled - c.cap})` : ''}</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );

  const topCoursesBlock = null;


  return (
    <>
      <Brief
        kicker="Registrar"
        date={"As of " + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        headline="Academic"
        sources={[
          { label: 'Source', value: 'Populi' },
        ]}
      />

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid grid--5">
        <KPI
          label="Total enrolled"
          value={A.totalStudents}
          delta={pctDelta(A.totalStudents, A.priorYearEnrollment)}
          deltaLabel="vs. prior year"
          caption={`${residentialStudents} residential · ${distanceStudents} distance${A.visitingStudents ? ` · +${A.visitingStudents} visiting` : ''}.`}
          spark={A.enrollmentTrend}
          sparkColor="var(--ink-3)"
          sparkFloor={0}
          source="Populi"
        />
        <KPI
          label="Average GPA"
          value={fmt.gpa(A.gpaWeighted)}
          delta={pctDelta(A.gpaWeighted, A.gpaPriorYear)}
          deltaLabel="vs. prior year"
          caption={`Weighted across all programs.${topGpaProgram ? ` ${topGpaProgram.name} highest at ${fmt.gpa(topGpaProgram.gpa)}.` : ''}`}
          spark={A.gpaTrend}
          sparkColor="var(--ink-3)"
          sparkFloor={3}
        />
        <KPI
          label="Courses offered"
          value={A.totalCourses}
          delta={pctDelta(A.totalCourses, A.coursesPriorYear)}
          deltaLabel="vs. prior year"
          caption={`Across ${(A.campuses || []).length} schools in ${new Set((A.campuses || []).map(c => c.country)).size} countries.`}
          spark={A.coursesTrend}
          sparkColor="var(--ink-3)"
          sparkFloor={0}
        />
        <KPI
          label="Graduation rate"
          value={A.gradRate != null ? fmt.pct(A.gradRate, 0) : '—'}
          delta={pctDelta(A.gradRate, A.gradRatePrev)}
          deltaLabel="vs. prior cohort"
          caption={`~6-yr rate${A.gradRateYear ? ` (cohort ${A.gradRateYear})` : ''} · provisional, pending registrar sign-off.`}
          spark={gradSpark}
          sparkColor="var(--ink-3)"
        />
        <KPI
          label="Student : faculty"
          value={sfRatio != null ? `${sfRatio.toFixed(1)} : 1` : '—'}
          caption={faculty ? `Residential (${residentialStudents}) ÷ ${faculty} FT professors · ${overallRatio ? overallRatio.toFixed(1) + ' : 1' : '—'} incl. distance.` : 'Faculty count unavailable.'}
        />
      </div>

      {/* ── Programs ───────────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">By degree program<CardInfo>Enrollment, average GPA earned, and elapsed time to completion. The bar shows each program's share of the {A.totalStudents} students enrolled.</CardInfo></h3>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Program</th>
              <th style={{ textAlign: 'right' }}>Enrolled</th>
              <th style={{ width: 200 }}>Share of enrolled</th>
              <th style={{ textAlign: 'right' }}>GPA</th>
              <th style={{ textAlign: 'right' }}>Time to grad</th>
            </tr>
          </thead>
          <tbody>
            {A.programs.map(p => {
              const share = A.totalStudents ? p.students / A.totalStudents : 0;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="label">{p.name}</div>
                    {p.code || (!/^\d+$/.test(String(p.id)) ? <span className="tbl__sub">{String(p.id).toUpperCase()}</span> : null)}
                  </td>
                  <td className="num">{p.students}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${share * 100}%`, height: '100%', background: 'var(--blue)' }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 32 }}>{fmt.pct(share, 0)}</span>
                    </div>
                  </td>
                  <td className="num">{fmt.gpa(p.gpa)}</td>
                  <td className="num muted">{p.length != null ? <>{p.length} <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>yr</span></> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Funnel + outcomes ─────────────────────────── */}
      <div className="grid grid--12 fo-row" style={{ alignItems: 'start' }}>
        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Admissions funnel — {funnelLabel}<CardInfo>Inquiry → application → acceptance → matriculation. Matriculated is counted from actual new enrollments; provisional pending registrar sign-off.</CardInfo></h3>
            </div>
          </div>
          <Funnel
            steps={[
              { label: 'Inquiries',     value: latestFunnel.inquiries },
              { label: 'Applications',  value: latestFunnel.applications },
              { label: 'Accepted',      value: latestFunnel.accepted },
              { label: 'Matriculated',  value: latestFunnel.matriculated },
            ]}
            color="var(--navy)"
          />
          {funnel.length > 1 && (
            <div className="card-sec card-sec--div" style={{ marginTop: 14 }}>
              <div className="card__hd"><div><h3 className="card__title">Acceptance &amp; yield trend<CardInfo>Acceptance = accepted ÷ applications; yield = matriculated ÷ accepted, per term.</CardInfo></h3></div></div>
              <LineChart
                series={[
                  { name: 'Acceptance %', data: acceptSeries, color: 'var(--navy)' },
                  { name: 'Yield %', data: yieldSeries, color: 'var(--gold)' },
                ]}
                labels={funnelLabels}
                height={150}
                yMin={0}
                format={(v) => `${Math.round(v)}%`}
              />
            </div>
          )}
        </div>

        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Outcomes by academic year<CardInfo>Matriculation, retention and graduation rates, by academic year. Newest cohorts are marked partial (graduation not yet mature). Provisional — pending registrar sign-off.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl tbl--dense">
            <thead>
              <tr>
                <th>Year</th>
                <th style={{ textAlign: 'right' }}>Matric.</th>
                <th style={{ textAlign: 'right' }}>Reten.</th>
                <th style={{ textAlign: 'right' }}>Grad.</th>
              </tr>
            </thead>
            <tbody>
              {A.outcomes.map((o, i) => (
                <tr key={i}>
                  <td className="label" style={{ whiteSpace: 'nowrap' }}>{o.year} {o.partial && <span className="tag tag--ink" style={{ marginLeft: 6, fontSize: 9 }}>partial</span>}</td>
                  <td className="num">{fmt.pct(o.matric, 0)}</td>
                  <td className="num">{fmt.pct(o.retention, 0)}</td>
                  <td className="num">{fmt.pct(o.graduation, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Free-standing globe + partner courses ─────── */}
      <div className="grid grid--12 globe-row">
        <div className="campuscover span-6" style={{ marginTop: 0 }}>
          <div className="globewrap">
            <CampusGlobe
              campuses={campuses}
              catalogLen={catalog.length}
              selectedId={campusSel}
              onSelect={setCampusSel}
            />
          </div>
        </div>

        <div className="card span-6" ref={overviewCardRef}>
          {selected ? (() => {
            const isLive = !selected.offered; // live campuses carry courses/enrolled, not core-catalog offered[]
            const { ratio, status } = coverageOf(selected, catalog.length);
            const offeredSet = new Set(selected.offered);
            const offered = catalog.filter(c => offeredSet.has(c.id));
            const missing = catalog.filter(c => !offeredSet.has(c.id));
            const campusTop = (TC.campusCourses && TC.campusCourses[selected.id]) || [];
            const liveLabel = selected.hub ? 'Main campus'
              : (selected.courses >= 10 ? 'Major site' : selected.courses >= 4 ? 'Active site' : 'Emerging site');
            return (
              <>
                <div className="campusdetail">
                  <button className="campusdetail__back" onClick={() => setCampusSel(null)}>
                    <span className="campusdetail__back-arrow" aria-hidden="true">←</span>All partners
                  </button>
                  <div className="campusdetail__hd">
                    <div className="campusdetail__title">
                      <span className="campusdetail__name">{selected.institution}</span>
                      <span className="campusdetail__loc">{selected.city} · {selected.country}</span>
                    </div>
                    <span className="campusdetail__pill" style={{ background: status.soft, color: status.color }}>
                      <span className="d" style={{ background: status.color }} />{isLive ? liveLabel : status.label}
                    </span>
                  </div>
                  {isLive ? (
                    <div className="campusdetail__meta"><b>{selected.courses}</b> courses · <b>{selected.enrolled}</b> enrolled this term</div>
                  ) : (
                    <div className="campusdetail__meta">Offers <b>{offered.length}</b> of <b>{catalog.length}</b> core courses · <b>{fmt.pct(ratio, 0)}</b> coverage</div>
                  )}
                  {!isLive && missing.length > 0 && (
                    <div className="gaps">
                      <span className="gaps__label">Not offered</span>
                      {missing.map(c => <span key={c.id} className="gaps__chip">{c.title}</span>)}
                    </div>
                  )}
                </div>
                <div className="card-sec card-sec--div">
                  <div className="card__hd">
                    <div>
                      <h3 className="card__title">Top course enrollments<CardInfo>{classTerm || 'Current term'} at {selected.city} ({selected.institution}), ordered by enrollment.</CardInfo></h3>
                    </div>
                  </div>
                  {topCoursesTable(campusTop)}
                </div>
              </>
            );
          })() : (
            coursesByCountryBlock
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AcademicView });
