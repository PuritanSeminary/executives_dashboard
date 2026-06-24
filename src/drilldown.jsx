// drilldown.jsx — Slide-in detail overlay for any metric.

const DRILL_CONFIG = {
  'op-spend': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Operating spend, monthly',
      kicker: 'Financial · Trailing five years',
      source: "Financial Edge NXT · last sync May 31, 2026",
      series: [{ name: 'Operating spend', data: D.finance.operatingSpend, color: 'var(--ink-2)' }],
      labels: D.months.map(m => m.label),
      analysis: <>
        Run-rate trends materially with the academic calendar — heavy summer spend on facilities, light January on instruction. The November '24 spike traced to the boiler replacement in Facilities; February '26 reflects the SIS migration capitalization. <strong>Year-over-year base rate</strong> is +4.6%, in line with merit and benefit drift; the variance flagged above stems from the two acknowledged events.
      </>,
      format: window.fmt.shortMoney,
    };
  },
  'donations': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Donations, monthly',
      kicker: 'Advancement · Trailing five years',
      source: "Raiser's Edge NXT · last sync May 31, 2026",
      series: [{ name: 'Total donations', data: D.donations.total, color: 'var(--red)' }],
      labels: D.months.map(m => m.label),
      analysis: <>
        The December year-end pulse is the single largest signal in the series — typically 2.4× the trailing-month average. <strong>Compound monthly growth</strong> across the 60-month window is 0.7%, or roughly 8.7% annualized. The Netherlands cohort now represents 11.2% of dollars, up from 6.4% in 2021; this reflects the international travel program led from Advancement.
      </>,
      format: window.fmt.shortMoney,
    };
  },
  'investments': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Investments at Greenleaf Trust',
      kicker: 'Five-year total balance',
      source: 'Greenleaf Trust · custodial reporting · monthly',
      series: [{ name: 'Total invested', data: D.finance.investments.history, color: 'var(--blue)' }],
      labels: D.months.map(m => m.label),
      analysis: <>
        The portfolio drew down 7% in Q4 2022 alongside the broader market, recovering by July 2023. <strong>Five-year CAGR</strong> is 5.9% net of fees, slightly under the policy benchmark of 6.5%. Equity weight has trended modestly higher across the period; cash remains at policy minimum.
      </>,
      format: window.fmt.shortMoney,
    };
  },
  'headcount': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Personnel headcount',
      kicker: 'Five-year monthly census',
      source: 'Paycor · pay-period basis',
      series: [
        { name: 'Full-time', data: D.hr.headcount.map(h => h.ft), color: 'var(--ink-2)' },
        { name: 'Part-time', data: D.hr.headcount.map(h => h.pt), color: 'var(--gold)' },
        { name: 'Student',   data: D.hr.headcount.map(h => h.student), color: 'var(--pos)' },
      ],
      labels: D.months.map(m => m.label),
      analysis: <>
        Full-time grew from 32 to 39 over the period — a 22% increase reflecting four faculty additions and three operations roles. Student employment shows the expected academic-year sawtooth; summer floor is approximately 8. <strong>Voluntary turnover</strong> stayed below 6% throughout, well under the 11% reported by ATS peer benchmarks.
      </>,
      format: window.fmt.num,
    };
  },
  'enrollment': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Enrolled students',
      kicker: 'Academic · semester census',
      source: 'Populi · per semester',
      series: [{ name: 'Total enrolled', data: [142, 148, 156, 161, 164, 168, 172], color: 'var(--pos)' }],
      labels: ['F21', 'S22', 'F22', 'S23', 'F24', 'S25', 'S26'],
      analysis: <>
        Three consecutive years of growth, weighted toward Master's-level programs. MDiv remains the largest cohort and continues to grow; admissions committee has begun rolling cycles to manage the pipeline. <strong>International share</strong> climbed from 12% to 18%, with the Brazilian and Indonesian cohorts driving most of the growth.
      </>,
      format: window.fmt.num,
    };
  },
  'tuition': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Tuition realization',
      kicker: 'Financial · Annual',
      source: 'Financial Edge NXT · Populi blended',
      series: [
        { name: 'List tuition',  data: D.finance.tuition.realization.map(r => r.list / 1000), color: 'var(--ink-3)' },
        { name: 'Net per student', data: D.finance.tuition.realization.map(r => r.net / 1000), color: 'var(--red)' },
      ],
      labels: D.finance.tuition.realization.map(r => `'${String(r.year).slice(2)}`),
      analysis: <>
        List tuition climbed from $17.4k to $20.4k over the period (+17%); net realization climbed from $13.1k to $13.9k (+6%). The discount rate is now 32%, up from 24.7% in 2021. <strong>Scholarship leverage</strong> has been a deliberate strategy to maintain accessibility for international students and second-career callings; the trade-off is a flattening top-line per-student.
      </>,
      format: (v) => '$' + v.toFixed(1) + 'k',
    };
  },
  'department': (params) => {
    const D = window.PRTS_DATA;
    const dept = D.finance.departments.find(d => d.id === params.deptId);
    return {
      title: dept.name + ' · spending',
      kicker: `Department · led by ${dept.head}`,
      source: 'Financial Edge NXT',
      series: [
        { name: 'Monthly spend', data: dept.series, color: 'var(--ink-2)' },
        { name: 'Pacing budget', data: Array(dept.series.length).fill(dept.budget / 12), color: 'var(--gold)' },
      ],
      labels: D.months.map(m => m.label),
      analysis: <>
        Year-to-date spend is <strong>{window.fmt.shortMoney(dept.ytdActual)}</strong> against a year-to-date budget of <strong>{window.fmt.shortMoney(dept.ytdBudget)}</strong> (the annual budget split evenly across the {window.PRTS_DATA.period.ytdMonths} months elapsed), a variance of <strong>{window.fmt.signedPct(dept.variance)}</strong>. {Math.abs(dept.variance) > 0.10 ? 'This sits outside the ±10% threshold — recommend reviewing in the next finance committee.' : 'Within tolerance; no action required.'}
      </>,
      format: window.fmt.shortMoney,
    };
  },

  // Signal detail — opens a flagged item with full context + notes
  'signal-detail': (params) => {
    const s = params.signal;
    return {
      kind: 'signal-detail',
      title: s.label,
      kicker: s.kind === 'bad' ? 'Flagged · needs review' : s.kind === 'good' ? 'Positive signal' : 'For your awareness',
      source: s.source,
      signal: s,
    };
  },

  // Gift detail — opens a recent gift with donor + fund context
  'gift-detail': (params) => {
    const g = params.gift;
    return {
      kind: 'gift-detail',
      title: g.donor,
      kicker: g.fund,
      source: "Raiser's Edge NXT · received " + g.date + ", 2026",
      gift: g,
    };
  },

  // Agenda detail — opens a calendar item with context
  'agenda-detail': (params) => {
    return {
      kind: 'agenda-detail',
      title: params.item.label,
      kicker: 'Today · ' + params.item.time + ' · ' + (params.user?.short || ''),
      source: 'Calendar',
      item: params.item,
      user: params.user,
    };
  },
};

function Drilldown({ payload, onClose, sharedNotes, onPostSharedNote, privateNotes, onSetPrivateNote, user }) {
  const config = DRILL_CONFIG[payload.kind](payload);
  const [chartKind, setChartKind] = React.useState('line');
  const [range, setRange] = React.useState('5y');

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Dispatch on kind — signal/gift/agenda views render their own body
  const body = (() => {
    if (config.kind === 'signal-detail') {
      return <SignalDetailBody
        signal={config.signal}
        user={user}
        sharedNotes={sharedNotes}
        onPostSharedNote={onPostSharedNote}
        privateNote={privateNotes && privateNotes[config.signal.id]}
        onSetPrivateNote={(text) => onSetPrivateNote && onSetPrivateNote(config.signal.id, text)}
      />;
    }
    if (config.kind === 'gift-detail') return <GiftDetailBody gift={config.gift} />;
    if (config.kind === 'agenda-detail') return <AgendaDetailBody item={config.item} user={config.user} />;
    return <ChartDetailBody config={config} chartKind={chartKind} setChartKind={setChartKind} range={range} setRange={setRange} />;
  })();

  return (
    <>
      <div className="drill__backdrop" onClick={onClose} />
      <div className="drill" role="dialog" aria-modal="true">
        <div className="drill__hd">
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--red)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
              {config.kicker}
            </div>
            <h2 style={{ fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: 'var(--ink)', lineHeight: 1.1 }}>
              {config.title}
            </h2>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em', marginTop: 8, textTransform: 'uppercase', fontWeight: 600 }}>
              {config.source}
            </div>
          </div>
          <button className="drill__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drill__body">
          {body}
        </div>
      </div>
    </>
  );
}

// ── Chart detail body (existing behavior) ────────────
function ChartDetailBody({ config, chartKind, setChartKind, range, setRange }) {
  const isMonthly = config.labels.length >= 60;
  // Drop the partial current month from monthly series unless the range is MTD,
  // so the trend doesn't dip into a half-posted month.
  const baseLabels = (isMonthly && range !== 'mtd') ? config.labels.slice(0, -1) : config.labels;
  const baseSeries = (isMonthly && range !== 'mtd')
    ? config.series.map(s => ({ ...s, data: s.data.slice(0, -1) }))
    : config.series;
  const totalMonths = baseLabels.length;
  const [from, to] = totalMonths >= 59
    ? rangeSlice(range, totalMonths)
    : [0, totalMonths];

  const slicedLabels = baseLabels.slice(from, to);
  const slicedSeries = baseSeries.map(s => ({ ...s, data: s.data.slice(from, to) }));

  return (
    <>
      <div className="drill__controls" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {totalMonths >= 60 && <Range value={range} onChange={setRange} />}
        <div className="chart-toggle">
          <button aria-pressed={chartKind === 'line'} onClick={() => setChartKind('line')}>Line</button>
          <button aria-pressed={chartKind === 'area'} onClick={() => setChartKind('area')}>Area</button>
          <button aria-pressed={chartKind === 'bar'} onClick={() => setChartKind('bar')}>Bar</button>
        </div>
        <div style={{ flex: 1 }} />
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.06em', fontWeight: 500 }}>
          {slicedLabels.length} months in view
        </div>
      </div>

      <div className="block" style={{ padding: 22 }}>
        <LineChart
          variant={chartKind}
          series={slicedSeries}
          labels={slicedLabels}
          height={320}
          format={config.format}
          formatFull={config.format}
          showLegend={slicedSeries.length > 1}
        />
      </div>

      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Analysis</h3>
            <div className="block__sub">Computed across the period in view</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px', fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty', maxWidth: '64ch' }}>
          {config.analysis}
        </div>
      </div>

      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Period statistics</h3>
            <div className="block__sub">Across the {slicedLabels.length}-month range currently displayed</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px' }}>
        <div className="grid grid--4">
          {slicedSeries.map((s, i) => {
            const data = s.data;
            const max = Math.max(...data);
            const min = Math.min(...data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            const first = data[0], last = data[data.length - 1];
            const change = first ? (last - first) / first : 0;
            return (
              <React.Fragment key={i}>
                {slicedSeries.length > 1 && (
                  <div className="span-4" style={{ paddingBottom: 6, borderBottom: '1px solid var(--rule)', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    {s.name}
                  </div>
                )}
                <Stat label="High" value={config.format(max)} />
                <Stat label="Low" value={config.format(min)} />
                <Stat label="Average" value={config.format(avg)} />
                <Stat label="Change" value={fmt.signedPct(change)} color={change > 0 ? 'var(--pos)' : change < 0 ? 'var(--red)' : 'var(--ink-3)'} />
              </React.Fragment>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}

// ── Signal detail body (flagged item full view) ──────
function SignalDetailBody({ signal, user, sharedNotes, onPostSharedNote, privateNote, onSetPrivateNote }) {
  const sharedNote = sharedNotes && sharedNotes[signal.id];
  const [privateDraft, setPrivateDraft] = React.useState(privateNote || '');
  const [shareDraft, setShareDraft] = React.useState('');
  const [showShareForm, setShowShareForm] = React.useState(false);
  React.useEffect(() => { setPrivateDraft(privateNote || ''); }, [privateNote]);

  const postShare = () => {
    if (!shareDraft.trim() || !onPostSharedNote) return;
    onPostSharedNote(signal.id, shareDraft.trim());
    setShareDraft('');
    setShowShareForm(false);
  };
  const deleteShare = () => onPostSharedNote && onPostSharedNote(signal.id, '');

  const toneColor = signal.kind === 'bad' ? 'var(--red)' : signal.kind === 'good' ? 'var(--pos)' : 'var(--ink-3)';
  const toneSoft = signal.kind === 'bad' ? 'var(--red-soft)' : signal.kind === 'good' ? 'var(--pos-soft)' : 'var(--vellum)';

  return (
    <>
      {/* The headline metric for this signal */}
      <div className="block" style={{ padding: '20px 24px', display: 'flex', alignItems: 'baseline', gap: 22, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: 48, fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1,
          color: toneColor, fontVariantNumeric: 'tabular-nums',
        }}>{signal.val}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 4 }}>
            {signal.kind === 'bad' ? 'Variance / concern' : signal.kind === 'good' ? 'Positive movement' : 'Notable change'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.008em', lineHeight: 1.4 }}>
            {signal.detail}
          </div>
        </div>
      </div>

      {/* The rule chain */}
      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Why this surfaced</h3>
            <div className="block__sub">The rule that triggered, in plain English</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', minWidth: 60 }}>Rule</div>
            <div style={{ flex: 1, color: 'var(--ink)', fontWeight: 500 }}>{signal.rule}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', minWidth: 60 }}>Source</div>
            <div style={{ flex: 1, color: 'var(--ink-2)' }}>{signal.source}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', minWidth: 60 }}>Severity</div>
            <div style={{ flex: 1, color: 'var(--ink-2)', fontFamily: 'var(--mono)', fontSize: 12.5 }}>{Math.round(signal.severity)}/30</div>
          </div>
        </div>
      </div>

      {/* Shared note — visible to the other Dr. */}
      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Shared discussion</h3>
            <div className="block__sub">Visible to {user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}</div>
          </div>
          {!sharedNote && !showShareForm && (
            <button
              className="topbar__btn topbar__btn--external"
              onClick={() => setShowShareForm(true)}
              style={{ padding: '6px 12px', fontSize: 10.5 }}
            >
              + Send a note to {user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}
            </button>
          )}
        </div>
        <div style={{ padding: '18px 24px' }}>
          {sharedNote ? (
            <div style={{ background: 'var(--vellum)', border: '1px solid var(--rule)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {sharedNote.author}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                  {new Date(sharedNote.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink)', textWrap: 'pretty' }}>
                {sharedNote.text}
              </div>
              {sharedNote.authorId === user?.id ? (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShareDraft(sharedNote.text); setShowShareForm(true); onPostSharedNote && onPostSharedNote(signal.id, ''); }}
                    style={{ background: 'transparent', border: 0, fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={deleteShare}
                    style={{ background: 'transparent', border: 0, fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={deleteShare}
                    style={{
                      background: 'var(--pos-soft)',
                      border: '1px solid var(--pos)',
                      color: 'var(--pos)',
                      fontFamily: 'var(--sans)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 11px',
                      cursor: 'pointer',
                      borderRadius: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Mark as resolved
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                    Removes for both you and {sharedNote.author}
                  </span>
                </div>
              )}
            </div>
          ) : showShareForm ? (
            <div>
              <textarea
                value={shareDraft}
                onChange={(e) => setShareDraft(e.target.value)}
                placeholder={`Share your thoughts with ${user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}...`}
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px',
                  fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.5,
                  border: '1px solid var(--rule)', background: 'var(--paper)',
                  color: 'var(--ink)', outline: 'none', resize: 'vertical',
                  borderRadius: 0,
                }}
                autoFocus
              />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShareDraft(''); setShowShareForm(false); }}
                  className="topbar__btn"
                  style={{ padding: '6px 14px', fontSize: 10.5 }}>
                  Cancel
                </button>
                <button onClick={postShare}
                  disabled={!shareDraft.trim()}
                  className="topbar__btn topbar__btn--primary"
                  style={{ padding: '6px 14px', fontSize: 10.5, opacity: shareDraft.trim() ? 1 : 0.4 }}>
                  Send to {user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--ink-4)', fontSize: 13.5, fontStyle: 'italic', padding: '6px 0' }}>
              No shared note yet. Send one to start a conversation with {user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}.
            </div>
          )}
        </div>
      </div>

      {/* Private note */}
      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Your private note</h3>
            <div className="block__sub">Only you can see this</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px' }}>
          <textarea
            value={privateDraft}
            onChange={(e) => setPrivateDraft(e.target.value)}
            onBlur={() => onSetPrivateNote && onSetPrivateNote(privateDraft.trim())}
            placeholder="Reminders, context, follow-ups…"
            rows={5}
            style={{
              width: '100%', padding: '12px 14px',
              fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.55,
              border: '1px solid var(--rule)', background: 'var(--vellum)',
              color: 'var(--ink)', outline: 'none', resize: 'vertical',
              borderRadius: 0,
            }}
          />
          {privateNote && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--sans)', letterSpacing: '0.04em' }}>
              Saved · auto-saved on blur
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Gift detail body ─────────────────────────────────
function GiftDetailBody({ gift }) {
  const D = window.PRTS_DATA;
  // Find other recent gifts to the same fund
  const sameFund = D.donations.recentGifts.filter(g => g.fund === gift.fund && g !== gift).slice(0, 5);
  const fundEntry = D.donations.funds.find(f => f.name === gift.fund || f.name.includes(gift.fund.split(' ')[0]));
  const isAnonymous = gift.donor.toLowerCase().includes('anonymous');
  return (
    <>
      <div className="block" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
          <div style={{
            fontSize: 48, fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1,
            color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
          }}>${gift.amount.toLocaleString()}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 4 }}>
              Gift amount · {gift.date}, 2026
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              {isAnonymous ? <>An anonymous donor contributed to <strong>{gift.fund}</strong>. Recorded by <strong>{gift.fundraiser}</strong>.</>
                : <>Contribution from <strong>{gift.donor}</strong> to <strong>{gift.fund}</strong>, recorded by <strong>{gift.fundraiser}</strong>.</>}
            </div>
          </div>
        </div>
      </div>

      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Donor</h3>
            <div className="block__sub">{isAnonymous ? 'Anonymous — not displayed in advancement reports' : 'From the constituent file'}</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 18px', fontSize: 13.5, lineHeight: 1.5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>Donor name</div>
          <div style={{ fontWeight: 500 }}>{gift.donor}</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>Fund</div>
          <div>{gift.fund}</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>Officer</div>
          <div style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>{gift.fundraiser}</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>Date received</div>
          <div className="mono" style={{ fontSize: 12.5 }}>{gift.date}, 2026</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>Status</div>
          <div><span className="tag tag--ok"><i className="tag__dot" />Posted</span></div>
        </div>
      </div>

      {fundEntry && (
        <div className="block">
          <div className="block__hd">
            <div>
              <h3 className="block__title">{gift.fund}</h3>
              <div className="block__sub">YTD progress for this fund</div>
            </div>
          </div>
          <div style={{ padding: '18px 24px' }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {window.fmt.shortMoney(fundEntry.ytd)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
              Trailing 12 months across <strong style={{ color: 'var(--ink-2)' }}>this fund</strong>
            </div>
          </div>
        </div>
      )}

      {sameFund.length > 0 && (
        <div className="block">
          <div className="block__hd">
            <div>
              <h3 className="block__title">Other recent gifts to this fund</h3>
              <div className="block__sub">From the last 30 days</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Date</th>
                <th>Donor</th>
                <th>Officer</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sameFund.map((g, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{g.date}</td>
                  <td className="label">{g.donor}</td>
                  <td className="muted">{g.fundraiser}</td>
                  <td className="num">${g.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Agenda detail body ───────────────────────────────
function AgendaDetailBody({ item, user }) {
  return (
    <>
      <div className="block" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 38, fontWeight: 600, color: 'var(--red)',
            letterSpacing: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>{item.time}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 4 }}>
              {(() => {
                const d = new Date();
                const wk = d.toLocaleDateString('en-US', { weekday: 'short' });
                const day = d.toLocaleDateString('en-US', { day: 'numeric' });
                const mo = d.toLocaleDateString('en-US', { month: 'short' });
                return `Today · ${wk} ${day} ${mo}`;
              })()}
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.012em', lineHeight: 1.2 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        </div>
      </div>

      <div className="block">
        <div className="block__hd">
          <div>
            <h3 className="block__title">Meeting context</h3>
            <div className="block__sub">From the calendar invite</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>
          This panel would pull from the connected calendar in production. Right now the details are mocked.
          <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            <li style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)' }}>Time</span>
              <span className="mono" style={{ fontSize: 13 }}>{item.time}</span>
            </li>
            <li style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)' }}>Owner</span>
              <span>{user?.name || ''}</span>
            </li>
            <li style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)' }}>Notes</span>
              <span>{item.detail}</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 600, color: color || 'var(--ink)', letterSpacing: '-0.018em', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

Object.assign(window, { Drilldown });
