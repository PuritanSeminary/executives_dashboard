// views-financial.jsx — Financial deep dive
// Departments × budget variance, grants, investments, tuition realization.

function FinancialView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const F = D.finance;
  const months = D.months;
  const [from, to] = rangeSlice(rangeId, months.length);

  const [chartKind, setChartKind] = React.useState('line');
  const [selectedDept, setSelectedDept] = React.useState(null);

  // Total operating spend chart with budget overlay
  const totalBudget = F.departments.reduce((s, d) => s + d.budget, 0);
  const monthlyBudget = Array(months.length).fill(totalBudget / 12);

  // Heat strip: monthly variance by department across last 24 months
  const monthlyVariance = months.slice(-24).map((m, idx) => {
    const realIdx = months.length - 24 + idx;
    const monthSpend = F.departments.reduce((s, d) => s + d.series[realIdx], 0);
    const monthBudget = totalBudget / 12;
    return { label: m.label, value: (monthSpend - monthBudget) / monthBudget };
  });

  // Tuition realization — current snapshot vs. the AY '24–25 row
  const tuit = F.tuition.current;
  const tuitPtsChange = (tuit.rate - F.tuition.priorAY.rate) * 100;
  const IS = F.incomeStatement;

  return (
    <>
      <Brief
        kicker="Business Office"
        date="As of June 2, 2026"
        headline="Financial"
        dek="Synced from Financial Edge NXT."
        sources={[
          { label: 'Source', value: 'Financial Edge NXT' },
          { label: 'Refresh', value: 'Monthly' },
          { label: 'Custodian', value: 'Greenleaf Trust' },
        ]}
      />

      {/* ── Quick stats ─────────────────────────────────── */}
      <div className="grid grid--4">
        <KPI
          label="YTD spend"
          value={fmt.shortMoney(F.ytd.spend)}
          delta={F.ytd.variance}
          deltaLabel="vs. YTD budget"
          caption={`Calendar year to date · ${F.ytd.elapsedMonths.toFixed(1)} months elapsed.`}
          source="Financial Edge"
        />
        <KPI
          label="YTD budget"
          value={fmt.shortMoney(F.ytd.budget)}
          delta={(F.annualBudget - F.budgetPriorYear) / F.budgetPriorYear}
          deltaLabel="annual vs. FY '25"
          caption={`Pro-rated from ${fmt.shortMoney(F.annualBudget)} approved annual budget.`}
          source="Operating · all funds"
        />
        <KPI
          label="Investments"
          value={fmt.shortMoney(F.investments.total)}
          delta={F.investments.ytdWeighted}
          deltaLabel="YTD"
          caption={`Across ${F.investments.accounts.length} accounts at Greenleaf.`}
          source="Greenleaf Trust"
          status="ok"
        />
        <KPI
          label="Grants balance"
          value={fmt.shortMoney(F.grantsBalance)}
          delta={(F.grantsBalance - F.grantsPriorBalance) / F.grantsPriorBalance}
          deltaLabel="vs. prior year"
          caption={`${F.grants.length} active awards · ${F.grants.length} funders`}
          source="Grant register"
          status="ok"
        />
      </div>

      {/* ── Operating spend trend ────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Operating spend vs. monthly budget</h3>
            <div className="card__sub">Five-year monthly series. Hover for any month; click a department below to swap the series.</div>
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
              ? { name: selectedDept.name, data: selectedDept.series, color: 'var(--ink-2)', mtdLast: true }
              : { name: 'Operating spend', data: F.operatingSpend, color: 'var(--ink-2)', mtdLast: true },
            selectedDept
              ? { name: 'Monthly budget', data: Array(months.length).fill(selectedDept.budget / 12), color: 'var(--ink-4)', dashed: true }
              : { name: 'Monthly budget', data: monthlyBudget, color: 'var(--ink-4)', dashed: true },
          ]}
          labels={months.map(m => m.label)}
          height={260}
          showLegend
        />
      </div>

      {/* ── Income statement ───────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Income statement</h3>
            <div className="card__sub">Revenue, expenses, and net income by fiscal year. FY 2026 reflects results posted year to date.</div>
          </div>
          <span className="tag tag--ink"><i className="tag__dot" />Unaudited</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Line item</th>
              {IS.periods.map((p, i) => (
                <th key={i} style={{ textAlign: 'right', width: 130 }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={IS.periods.length + 1} style={{ paddingTop: 14, paddingBottom: 4, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600, fontFamily: 'var(--sans)' }}>Revenue</td>
            </tr>
            {IS.revenue.map((r, i) => (
              <tr key={'r' + i}>
                <td className="label">{r.label}</td>
                {r.values.map((v, c) => (
                  <td key={c} className="num">{fmt.shortMoney(v)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="label" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>Total revenue</td>
              {IS.revenueTotal.map((v, c) => (
                <td key={c} className="num" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>{fmt.shortMoney(v)}</td>
              ))}
            </tr>
            <tr>
              <td colSpan={IS.periods.length + 1} style={{ paddingTop: 16, paddingBottom: 4, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600, fontFamily: 'var(--sans)' }}>Expenses</td>
            </tr>
            {IS.expenses.map((r, i) => (
              <tr key={'e' + i}>
                <td className="label">{r.label}</td>
                {r.values.map((v, c) => (
                  <td key={c} className="num">{fmt.shortMoney(v)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="label" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>Total expenses</td>
              {IS.expenseTotal.map((v, c) => (
                <td key={c} className="num" style={{ fontWeight: 600, borderTop: '1px solid var(--rule-strong)' }}>{fmt.shortMoney(v)}</td>
              ))}
            </tr>
            <tr>
              <td className="label" style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontStyle: 'italic', borderTop: '2px solid var(--ink)' }}>Net income</td>
              {IS.netIncome.map((v, c) => (
                <td key={c} className="num" style={{ fontWeight: 700, borderTop: '2px solid var(--ink)', color: v >= 0 ? 'var(--pos)' : 'var(--red)' }}>{(v < 0 ? '−' : '') + fmt.shortMoney(Math.abs(v))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Department × budget table with variance heat strip ── */}
      <div className="grid grid--12">
        <div className="card span-8">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Departments vs. budget</h3>
              <div className="card__sub">YTD spend versus approved annual budget. Click any row to chart the department above.</div>
            </div>
            <span className="tag tag--ink"><i className="tag__dot" />9 departments</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th>
                <th style={{ width: 110 }}>Variance band</th>
                <th style={{ textAlign: 'right' }}>YTD actual</th>
                <th style={{ textAlign: 'right' }}>Budget</th>
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
              <h3 className="card__title">Monthly variance, 24 mo</h3>
              <div className="card__sub">Sum across all departments versus pacing budget.</div>
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
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
              Tuition realization
            </div>
            <div className="kpi__hero" style={{ marginBottom: 0 }}>
              <div className="kpi__num" style={{ fontSize: 32 }}>{fmt.pct(tuit.rate, 1)}</div>
              <div className={'kpi__delta mono ' + (tuitPtsChange < 0 ? 'kpi__delta--down' : '')} style={{ fontSize: 11 }}>{tuitPtsChange < 0 ? '▼' : '▲'} {Math.abs(tuitPtsChange).toFixed(1)} pts</div>
            </div>
            <div className="card__caption" style={{ marginTop: 6 }}>
              Net ${tuit.net.toLocaleString()} against ${tuit.list.toLocaleString()} list. Discount rate {tuitPtsChange < 0 ? 'climbing' : 'easing'} {Math.abs(tuitPtsChange).toFixed(1)} points since AY '24–25.
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline data={F.tuition.realization.map(r => r.rate)} color="var(--slate-cool)" height={32} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Investments ─────────────────────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Investments at Greenleaf Trust</h3>
              <div className="card__sub">Five-year total, with Q4 2022 drawdown visible.</div>
            </div>
            <span className="tag tag--ok"><i className="tag__dot" />Above '24 high</span>
          </div>
          <LineChart
            variant="area"
            series={[{ name: 'Total invested', data: F.investments.history, color: 'var(--navy)' }]}
            labels={months.map(m => m.label)}
            height={220}
            showLegend={false}
          />
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">By account</h3>
              <div className="card__sub">As of {F.investments.asOf}</div>
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
            <h3 className="card__title">Active grants</h3>
            <div className="card__sub">5 awards · {fmt.shortMoney(F.grants.reduce((s, g) => s + g.awarded, 0))} total committed</div>
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
