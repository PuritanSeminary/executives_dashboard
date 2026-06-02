// views-academic.jsx — Academic deep dive
// Programs, funnel, outcomes, partner courses, top courses.

function AcademicView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const A = D.academic;

  const latestFunnel = A.funnel[A.funnel.length - 1];

  // Application-to-acceptance and enrolment ratios — across semesters
  const acceptanceRate = A.funnel.map(f => f.accepted / f.applications);
  const matriculationRate = A.funnel.map(f => f.matriculated / f.accepted);

  return (
    <>
      <Brief
        kicker="Registrar"
        date="As of June 2, 2026"
        headline="Academic"
        dek="Synced from Populi."
        sources={[
          { label: 'Source', value: 'Populi' },
          { label: 'Refresh', value: 'Per semester' },
          { label: 'Registrar', value: 'I. Vanderlaan' },
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
            <h3 className="card__title">By degree program</h3>
            <div className="card__sub">Enrollment, average GPA earned, and elapsed time to completion. Capacity = program cap.</div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Program</th>
              <th style={{ width: 220 }}>Capacity</th>
              <th style={{ textAlign: 'right' }}>Enrolled</th>
              <th style={{ textAlign: 'right' }}>GPA</th>
              <th style={{ textAlign: 'right' }}>Time to grad</th>
            </tr>
          </thead>
          <tbody>
            {A.programs.map(p => {
              const fill = p.students / p.capacity;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="label">{p.name}</div>
                    <span className="tbl__sub">{p.id.toUpperCase()} · cap {p.capacity}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${fill * 100}%`, height: '100%', background: 'var(--blue)' }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 32 }}>{fmt.pct(fill, 0)}</span>
                    </div>
                  </td>
                  <td className="num">{p.students}</td>
                  <td className="num">{p.gpa.toFixed(2)}</td>
                  <td className="num muted">{p.length} <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>yr</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Funnel + outcomes ─────────────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Admissions funnel — Spring 2026</h3>
              <div className="card__sub">Inquiry → application → acceptance → matriculation</div>
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

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Outcomes by academic year</h3>
              <div className="card__sub">Matriculation · retention · graduation</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Year</th>
                <th style={{ textAlign: 'right' }}>Matric.</th>
                <th style={{ textAlign: 'right' }}>Retention</th>
                <th style={{ textAlign: 'right' }}>Graduation</th>
              </tr>
            </thead>
            <tbody>
              {A.outcomes.map((o, i) => (
                <tr key={i}>
                  <td className="label">{o.year} {o.partial && <span className="tag tag--ink" style={{ marginLeft: 6, fontSize: 9 }}>partial</span>}</td>
                  <td className="num">{fmt.pct(o.matric, 0)}</td>
                  <td className="num">{fmt.pct(o.retention, 0)}</td>
                  <td className="num">{fmt.pct(o.graduation, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Partner institutions + top courses ────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Courses by country & partner</h3>
              <div className="card__sub">{A.totalCourses} total · primary delivery in Grand Rapids, with {A.totalCourses - A.partners[0].courses} partner-delivered offerings</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Country</th>
                <th>Institution</th>
                <th style={{ width: 200 }}>Share</th>
                <th style={{ textAlign: 'right' }}>Courses</th>
              </tr>
            </thead>
            <tbody>
              {A.partners.map((p, i) => {
                const pct = p.courses / A.totalCourses;
                return (
                  <tr key={i}>
                    <td className="label">{p.country}</td>
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

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Top course enrollments</h3>
              <div className="card__sub">Spring 2026 · ordered by enrollment</div>
            </div>
          </div>
          <table className="tbl">
            <tbody>
              {A.topCourses.map((c, i) => {
                const fill = c.enrolled / c.cap;
                return (
                  <tr key={i}>
                    <td>
                      <div className="label" style={{ fontSize: 13 }}>
                        <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6 }}>{c.code}</span>
                        {c.title}
                      </div>
                      <span className="tbl__sub">{c.instructor}</span>
                    </td>
                    <td className="num">
                      <div className="mono tnum" style={{ fontSize: 13, color: 'var(--ink)' }}>{c.enrolled}<span style={{ color: 'var(--ink-4)' }}> / {c.cap}</span></div>
                      <div className="tbl__sub mono" style={{ textAlign: 'right' }}>{fmt.pct(fill, 0)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AcademicView });
