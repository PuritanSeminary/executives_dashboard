// drilldown.jsx — Slide-in detail overlay for any metric.

const DRILL_CONFIG = {
  'op-spend': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Operating spend, monthly',
      kicker: 'Financial · Trailing five years',
      source: "Financial Edge NXT · last sync Apr 30, 2026",
      series: [{ name: 'Operating spend', data: D.finance.operatingSpend, color: 'var(--ink-2)' }],
      labels: D.months.map(m => m.label),
      analysis: <>
        Run-rate trends materially with the academic calendar — heavy summer spend on facilities, light January on instruction. The November '24 spike traced to the boiler replacement at Hekman; February '26 reflects the SIS migration capitalization. <strong>Year-over-year base rate</strong> is +4.6%, in line with merit and benefit drift; the variance flagged above stems from the two acknowledged events.
      </>,
      format: window.fmt.shortMoney,
    };
  },
  'donations': () => {
    const D = window.PRTS_DATA;
    return {
      title: 'Donations, monthly',
      kicker: 'Advancement · Trailing five years',
      source: "Raiser's Edge NXT · last sync Apr 30, 2026",
      series: [{ name: 'Total donations', data: D.donations.total, color: 'var(--oxblood)' }],
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
      series: [{ name: 'Total invested', data: D.finance.investments.history, color: 'var(--navy)' }],
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
        { name: 'Student',   data: D.hr.headcount.map(h => h.student), color: 'var(--moss)' },
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
      series: [{ name: 'Total enrolled', data: [142, 148, 156, 161, 164, 168, 172], color: 'var(--moss)' }],
      labels: ['F21', 'S22', 'F22', 'S23', 'F24', 'S25', 'S26'],
      analysis: <>
        Three consecutive years of growth, weighted toward Master's-level programs. MDiv is now within five seats of program capacity; admissions committee has begun rolling cycles to manage the pipeline. <strong>International share</strong> climbed from 12% to 18%, with the Brazilian and Indonesian cohorts driving most of the growth.
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
        { name: 'Net per student', data: D.finance.tuition.realization.map(r => r.net / 1000), color: 'var(--oxblood)' },
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
        Year-to-date spend is <strong>{window.fmt.shortMoney(dept.ytdActual)}</strong> against an annual budget of <strong>{window.fmt.shortMoney(dept.ytdBudget)}</strong>, a variance of <strong>{window.fmt.signedPct(dept.variance)}</strong>. {Math.abs(dept.variance) > 0.10 ? 'This sits outside the ±10% threshold — recommend reviewing in the next finance committee.' : 'Within tolerance; no action required.'}
      </>,
      format: window.fmt.shortMoney,
    };
  },
};

function Drilldown({ payload, onClose }) {
  const config = DRILL_CONFIG[payload.kind](payload);
  const [chartKind, setChartKind] = React.useState('line');
  const [range, setRange] = React.useState('5y');

  const totalMonths = config.labels.length;
  const [from, to] = totalMonths >= 60
    ? rangeSlice(range, totalMonths)
    : [0, totalMonths];

  const slicedLabels = config.labels.slice(from, to);
  const slicedSeries = config.series.map(s => ({ ...s, data: s.data.slice(from, to) }));

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <>
      <div className="drill__backdrop" onClick={onClose} />
      <div className="drill" role="dialog" aria-modal="true">
        <div className="drill__hd">
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--oxblood)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>
              {config.kicker}
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.012em', margin: 0, color: 'var(--ink)' }}>
              {config.title}
            </h2>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.06em', marginTop: 8, textTransform: 'uppercase' }}>
              {config.source}
            </div>
          </div>
          <button className="drill__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drill__body">
          <div className="drill__controls">
            {totalMonths >= 60 && (
              <DateRange value={range} onChange={setRange} />
            )}
            <div className="chart-toggle">
              <button aria-pressed={chartKind === 'line'} onClick={() => setChartKind('line')}>Line</button>
              <button aria-pressed={chartKind === 'area'} onClick={() => setChartKind('area')}>Area</button>
              <button aria-pressed={chartKind === 'bar'} onClick={() => setChartKind('bar')}>Bar</button>
            </div>
            <div style={{ flex: 1 }} />
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
              {slicedLabels.length} months in view
            </div>
          </div>

          <div className="card">
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

          <div className="card card--raised">
            <div className="card__hd">
              <div>
                <h3 className="card__title">Analysis</h3>
                <div className="card__sub mono" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
                  Computed across the period in view
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty', maxWidth: '64ch' }}>
              {config.analysis}
            </div>
          </div>

          <div className="card">
            <div className="card__hd">
              <div>
                <h3 className="card__title">Period statistics</h3>
                <div className="card__sub">Across the {slicedLabels.length}-month range currently displayed</div>
              </div>
            </div>
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
                      <div className="span-4" style={{ paddingBottom: 6, borderBottom: '1px solid var(--rule)', fontFamily: 'var(--serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                        {s.name}
                      </div>
                    )}
                    <Stat label="High" value={config.format(max)} />
                    <Stat label="Low" value={config.format(min)} />
                    <Stat label="Average" value={config.format(avg)} />
                    <Stat label="Change" value={fmt.signedPct(change)} color={change > 0 ? 'var(--moss)' : change < 0 ? 'var(--brick)' : 'var(--ink-3)'} />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, color: color || 'var(--ink)', letterSpacing: '-0.012em', marginTop: 4 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { Drilldown });
