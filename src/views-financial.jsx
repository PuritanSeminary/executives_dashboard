// views-financial.jsx — Financial deep dive
// Departments × budget variance, grants, investments, tuition realization.

function FinancialView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const F = D.finance;
  const V = window.PRTS_VIEW;
  // Live-data freshness — drives the "Data as of" stamp and the staleness /
  // sample-data banners below.
  const fin = (window.PRTS_API && window.PRTS_API.financialStatus)
    ? window.PRTS_API.financialStatus()
    : { live: false, label: null, stale: false };
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

  // Neutral context ramp — a revenue/asset breakdown is "info", so per the
  // colour logic it stays in the blue→neutral family (no red/gold/green, which
  // carry alert/warn/positive meaning). Every step is visually distinct.
  const revColors = ['#003D6C', '#005596', '#4E86B4', '#7E8C9A', '#566573', '#9D9DA1', '#C4CAD0'];
  const revSegments = [...F.revenue.categories]
    .sort((a, b) => b.ytdActual - a.ytdActual)
    .map((c, i) => ({ label: c.name, value: c.ytdActual, color: revColors[i % revColors.length] }));

  // Investment composition donut — exact asset-class values from the report.
  const invColors = ['#003D6C', '#4E86B4', '#9DA7B0'];
  const invSegments = F.investments.composition.map((c, i) => ({ label: c.name, value: c.value, color: invColors[i % invColors.length] }));

  // Favourability helpers so green always means "good": under budget on the
  // expense side, over budget on the revenue side.
  const expFav = (b, a) => (b - a) / b;          // positive = under budget
  const revFav = (a, b) => b ? (a - b) / b : 0;  // positive = over budget

  return (
    <>
      <Brief
        kicker="Business Office"
        date={fin.live ? ('Data as of ' + (fin.label || 'latest pull')) : 'Sample data — no live pull yet'}
        headline="Financial"
        sources={[
          { label: 'Source', value: 'Financial Edge NXT' },
        ]}
      />

      {/* Staleness banner — only when live data is older than the weekly cadence
          allows (>10 days), i.e. the pull has actually been failing. */}
      {fin.stale && (
        <div role="alert" style={{
          margin: '12px 0', padding: '10px 14px', borderRadius: 8, fontWeight: 600,
          background: '#FBEAEA', color: '#7A1F1F', border: '1px solid #E3B4B4',
        }}>
          ⚠️ Financial data may be out of date — last updated {fin.label}
        </div>
      )}
      {/* Sample-data notice — only when there has NEVER been a successful pull. */}
      {!fin.live && (
        <div role="note" style={{
          margin: '12px 0', padding: '10px 14px', borderRadius: 8, fontWeight: 600,
          background: '#FDF6E3', color: '#6B5A1E', border: '1px solid #E8D9A6',
        }}>
          Sample / placeholder data — no live financial pull yet. Figures below are illustrative.
        </div>
      )}

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
          caption={`Month to date · budget ${fmt.shortMoney(F.mtd.budget)}.`}
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

      {/* ── YTD revenue by category (report pie) ── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">YTD revenue by category<CardInfo>Fiscal year to date by revenue category. {fmt.shortMoney(F.revenue.ytd.actual)} total.</CardInfo></h3>
          </div>
        </div>
        <Donut
          segments={revSegments}
          size={200}
          thickness={26}
          format={fmt.shortMoney}
          centerLabel={fmt.shortMoney(F.revenue.ytd.actual)}
          centerSub="YTD revenue"
        />
      </div>

      {/* ── Department × budget table ── */}
      <div className="grid grid--12">
        <div className="card span-12">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Departments vs. budget<CardInfo>Fiscal year 2026 to date, actual spend against budget. Click any row to select it.</CardInfo></h3>
            </div>
            <span className="tag tag--ink"><i className="tag__dot" />{F.departments.length} departments</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th>
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
            <h3 className="card__title">Statement of activities<CardInfo>Revenue, expense and net surplus — actual against the budget. {p === 'ytd' ? 'Fiscal year 2026 to date.' : 'Current month to date.'}</CardInfo></h3>
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

      {/* ── Year-to-date by fund ── */}
      <div className="grid grid--12">
        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Revenue by fund<CardInfo>Unrestricted vs. restricted, FY2026. {fmt.shortMoney(F.byFund.revenueTotal.actual)} total.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fund</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
                <th style={{ textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {F.byFund.revenue.map((r, i) => (
                <tr key={i}>
                  <td className="label">{r.name}</td>
                  <td className="num">{fmt.shortMoney(r.actual)}</td>
                  <td className="num muted">{fmt.pct(r.actual / F.byFund.revenueTotal.actual, 0)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1.5px solid var(--rule-strong)' }}>
                <td className="label" style={{ fontWeight: 600 }}>Total</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt.shortMoney(F.byFund.revenueTotal.actual)}</td>
                <td className="num" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card span-6">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Expense by fund<CardInfo>Unrestricted vs. restricted, FY2026. {fmt.shortMoney(F.byFund.expenseTotal.actual)} total.</CardInfo></h3>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fund</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
                <th style={{ textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {F.byFund.expense.map((r, i) => (
                <tr key={i}>
                  <td className="label">{r.name}</td>
                  <td className="num">{fmt.shortMoney(r.actual)}</td>
                  <td className="num muted">{fmt.pct(r.actual / F.byFund.expenseTotal.actual, 0)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1.5px solid var(--rule-strong)' }}>
                <td className="label" style={{ fontWeight: 600 }}>Total</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt.shortMoney(F.byFund.expenseTotal.actual)}</td>
                <td className="num" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Investments — asset-class composition (report donut) ── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">Investments<CardInfo>Asset-class composition as of {F.investments.asOf}. {fmt.shortMoney(F.investments.total)} total.</CardInfo></h3>
          </div>
        </div>
        <Donut
          segments={invSegments}
          size={200}
          thickness={26}
          format={fmt.shortMoney}
          centerLabel={fmt.shortMoney(F.investments.total)}
          centerSub="Total invested"
        />
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
              <th style={{ textAlign: 'right' }}>Awarded</th>
              <th style={{ textAlign: 'right' }}>Spent</th>
            </tr>
          </thead>
          <tbody>
            {F.grants.map(g => {
              const pct = g.spent / g.awarded;
              return (
                <tr key={g.id}>
                  <td className="label">{g.name}</td>
                  <td className="num">{fmt.shortMoney(g.awarded)}</td>
                  <td className="num">{fmt.shortMoney(g.spent)}</td>
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
