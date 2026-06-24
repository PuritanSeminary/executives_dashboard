// views-academic.jsx — Academic deep dive
// Programs, funnel, outcomes, partner courses, top courses.

// Country → ISO-3166 alpha-2, for real flag images in the partner-courses
// table. (Emoji flags don't render on Windows/Chromium — they fall back to
// bare letter pairs — so we use flagcdn raster flags instead.)
const COUNTRY_ISO = {
  'United States': 'us',
  'Netherlands': 'nl',
  'Brazil': 'br',
  'South Africa': 'za',
  'Indonesia': 'id',
  'United Kingdom': 'gb',
  'Kenya': 'ke',
  'India': 'in',
  'Antarctica': 'aq',
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
  const selected = campusSel ? A.campuses.find(c => c.id === campusSel) : null;

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

  const latestFunnel = A.funnel[A.funnel.length - 1];

  // Application-to-acceptance and enrolment ratios — across semesters
  const acceptanceRate = A.funnel.map(f => f.accepted / f.applications);
  const matriculationRate = A.funnel.map(f => f.matriculated / f.accepted);

  // Two course tables that live in the right column (and stay visible beneath
  // the campus overview when a pin is selected) — keeps everything in one place.
  const coursesByCountryBlock = (
    <div className={'card-sec' + (selected ? ' card-sec--div' : '')}>
      <div className="card__hd">
        <div>
          <h3 className="card__title">Courses by country & partner<CardInfo>{A.totalCourses} total · primary delivery in Grand Rapids, with {A.totalCourses - A.partners[0].courses} partner-delivered offerings. Select a pin on the globe for a campus breakdown.</CardInfo></h3>
        </div>
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
          {A.partners.map((p, i) => {
            const pct = p.courses / A.totalCourses;
            return (
              <tr key={i}>
                <td className="label" style={{ whiteSpace: 'nowrap' }}>
                  <CountryFlag name={p.country} />{p.country}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>{p.institution}</td>
                <td>
                  <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--blue)', opacity: 0.7 + (1 - i / 8) * 0.3 }} />
                  </div>
                </td>
                <td className="num">{p.courses}</td>
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
          const fill = c.enrolled / c.cap;
          return (
            <tr key={i}>
              <td className="label">
                <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6, fontSize: 11 }}>{c.code}</span>{c.title}
                <span className="tbl__sub">{c.instructor}</span>
              </td>
              <td>
                <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${fill * 100}%`, height: '100%', background: 'var(--blue)' }} />
                </div>
              </td>
              <td className="num">{c.enrolled}<span style={{ color: 'var(--ink-4)' }}> / {c.cap}</span></td>
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
        date="As of June 2, 2026"
        headline="Academic"
        sources={[
          { label: 'Source', value: 'Populi' },
        ]}
      />

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid grid--4">
        <KPI
          label="Total enrolled"
          value={A.totalStudents}
          delta={(A.totalStudents - A.priorYearEnrollment) / A.priorYearEnrollment}
          deltaLabel="vs. Spring '25"
          caption={`${A.programs.length} active degree programs. Highest census since 2018.`}
          spark={A.enrollmentTrend}
          sparkColor="var(--ink-3)"
          source="Populi"
        />
        <KPI
          label="Average GPA"
          value={A.gpaWeighted.toFixed(2)}
          delta={(A.gpaWeighted - A.gpaPriorYear) / A.gpaPriorYear}
          deltaLabel="vs. prior year"
          caption={`Weighted across all programs. ThM remains highest at ${Math.max(...A.programs.map(p => p.gpa)).toFixed(2)}.`}
          spark={A.gpaTrend}
          sparkColor="var(--ink-3)"
        />
        <KPI
          label="Courses offered"
          value={A.totalCourses}
          delta={(A.totalCourses - A.coursesPriorYear) / A.coursesPriorYear}
          deltaLabel="vs. prior year"
          caption={`Across ${A.partners.length} institutions in ${new Set(A.partners.map(p => p.country)).size} countries.`}
          spark={A.coursesTrend}
          sparkColor="var(--ink-3)"
        />
        <KPI
          label="Graduation rate"
          value={fmt.pct(A.gradRate, 0)}
          delta={(A.gradRate - A.gradRatePrev) / A.gradRatePrev}
          deltaLabel="vs. AY '24–25"
          caption={`Measured 7 years from matriculation. MDiv: ${A.programs.find(p => p.id === 'mdiv') ? '0.89' : '—'}.`}
          spark={A.outcomes.map(o => o.graduation)}
          sparkColor="var(--ink-3)"
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
                    <span className="tbl__sub">{p.id.toUpperCase()}</span>
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
                  <td className="num">{p.gpa.toFixed(2)}</td>
                  <td className="num muted">{p.length} <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>yr</span></td>
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
              <h3 className="card__title">Admissions funnel — Spring 2026<CardInfo>Inquiry → application → acceptance → matriculation.</CardInfo></h3>
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
        </div>

        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Outcomes by academic year<CardInfo>Matriculation, retention and graduation rates, by academic year.</CardInfo></h3>
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
              campuses={A.campuses}
              catalogLen={catalog.length}
              selectedId={campusSel}
              onSelect={setCampusSel}
            />
          </div>
        </div>

        <div className="card span-6" ref={overviewCardRef}>
          {selected ? (() => {
            const { ratio, status } = coverageOf(selected, catalog.length);
            const offeredSet = new Set(selected.offered);
            const offered = catalog.filter(c => offeredSet.has(c.id));
            const missing = catalog.filter(c => !offeredSet.has(c.id));
            const campusTop = A.campusCourses[selected.id] || [];
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
                      <span className="d" style={{ background: status.color }} />{status.label}
                    </span>
                  </div>
                  <div className="campusdetail__meta">Offers <b>{offered.length}</b> of <b>{catalog.length}</b> core courses · <b>{fmt.pct(ratio, 0)}</b> coverage</div>
                  {missing.length > 0 && (
                    <div className="gaps">
                      <span className="gaps__label">Not offered</span>
                      {missing.map(c => <span key={c.id} className="gaps__chip">{c.title}</span>)}
                    </div>
                  )}
                </div>
                <div className="card-sec card-sec--div">
                  <div className="card__hd">
                    <div>
                      <h3 className="card__title">Top course enrollments<CardInfo>Spring 2026 at {selected.city} ({selected.institution}), ordered by enrollment. Representative data.</CardInfo></h3>
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
