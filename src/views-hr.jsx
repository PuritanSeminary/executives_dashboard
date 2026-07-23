// views-hr.jsx — Personnel deep dive
// Headcount, payroll, open positions, tenure.

function HRView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const H = D.hr || {};
  const hc = H.headcount || [];
  const curr = hc[hc.length - 1] || { ft: 0, pt: 0, student: 0 };
  const prior = hc.length >= 13 ? hc[hc.length - 13] : (hc[0] || curr);
  const pctDelta = (cur, prev) => (prev ? (cur - prev) / prev : null);
  const asOf = (D.live && D.live.generatedAt) ? new Date(D.live.generatedAt) : new Date();

  // Open positions (still mock until Paycor Recruiting/ATS is wired).
  const positions = H.openPositions || [];
  const daysOpen = (p) => Math.max(0, Math.floor((asOf - new Date(p.posted)) / 86400000));
  const stalledCount = positions.filter(p => daysOpen(p) > 90 || (p.stage || '').includes('Re-opening')).length;

  // x-axis labels from live data when present (else the mock calendar), length-matched.
  const monthLabels = (H.months && H.months.length === hc.length)
    ? H.months
    : (D.months || []).map(m => m.label);

  const ftSeries = hc.map(h => h.ft);
  const ptSeries = hc.map(h => h.pt);
  const stSeries = hc.map(h => h.student);

  // Payroll: one honest source for both the KPI and the donut — the annualized total.
  // (The old monthly `series` was a synthetic headcount-scaled proxy; don't derive a YoY from it.)
  const payroll = H.payroll || { total: 0, categories: [], basis: '' };
  const loaded = payroll.loaded || null; // fully-loaded comp (base + employer taxes/retirement/benefits), null until GL factor configured
  const tenure = H.tenure || { median: 0, buckets: [] };
  // Payroll as % of operating budget (budget still from Financial Edge mock until wired).
  const budget = (D.finance && D.finance.annualBudget) || null;
  const payrollPct = (budget && payroll.total) ? payroll.total / budget : null;

  // Donut segments — 8 distinct slots, a neutral reserved for the "Other" rollup.
  const DONUT = ['var(--oxblood)', 'var(--navy)', 'var(--moss)', 'var(--gold)', 'var(--slate-cool)', 'var(--blue)', 'var(--ink-3)'];
  const payrollSegs = (payroll.categories || []).map((c, i) => ({
    label: c.name,
    value: c.amount,
    sub: `${c.fte} FTE · ${fmt.pct(c.share, 0)} of payroll`,
    color: /other/i.test(c.name) ? 'var(--rule-strong)' : DONUT[i % DONUT.length],
  }));

  return (
    <>
      <Brief
        kicker="Human Resources"
        date={"As of " + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        headline="Personnel"
        sources={[
          { label: 'Source', value: 'Paycor' },
        ]}
      />

      {/* ── Top KPIs ────────────────────────────────────── */}
      <div className="grid grid--5">
        <KPI
          label="Full-time"
          value={curr.ft}
          delta={pctDelta(curr.ft, prior.ft)}
          deltaLabel="vs. prior year"
          caption="Faculty, administration, and operations staff."
          spark={ftSeries.slice(-24)}
          sparkColor="var(--ink-3)"
          sparkFloor={0}
          source="Paycor"
        />
        <KPI
          label="Part-time"
          value={curr.pt}
          delta={pctDelta(curr.pt, prior.pt)}
          deltaLabel="vs. prior year"
          caption="Part-time and adjunct staff."
          spark={ptSeries.slice(-24)}
          sparkColor="var(--ink-3)"
          sparkFloor={0}
        />
        <KPI
          label="Student employees"
          value={curr.student}
          delta={pctDelta(curr.student, prior.student)}
          deltaLabel="vs. prior year"
          caption="Paycor 'Seasonal' worker type; dips in summer term."
          spark={stSeries.slice(-24)}
          sparkColor="var(--ink-3)"
          sparkFloor={0}
        />
        <KPI
          label="Payroll (annualized)"
          value={fmt.shortMoney(payroll.total)}
          caption={loaded
            ? `Base comp. Fully loaded ≈ ${fmt.shortMoney(loaded.total)} incl. employer taxes, retirement & benefits (+${fmt.pct(loaded.factor, 0)}).`
            : (payroll.basis || 'Annualized base compensation.')}
          source="Paycor"
        />
        <KPI
          label="Payroll % of budget"
          value={payrollPct != null ? fmt.pct(payrollPct, 0) : '—'}
          caption={budget ? `Annualized base comp ÷ operating budget (${fmt.shortMoney(budget)}, Financial Edge).` : 'Budget unavailable.'}
        />
      </div>

      {/* ── Headcount trend ───────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Headcount, five-year<CardInfo>Three categories tracked separately. Student-employee headcount mirrors the academic calendar.</CardInfo></h3>
          </div>
        </div>
        <LineChart
          variant="area"
          series={[
            { name: 'Full-time',  data: ftSeries, color: 'var(--navy)' },
            { name: 'Part-time',  data: ptSeries, color: 'var(--slate-cool)' },
            { name: 'Student',    data: stSeries, color: 'var(--moss)' },
          ]}
          labels={monthLabels}
          height={220}
        />
      </div>

      {/* ── Payroll mix + tenure ──────────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Payroll by department<CardInfo>{fmt.shortMoney(payroll.total)} total · {payroll.basis || 'annualized base compensation'}. Small departments rolled into "Other".</CardInfo></h3>
            </div>
          </div>
          <HorizontalBars items={payrollSegs} colorKey="color" format={fmt.shortMoney} />
          {loaded && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.6, borderTop: '1px solid var(--rule)', paddingTop: 10 }}>
              Base compensation shown above. <strong>Fully loaded ≈ {fmt.shortMoney(loaded.total)}</strong> (+{fmt.pct(loaded.factor, 0)}):
              {' '}employer taxes {fmt.shortMoney(loaded.components[0].amount)} · retirement {fmt.shortMoney(loaded.components[1].amount)} · benefits {fmt.shortMoney(loaded.components[2].amount)}.
              {loaded.basis ? ` Load factor derived from ${loaded.basis}.` : ''}
            </p>
          )}
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Tenure distribution<CardInfo>Median tenure <strong>{tenure.median} years</strong>, from Paycor hire dates.</CardInfo></h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {(() => { const tenureMax = Math.max(1, ...tenure.buckets.map(x => x.count)); return tenure.buckets.map((b, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '78px 1fr 32px', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < tenure.buckets.length - 1 ? '1px solid var(--rule)' : 0 }}>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>{b.range}</div>
                  <div style={{ height: 14, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(b.count / tenureMax) * 100}%`, height: '100%', background: 'var(--navy)', opacity: 0.75 }} />
                  </div>
                  <div className="mono tnum" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{b.count}</div>
                </div>
              )); })()}
          </div>
        </div>
      </div>

      {/* ── Open positions ────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Open positions<CardInfo>{positions.length} active searches · {stalledCount} stalled. Sample data — Paycor Recruiting (ATS) integration pending.</CardInfo></h3>
          </div>
          <span className="tag tag--ink" style={{ textTransform: 'none', letterSpacing: '0.01em', fontWeight: 400 }}>sample data</span>
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
            {positions.map((p, i) => {
              const days = daysOpen(p);
              const stalled = days > 90 || (p.stage || '').includes('Re-opening');
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
