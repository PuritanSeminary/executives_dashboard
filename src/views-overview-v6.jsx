// views-overview-v6.jsx — strict Bauhaus overview.
// PageHead title plate + hero row (portrait + hero + summary) +
// numbered sections (KPI band, findings, departments, chart, gifts).

function lastN(arr, n) { return arr.slice(arr.length - n); }
function sumLast(arr, n) { return lastN(arr, n).reduce((s, v) => s + v, 0); }
function pctChange(curr, prev) { return prev ? (curr - prev) / prev : 0; }

function OverviewView({ rangeId, onDrill, user, onSnooze, notes = {}, onSetNote }) {
  const D = window.PRTS_DATA;
  const U = user || window.PRTS_USERS.neele;
  const months = D.months;

  // Derive ranked signals from rules (see src/signals.js)
  const signals = React.useMemo(() => window.getSignals ? window.getSignals(D) : [], [D]);
  const attention = signals.slice(0, 3);
  const flagged = signals.slice(3, 6);

  const opSpend = D.finance.operatingSpend;
  const opTtm = opSpend.slice(-13, -1).reduce((s, v) => s + v, 0);
  const opPrior = opSpend.slice(-25, -13).reduce((s, v) => s + v, 0);

  const donTotal = D.donations.total;
  const donTtm = donTotal.slice(-13, -1).reduce((s, v) => s + v, 0);
  const donPrior = donTotal.slice(-25, -13).reduce((s, v) => s + v, 0);

  const inv = D.finance.investments.history;
  const invCurr = inv[inv.length - 1];
  const invPrior = inv[inv.length - 13];

  const hc = D.hr.headcount;
  const hcCurr = hc[hc.length - 1];
  const hcPrior = hc[hc.length - 13];
  const hcTotal = hcCurr.ft + hcCurr.pt;
  const hcTotalPrior = hcPrior.ft + hcPrior.pt;

  const students = D.academic.totalStudents;
  const exceptions = D.finance.departments.filter(d => Math.abs(d.variance) > 0.10);

  // Time-of-day greeting — adjusts to the user's local hour.
  //   12:00 AM – 11:59 AM  → Good morning
  //   12:00 PM –  4:59 PM  → Good afternoon
  //    5:00 PM – 11:59 PM  → Good evening
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <>
      {/* Workspace header — their home */}
      <PageHead
        mark={<><span className="pagehead__mark-day">18</span><span className="pagehead__mark-sub">MAY</span><span className="pagehead__mark-sub">MON</span></>}
        eyebrow={<><strong>{greeting}, {U.short}.</strong> &nbsp;·&nbsp; Today, 18 May 2026 · figures refreshed overnight.</>}
        title={<>Where things stand.</>}
        sub={<>{attention.length} item{attention.length === 1 ? '' : 's'} flagged for your attention. Today: <em>{U.agenda.length} meetings</em>. Donations sit at a five-year high.</>}
        meta={[
          { label: 'As of', value: '30 Apr 2026' },
          { label: 'Last refresh', value: 'Today, 04:12 GMT' },
          { label: 'Sources', value: 'Edge · RE · Paycor · Populi' },
        ]}
      />

      {/* Hero row — today's agenda + headline metric + attention items */}
      <div className="hero-row">
        <HeroToday
          kicker={`Today · Mon 18 May · ${U.short}`}
          items={U.agenda}
        />
        <Hero
          label="Donations · trailing 12 mo"
          tag="Five-year high"
          value={fmt.shortMoney(donTtm)}
          delta={pctChange(donTtm, donPrior)}
          deltaLabel="vs. prior 12 mo"
          spark={lastN(donTotal, 60)}
          sparkColor="var(--red)"
          onClick={() => onDrill({ kind: 'donations' })}
        />
        <HeroSummary
          title="Needs your attention"
          rows={attention.map(s => ({
            id: s.id,
            tone: s.kind === 'bad' ? 'bad' : s.kind === 'good' ? 'good' : 'neutral',
            val: s.val,
            label: s.label,
            detail: s.detail,
          }))}
          onDismiss={onSnooze}
          emptyText="All clear — nothing to flag this week."
        />
      </div>

      {/* 01 — Vital signs */}
      <Section
        num={1}
        title="Vital signs"
        aside="Six leading indicators. Click any to descend into the trend."
      >
        <div className="kpis">
          <KPICard
            label="Operating · TTM"
            value={fmt.shortMoney(opTtm)}
            delta={pctChange(opTtm, opPrior)}
            deltaLabel="vs. prior 12 mo"
            caption={<>9 departments · <strong>{exceptions.length} outside ±10%</strong></>}
            spark={lastN(opSpend, 24)}
            sparkColor="var(--ink-3)"
            onClick={() => onDrill({ kind: 'op-spend' })}
          />
          <KPICard
            label="Investments"
            value={fmt.shortMoney(D.finance.investments.total)}
            delta={pctChange(invCurr, invPrior)}
            deltaLabel="vs. May '25"
            caption={<>Greenleaf Trust · <strong>62% equities</strong></>}
            spark={lastN(inv, 36)}
            sparkColor="var(--ink-3)"
            accent="info"
            onClick={() => onDrill({ kind: 'investments' })}
          />
          <KPICard
            label="Tuition yield"
            value="68.0%"
            delta={-0.025}
            deltaLabel="vs. AY '24–25"
            caption={<>Net $13.9k against $20.4k list · discount up <strong>2.5 pts</strong></>}
            spark={[0.753, 0.741, 0.720, 0.705, 0.690, 0.680]}
            sparkColor="var(--red)"
            accent="warn"
            onClick={() => onDrill({ kind: 'tuition' })}
          />
          <KPICard
            label="Personnel"
            value={hcTotal}
            delta={pctChange(hcTotal, hcTotalPrior)}
            deltaLabel="vs. May '25"
            caption={<>{hcCurr.ft} FT · {hcCurr.pt} PT · <strong>{D.hr.openPositions.length} open</strong></>}
            spark={lastN(hc.map(h => h.ft + h.pt), 24)}
            sparkColor="var(--ink-3)"
            onClick={() => onDrill({ kind: 'headcount' })}
          />
          <KPICard
            label="Enrolled · Spring"
            value={students}
            delta={pctChange(students, 162)}
            deltaLabel="vs. Spring '25"
            caption={<>78 MDiv · 31 MTS · 22 ThM · <strong>32 doctoral</strong></>}
            spark={[148, 156, 161, 164, 168, 172]}
            sparkColor="var(--ink-3)"
            onClick={() => onDrill({ kind: 'enrollment' })}
          />
          <KPICard
            label="Endowment YTD"
            value="+6.2%"
            delta={0.012}
            deltaLabel="vs. benchmark"
            caption={<>$22.84M total · <strong>+12 bps</strong> over benchmark</>}
            spark={lastN(inv, 12).map(v => v / inv[inv.length - 13])}
            sparkColor="var(--pos)"
            accent="pos"
            onClick={() => onDrill({ kind: 'investments' })}
          />
        </div>
      </Section>

      {/* 02 — Flagged this week (derived rules in src/signals.js) */}
      <Section
        num={2}
        title="Flagged this week"
        aside={<>Surfaced from {signals.length} active signals. Each card cites the rule that triggered it.</>}
      >
        <div className="findings">
          {flagged.length > 0 ? flagged.map((s, i) => (
            <Finding
              key={s.id}
              num={['i','ii','iii','iv'][i] || String(i + 1)}
              kicker={s.rule}
              cite={{ source: s.source, lead: '—' }}
              onDismiss={() => onSnooze && onSnooze(s.id)}
              note={notes[s.id]}
              onNoteChange={(text) => onSetNote && onSetNote(s.id, text)}
            >
              <strong>{s.label}.</strong> {s.detail} {s.kind === 'bad' && <em>Recommend review at the next committee.</em>}
            </Finding>
          )) : (
            <Finding num="i" kicker="All clear" cite={{ source: 'Signal engine', lead: 'No rules tripped' }}>
              No flagged items this week. The data is within normal bands across every system.
            </Finding>
          )}
        </div>
      </Section>

      {/* 03 — Departments */}
      <Section
        num={3}
        title="Departments"
        aside="YTD spend against approved budgets, ordered by absolute variance."
      >
        <div className="block">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>№</th>
                <th>Department</th>
                <th>Lead</th>
                <th style={{ width: 110 }}>Shape</th>
                <th style={{ textAlign: 'right' }}>YTD</th>
                <th style={{ textAlign: 'right' }}>Budget</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {[...D.finance.departments].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).map((d, i) => {
                const col = d.variance > 0.10 ? 'var(--red)' : d.variance < -0.10 ? 'var(--warn)' : 'var(--ink-4)';
                return (
                  <tr key={d.id} onClick={() => onDrill({ kind: 'department', deptId: d.id })}>
                    <td className="tbl__idx">{String(i + 1).padStart(2, '0')}</td>
                    <td className="label">{d.name}</td>
                    <td className="muted">{d.head}</td>
                    <td>
                      <svg viewBox="0 0 100 24" width="100" height="24" style={{ display: 'block' }}>
                        <polyline
                          points={d.series.slice(-24).map((v, i, arr) => {
                            const max = Math.max(...arr), min = Math.min(...arr) * 0.9;
                            const x = (i / (arr.length - 1)) * 98 + 1;
                            const y = 22 - ((v - min) / (max - min)) * 20;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          }).join(' ')}
                          fill="none" stroke={col} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
                        />
                      </svg>
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
      </Section>

      {/* 04 — Five-year shape */}
      <Section
        num={4}
        title="Five-year shape"
        aside="Monthly operating spend against donations. December pulses visible."
      >
        <div className="block" style={{ padding: 22 }}>
          <LineChart
            variant="line"
            series={[
              { name: 'Operating', data: opSpend, color: 'var(--ink)' },
              { name: 'Donations', data: donTotal, color: 'var(--red)' },
            ]}
            labels={months.map(m => m.label)}
            height={260}
            showLegend={true}
          />
        </div>
      </Section>

      {/* 05 — Recent gifts */}
      <Section
        num={5}
        title="Recent gifts"
        aside="Last ten · all sources · anonymous donors counted but unattributed."
      >
        <div className="block">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>№</th>
                <th style={{ width: 80 }}>Date</th>
                <th>Donor</th>
                <th>Fund</th>
                <th>Officer</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {D.donations.recentGifts.slice(0, 10).map((g, i) => (
                <tr key={i}>
                  <td className="tbl__idx">{String(i + 1).padStart(2, '0')}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{g.date}</td>
                  <td className="label">{g.donor}</td>
                  <td className="muted">{g.fund}</td>
                  <td className="muted">{g.fundraiser}</td>
                  <td className="num">${g.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

const COLOR_TOKENS = {
  ink:     'var(--ink-2)',
  oxblood: 'var(--red)',
  navy:    'var(--blue)',
  moss:    'var(--pos)',
  gold:    'var(--gold)',
  brick:   'var(--red)',
};

Object.assign(window, { OverviewView, COLOR_TOKENS, lastN, sumLast, pctChange });
