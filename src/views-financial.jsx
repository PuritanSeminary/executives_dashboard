// views-financial.jsx — Financial deep dive
// Departments × budget variance, grants, investments, tuition realization.

function FinancialView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const F = D.finance;
  const V = window.PRTS_VIEW;
  const months = D.months;
  const [from, to] = rangeSlice(rangeId, months.length);

  const [chartKind, setChartKind] = React.useState('line');
  const [selectedDept, setSelectedDept] = React.useState(null);
  const [stmtPeriod, setStmtPeriod] = React.useState('ytd'); // Statement of Activities period
  const [stmtExpanded, setStmtExpanded] = React.useState(false); // show full line items vs. summary

  // Trend display: drop the partial current month unless the range is MTD, so
  // the line ends on the last fully-posted month instead of dipping.
  const showMtd = V.isMtd(rangeId);
  const trendLabels = V.months(rangeId).map(m => m.label);
  const opSpendTrend = V.trend(F.operatingSpend, rangeId);

  // Total operating spend chart with budget overlay
  const totalBudget = F.annualBudget;
  const monthlyBudget = Array(trendLabels.length).fill(F.monthlyBudget);

  // Heat strip: monthly variance by department across last 24 complete months
  const completeMonths = V.complete(months);
  const monthlyVariance = completeMonths.slice(-24).map((m) => {
    const monthSpend = F.departments.reduce((s, d) => s + d.series[m.idx], 0);
    return { label: m.label, value: (monthSpend - F.monthlyBudget) / F.monthlyBudget };
  });

  // Tuition realization — current snapshot vs. the AY '24–25 row
  const tuit = F.tuition.current;
  const tuitPtsChange = (tuit.rate - F.tuition.priorAY.rate) * 100;

  // Favourability helpers so green always means "good": under budget on the
  // expense side, over budget on the revenue side.
  const expFav = (b, a) => (b - a) / b;          // positive = under budget
  const revFav = (a, b) => b ? (a - b) / b : 0;  // positive = over budget

  return (
    <>
      <Brief
        kicker="Business Office"
        date="As of April 30, 2026"
        headline="Financial"
        sources={[
          { label: 'Source', value: 'Financial Edge NXT' },
        ]}
      />

      {/* ── Revenue, expense and net — YTD + MTD, each vs. its own budget ── */}
      <div className="grid grid--4">
        <KPI
          label="YTD revenue"
          value={fmt.shortMoney(F.revenue.ytd.actual)}
          delta={revFav(F.revenue.ytd.actual, F.revenue.ytd.budget)}
          deltaLabel={`vs. budget ${fmt.shortMoney(F.revenue.ytd.budget)}`}
          caption={`Fiscal year to date. Prior year ${fmt.shortMoney(F.revenue.ytd.priorYear)}.`}
          source="Financial Edge"
          status={revFav(F.revenue.ytd.actual, F.revenue.ytd.budget) < -0.05 ? 'warn' : 'pos'}
        />
        <KPI
          label="YTD expense"
          value={fmt.shortMoney(F.ytd.spend)}
          delta={expFav(F.ytd.budget, F.ytd.spend)}
          deltaLabel={expFav(F.ytd.budget, F.ytd.spend) >= 0 ? `under budget ${fmt.shortMoney(F.ytd.budget)}` : `over budget ${fmt.shortMoney(F.ytd.budget)}`}
          caption={`Through ${F.ytd.monthLabel}. Prior year ${fmt.shortMoney(F.ytd.priorYear)}.`}
          source="Financial Edge"
          status={expFav(F.ytd.budget, F.ytd.spend) < -0.05 ? 'alert' : 'pos'}
        />
        <KPI
          label="MTD expense"
          value={fmt.shortMoney(F.mtd.spend)}
          delta={expFav(F.mtd.budget, F.mtd.spend)}
          deltaLabel={expFav(F.mtd.budget, F.mtd.spend) >= 0 ? `under budget ${fmt.shortMoney(F.mtd.budget)}` : `over budget ${fmt.shortMoney(F.mtd.budget)}`}
          caption={`${F.mtd.monthLabel} · each month carries its own budget.`}
          source="Financial Edge"
          status={expFav(F.mtd.budget, F.mtd.spend) < -0.05 ? 'alert' : 'pos'}
        />
        <KPI
          label="Net surplus"
          value={fmt.shortMoney(F.net.ytd.actual)}
          delta={(F.net.ytd.actual - F.net.ytd.budget) / Math.abs(F.net.ytd.budget)}
          deltaLabel={`vs. budget ${fmt.shortMoney(F.net.ytd.budget)}`}
          caption={`Revenue less expense, YTD. Prior year ${fmt.shortMoney(F.net.ytd.priorYear)}.`}
          source="Financial Edge"
          status="pos"
        />
      </div>

      {/* ── Operating spend trend ────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Operating spend vs. monthly budget<CardInfo>Monthly actuals against the even split of the annual budget. The partial current month is hidden unless the range is MTD. Click a department below to swap the series.</CardInfo></h3>
          </div>
          <div className="chart-toggle">
            <button aria-pressed={chartKind === 'line'} onClick={() => setChartKind('line')}>Line</button>
            <button aria-pressed={chartKind === 'area'} onClick={() => setChartKind('area')}>Area</button>
            <button aria-pressed={chartKind === 'bar'} onClick={() => setChartKind('bar')}>Bar</button>
          </div>
        </div>
        <LineChart
          variant={chartKind}
          series={[
            selectedDept
              ? { name: selectedDept.name, data: V.trend(selectedDept.series, rangeId), color: 'var(--ink-2)', mtdLast: showMtd }
              : { name: 'Operating spend', data: opSpendTrend, color: 'var(--ink-2)', mtdLast: showMtd },
            selectedDept
              ? { name: 'Monthly budget', data: Array(trendLabels.length).fill(selectedDept.monthlyBudget), color: 'var(--ink-4)', dashed: true }
              : { name: 'Monthly budget', data: monthlyBudget, color: 'var(--ink-4)', dashed: true },
          ]}
          labels={trendLabels}
          height={260}
          showLegend
        />
      </div>

      {/* ── Department × budget table with variance heat strip ── */}
      <div className="grid grid--12">
        <div className="card span-8">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Departments vs. budget<CardInfo>YTD spend versus the budget for the same {F.ytd.elapsedMonths} months. Click any row to chart the department above.</CardInfo></h3>
            </div>
            <span className="tag tag--ink"><i className="tag__dot" />{F.departments.length} departments</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th>
                <th style={{ width: 110 }}>Variance band</th>
                <th style={{ textAlign: 'right' }}>YTD actual</th>
                <th style={{ textAlign: 'right' }}>YTD budget</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {F.departments.map(d => {
                const isSel = selectedDept?.id === d.id;
                return (
                  <tr key={d.id} onClick={() => setSelectedDept(isSel ? null : d)} style={{ background: isSel ? 'var(--bg)' : undefined, cursor: 'pointer' }}>
                    <td>
                      <div className="label">{d.name}</div>
                      <span className="tbl__sub">{d.head}</span>
                    </td>
                    <td style={{ paddingRight: 0 }}>
                      <div style={{ width: 90, height: 6, background: 'var(--rule)', borderRadius: 2, position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '50%', top: 0, bottom: 0,
                          width: 1, background: 'var(--ink-3)',
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: 0, bottom: 0,
                          left: d.variance < 0 ? `${50 + d.variance * 200}%` : '50%',
                          width: `${Math.min(50, Math.abs(d.variance) * 200)}%`,
                          background: Math.abs(d.variance) < 0.05 ? 'var(--pos)' : (d.variance > 0 ? 'var(--red)' : 'var(--warn)'),
                          borderRadius: 2,
                        }} />
                      </div>
                    </td>
                    <td className="num">{fmt.shortMoney(d.ytdActual)}</td>
                    <td className="num muted">{fmt.shortMoney(d.ytdBudget)}</td>
                    <td className="num"><VarianceFlag variance={d.variance} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card span-4">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Monthly variance, 24 mo<CardInfo>Sum across all departments versus pacing budget.</CardInfo></h3>
            </div>
          </div>
          <HeatStrip data={monthlyVariance} height={32} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
            <span>{monthlyVariance[0].label}</span>
            <span>{monthlyVariance[monthlyVariance.length - 1].label}</span>
          </div>
          <div className="chart__legend">
            <span><i style={{ background: 'var(--red)' }} />Over &gt;10%</span>
            <span><i style={{ background: 'var(--warn)' }} />Under &gt;10%</span>
            <span><i style={{ background: 'var(--pos)' }} />Within band</span>
          </div>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              Tuition realization
              <CardInfo>Net ${tuit.net.toLocaleString()} against ${tuit.list.toLocaleString()} list. Discount rate {tuitPtsChange < 0 ? 'climbing' : 'easing'} {Math.abs(tuitPtsChange).toFixed(1)} points since AY '24–25.</CardInfo>
            </div>
            <div className="kpi__hero" style={{ marginBottom: 0 }}>
              <div className="kpi__num" style={{ fontSize: 32 }}>{fmt.pct(tuit.rate, 1)}</div>
              <div className={'kpi__delta mono ' + (tuitPtsChange < 0 ? 'kpi__delta--down' : '')} style={{ fontSize: 11 }}>{tuitPtsChange < 0 ? '▼' : '▲'} {Math.abs(tuitPtsChange).toFixed(1)} pts</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline data={F.tuition.realization.map(r => r.rate)} color="var(--slate-cool)" height={32} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Statement of Activities (real, FY 2025–26) ── */}
      {(() => {
        const p = stmtPeriod;
        const aKey = p + 'Actual', bKey = p + 'Budget';
        const St = F.statement;
        const revT = St.revenueTotal[p], expT = St.expenseTotal[p], net = St.net[p];
        const vcell = (actual, budget, kind) => {
          const v = actual - budget;
          const favorable = kind === 'rev' ? v >= 0 : v <= 0;
          const col = Math.abs(v) < budget * 0.01 ? 'var(--ink-4)' : (favorable ? 'var(--pos)' : 'var(--red)');
          const txt = (v < 0 ? '(' : '') + fmt.shortMoney(Math.abs(v)) + (v < 0 ? ')' : '');
          return <td className="num" style={{ color: col }}>{txt}</td>;
        };
        const secHd = (label) => (
          <tr><td colSpan={4} style={{ paddingTop: 14, paddingBottom: 4, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600, fontFamily: 'var(--sans)' }}>{label}</td></tr>
        );
        const totalRow = (label, t, kind) => (
          <tr>
            <td className="label" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>{label}</td>
            <td className="num" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>{fmt.shortMoney(t.actual)}</td>
            <td className="num muted" style={{ borderTop: '1px solid var(--rule-strong)' }}>{fmt.shortMoney(t.budget)}</td>
            {vcell(t.actual, t.budget, kind)}
          </tr>
        );
        return (
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Statement of activities<CardInfo>Revenue, expense and net surplus — actual against the budget for the period. {p === 'ytd' ? 'Fiscal year to date through Apr 2026.' : 'Month of April 2026.'}</CardInfo></h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="disclose-btn"
              aria-expanded={stmtExpanded}
              onClick={() => setStmtExpanded(x => !x)}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              {stmtExpanded ? 'Hide line items' : `Show line items (${St.revenue.length + St.expense.length})`}
            </button>
            <div className="chart-toggle">
              <button aria-pressed={p === 'mtd'} onClick={() => setStmtPeriod('mtd')}>MTD</button>
              <button aria-pressed={p === 'ytd'} onClick={() => setStmtPeriod('ytd')}>YTD</button>
            </div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: 'right', width: 130 }}>Actual</th>
              <th style={{ textAlign: 'right', width: 130 }}>Budget</th>
              <th style={{ textAlign: 'right', width: 130 }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {stmtExpanded && secHd('Revenue')}
            {stmtExpanded && St.revenue.map((r, i) => (
              <tr key={'r' + i}>
                <td className="label">{r.name}</td>
                <td className="num">{fmt.shortMoney(r[aKey])}</td>
                <td className="num muted">{fmt.shortMoney(r[bKey])}</td>
                {vcell(r[aKey], r[bKey], 'rev')}
              </tr>
            ))}
            {totalRow('Total revenue', revT, 'rev')}
            {stmtExpanded && secHd('Expense')}
            {stmtExpanded && St.expense.map((r, i) => (
              <tr key={'e' + i}>
                <td className="label">{r.name}</td>
                <td className="num">{fmt.shortMoney(r[aKey])}</td>
                <td className="num muted">{fmt.shortMoney(r[bKey])}</td>
                {vcell(r[aKey], r[bKey], 'exp')}
              </tr>
            ))}
            {totalRow('Total expense', expT, 'exp')}
            <tr>
              <td className="label" style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontStyle: 'italic', borderTop: '2px solid var(--ink)' }}>Net surplus / (deficit)</td>
              <td className="num" style={{ fontWeight: 700, borderTop: '2px solid var(--ink)', color: net.actual >= 0 ? 'var(--pos)' : 'var(--red)' }}>{(net.actual < 0 ? '−' : '') + fmt.shortMoney(Math.abs(net.actual))}</td>
              <td className="num muted" style={{ borderTop: '2px solid var(--ink)' }}>{(net.budget < 0 ? '−' : '') + fmt.shortMoney(Math.abs(net.budget))}</td>
              {vcell(net.actual, net.budget, 'rev')}
            </tr>
          </tbody>
        </table>
      </div>
        );
      })()}

      {/* ── Year-to-date by fund (real GL fund dimension) ── */}
      <div className="grid grid--12">
        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Revenue by fund · YTD<CardInfo>Actual against prior year. {fmt.shortMoney(F.byFund.revenueTotal.actual)} total.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fund</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
                <th style={{ textAlign: 'right' }}>Prior year</th>
                <th style={{ textAlign: 'right' }}>Δ YoY</th>
              </tr>
            </thead>
            <tbody>
              {F.byFund.revenue.map((r, i) => {
                const d = (r.actual - r.priorYear) / r.priorYear;
                return (
                  <tr key={i}>
                    <td className="label">{r.name}</td>
                    <td className="num">{fmt.shortMoney(r.actual)}</td>
                    <td className="num muted">{fmt.shortMoney(r.priorYear)}</td>
                    <td className="num" style={{ color: d >= 0 ? 'var(--pos)' : 'var(--red)' }}>{fmt.signedPct(d, 0)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '1.5px solid var(--rule-strong)' }}>
                <td className="label" style={{ fontWeight: 600 }}>Total</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt.shortMoney(F.byFund.revenueTotal.actual)}</td>
                <td className="num muted">{fmt.shortMoney(F.byFund.revenueTotal.priorYear)}</td>
                <td className="num" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Expense by fund · YTD<CardInfo>Actual against prior year. {fmt.shortMoney(F.byFund.expenseTotal.actual)} total.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fund</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
                <th style={{ textAlign: 'right' }}>Prior year</th>
                <th style={{ textAlign: 'right' }}>Δ YoY</th>
              </tr>
            </thead>
            <tbody>
              {F.byFund.expense.map((r, i) => {
                const d = (r.actual - r.priorYear) / r.priorYear;
                return (
                  <tr key={i}>
                    <td className="label">{r.name}</td>
                    <td className="num">{fmt.shortMoney(r.actual)}</td>
                    <td className="num muted">{fmt.shortMoney(r.priorYear)}</td>
                    <td className="num" style={{ color: d <= 0 ? 'var(--pos)' : 'var(--ink-3)' }}>{fmt.signedPct(d, 0)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '1.5px solid var(--rule-strong)' }}>
                <td className="label" style={{ fontWeight: 600 }}>Total</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt.shortMoney(F.byFund.expenseTotal.actual)}</td>
                <td className="num muted">{fmt.shortMoney(F.byFund.expenseTotal.priorYear)}</td>
                <td className="num" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Investments ─────────────────────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Investments at Greenleaf Trust<CardInfo>Five-year total, with Q4 2022 drawdown visible.</CardInfo></h3>
            </div>
            <span className="tag tag--ok"><i className="tag__dot" />Above '24 high</span>
          </div>
          <LineChart
            variant="area"
            series={[{ name: 'Total invested', data: V.complete(F.investments.history), color: 'var(--navy)' }]}
            labels={V.complete(months).map(m => m.label)}
            height={220}
            showLegend={false}
          />
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">By account<CardInfo>As of {F.investments.asOf}.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl">
            <tbody>
              {F.investments.accounts.map((a, i) => (
                <tr key={i}>
                  <td>
                    <div className="label">{a.name}</div>
                    <span className="tbl__sub">YTD <span className="mono">{fmt.signedPct(a.ytd)}</span> · {fmt.pct(a.alloc.eq, 0)} eq</span>
                  </td>
                  <td className="num">{fmt.shortMoney(a.balance)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1.5px solid var(--rule-strong)' }}>
                <td className="label" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Total</td>
                <td className="num" style={{ fontWeight: 600, fontSize: 14 }}>{fmt.shortMoney(F.investments.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Grants ─────────────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Active grants<CardInfo>5 awards · {fmt.shortMoney(F.grants.reduce((s, g) => s + g.awarded, 0))} total committed.</CardInfo></h3>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Grant</th>
              <th>Funder</th>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>Awarded</th>
              <th style={{ textAlign: 'right' }}>Spent</th>
              <th style={{ width: 180 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {F.grants.map(g => {
              const pct = g.spent / g.awarded;
              return (
                <tr key={g.id}>
                  <td className="label">{g.name}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{g.funder}</td>
                  <td className="muted mono" style={{ fontSize: 11.5 }}>{g.start} → {g.end}</td>
                  <td className="num">{fmt.shortMoney(g.awarded)}</td>
                  <td className="num">{fmt.shortMoney(g.spent)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--blue)' }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 32 }}>{fmt.pct(pct, 0)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

Object.assign(window, { FinancialView });
