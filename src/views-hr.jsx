// views-hr.jsx — Personnel deep dive
// Headcount, payroll, open positions, tenure.

function HRView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const H = D.hr;
  const months = D.months;

  const curr = H.headcount[H.headcount.length - 1];
  const prior = H.headcount[H.headcount.length - 13];
  const totalNow = curr.ft + curr.pt;
  const totalPrior = prior.ft + prior.pt;

  const payrollTtm = H.payroll.series.slice(-12).reduce((s, v) => s + v, 0);
  const payrollPrior = H.payroll.series.slice(-24, -12).reduce((s, v) => s + v, 0);

  const ftSeries = H.headcount.map(h => h.ft);
  const ptSeries = H.headcount.map(h => h.pt);
  const stSeries = H.headcount.map(h => h.student);

  // Payroll donut segments
  const payrollSegs = H.payroll.categories.map((c, i) => ({
    label: c.name,
    value: c.amount,
    color: ['var(--oxblood)', 'var(--navy)', 'var(--moss)', 'var(--gold)', 'var(--slate-cool)', 'var(--ink-3)', 'var(--rule-strong)'][i],
  }));

  return (
    <>
      <Brief
        kicker="Human Resources"
        date="As of June 2, 2026"
        headline="Personnel"
        dek="Synced from Paycor."
        sources={[
          { label: 'Source', value: 'Paycor' },
          { label: 'Refresh', value: 'Monthly' },
          { label: 'Includes', value: 'Faculty · Staff · Student labor' },
        ]}
      />

      {/* ── Top KPIs ────────────────────────────────────── */}
      <div className="grid grid--4">
        <KPI
          label="Full-time"
          value={curr.ft}
          delta={(curr.ft - prior.ft) / prior.ft}
          deltaLabel="vs. same month '25"
          caption="Faculty + admin + operations. 1 sabbatical."
          spark={ftSeries.slice(-24)}
          sparkColor="var(--ink-3)"
          source="Paycor"
        />
        <KPI
          label="Part-time"
          value={curr.pt}
          delta={(curr.pt - prior.pt) / prior.pt}
          deltaLabel="vs. same month '25"
          caption="Adjunct lecturers, library, weekend staff."
          spark={ptSeries.slice(-24)}
          sparkColor="var(--ink-3)"
        />
        <KPI
          label="Student employees"
          value={curr.student}
          delta={(curr.student - prior.student) / prior.student}
          deltaLabel="vs. same month '25"
          caption="Active during term; drops in summer."
          spark={stSeries.slice(-24)}
          sparkColor="var(--ink-3)"
        />
        <KPI
          label="Payroll, TTM"
          value={fmt.shortMoney(payrollTtm)}
          delta={(payrollTtm - payrollPrior) / payrollPrior}
          deltaLabel="vs. prior 12 mo"
          caption="Includes benefits, FICA, retirement match."
          spark={H.payroll.series.slice(-24)}
          sparkColor="var(--ink-3)"
          source="Paycor"
        />
      </div>

      {/* ── Headcount trend ───────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Headcount, five-year</h3>
            <div className="card__sub">Three categories tracked separately. Student-employee headcount mirrors the academic calendar.</div>
          </div>
        </div>
        <LineChart
          variant="area"
          series={[
            { name: 'Full-time',  data: ftSeries, color: 'var(--ink-2)' },
            { name: 'Part-time',  data: ptSeries, color: 'var(--gold)' },
            { name: 'Student',    data: stSeries, color: 'var(--moss)' },
          ]}
          labels={months.map(m => m.label)}
          height={220}
        />
      </div>

      {/* ── Payroll mix + tenure ──────────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Payroll by category, TTM</h3>
              <div className="card__sub">{fmt.shortMoney(H.payroll.total)} total · faculty dominates as expected for a seminary</div>
            </div>
          </div>
          <Donut
            segments={payrollSegs}
            format={fmt.shortMoney}
            centerLabel={fmt.shortMoney(H.payroll.total)}
            centerSub="Payroll TTM"
            size={180}
            thickness={22}
          />
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Tenure distribution</h3>
              <div className="card__sub">Median tenure <strong>{H.tenure.median} years</strong> · steady five-year band</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {H.tenure.buckets.map((b, i) => {
              const max = Math.max(...H.tenure.buckets.map(x => x.count));
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '78px 1fr 32px', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < H.tenure.buckets.length - 1 ? '1px solid var(--rule)' : 0 }}>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>{b.range}</div>
                  <div style={{ height: 14, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(b.count / max) * 100}%`, height: '100%', background: 'var(--navy)', opacity: 0.75 }} />
                  </div>
                  <div className="mono tnum" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{b.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Open positions ────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Open positions</h3>
            <div className="card__sub">{H.openPositions.length} active searches · ranges from screening to re-open</div>
          </div>
          <span className="tag tag--warn"><i className="tag__dot" />1 stalled</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Position</th>
              <th>Department</th>
              <th>Stage</th>
              <th style={{ textAlign: 'right' }}>Candidates</th>
              <th>Days posted</th>
            </tr>
          </thead>
          <tbody>
            {H.openPositions.map((p, i) => {
              const days = Math.floor((new Date('2026-05-14') - new Date(p.posted)) / 86400000);
              const stalled = days > 90 || p.stage.includes('Re-opening');
              return (
                <tr key={i}>
                  <td className="label">{p.title}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{p.dept}</td>
                  <td>
                    <span className={'tag ' + (stalled ? 'tag--warn' : 'tag--ink')} style={{ textTransform: 'none', letterSpacing: '0.01em', fontWeight: 400 }}>
                      {p.stage}
                    </span>
                  </td>
                  <td className="num">{p.candidates}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{days} <span style={{ color: 'var(--ink-4)' }}>days</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

Object.assign(window, { HRView });
