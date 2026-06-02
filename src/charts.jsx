// charts.jsx — Hand-crafted SVG charts for the dashboard.
// Editorial style: thin rules, no axis chrome unless needed, tabular numbers
// rendered with mono type for hover readouts.

const fmt = {
  shortMoney(n) {
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
    return '$' + Math.round(n);
  },
  money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  },
  num(n, d = 0) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  pct(n, d = 1) {
    return (n * 100).toFixed(d) + '%';
  },
  signedPct(n, d = 1) {
    const s = n >= 0 ? '+' : '−';
    return s + Math.abs(n * 100).toFixed(d) + '%';
  },
};
window.fmt = fmt;

// Quick "nice" number for axes
function niceMax(max) {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  let nice;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 2.5) nice = 2.5;
  else if (f <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

// Pick ~5 readable y-axis ticks
function yTicks(max, n = 4) {
  const step = max / n;
  const niceStep = niceMax(step);
  const out = [];
  for (let v = 0; v <= max + 0.0001; v += niceStep) out.push(v);
  return out;
}

// ───────────────────────────────────────────────────────────────────────
// Sparkline — tiny inline trend chart for KPI cards
// ───────────────────────────────────────────────────────────────────────
function Sparkline({ data, color = 'currentColor', height = 38, fill = true, dot = true }) {
  const W = 200, H = height;
  const pad = 2;
  const max = Math.max(...data) * 1.05;
  const min = Math.min(...data) * 0.95;
  const range = max - min || 1;
  const xs = (i) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const ys = (v) => H - pad - ((v - min) / range) * (H - pad * 2);
  const points = data.map((v, i) => `${xs(i).toFixed(2)},${ys(v).toFixed(2)}`).join(' ');
  const area = `M ${xs(0)},${H - pad} L ${points.split(' ').join(' L ')} L ${xs(data.length - 1)},${H - pad} Z`;
  const lastIdx = data.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
      {fill && <path d={area} fill={color} opacity="0.08" />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {dot && (
        <circle cx={xs(lastIdx)} cy={ys(data[lastIdx])} r="2.5" fill={color} />
      )}
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// LineChart — main trend chart, with hover crosshair + tooltip
// supports multiple series
// ───────────────────────────────────────────────────────────────────────
function LineChart({
  series, // [{ name, data: [v…], color }]
  labels,
  height = 240,
  format = fmt.shortMoney,
  formatFull = fmt.money,
  showAxis = true,
  showLegend = true,
  variant = 'line', // 'line' | 'area' | 'bar'
  yMin = null,
  highlight = null, // optional indices to highlight (e.g. exceptions)
}) {
  const wrapRef = React.useRef(null);
  const [width, setWidth] = React.useState(640);
  const [hover, setHover] = React.useState(null);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (wrapRef.current) setWidth(wrapRef.current.clientWidth);
    });
    ro.observe(wrapRef.current);
    setWidth(wrapRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(width, 200);
  const H = height;
  const padL = showAxis ? 48 : 8;
  const padR = 12;
  const padT = 14;
  const padB = showAxis ? 28 : 8;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const allValues = series.flatMap(s => s.data);
  const dataMax = Math.max(...allValues);
  const dataMin = Math.min(...allValues);
  const max = niceMax(dataMax);
  const min = yMin !== null ? yMin : Math.min(0, dataMin);
  const range = max - min || 1;

  const n = labels.length;
  const xs = (i) => padL + (i / (n - 1)) * innerW;
  const ys = (v) => padT + (1 - (v - min) / range) * innerH;

  // For bar charts
  const barW = (innerW / n) * 0.66;

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const t = (x - padL) / innerW;
    const idx = Math.round(Math.max(0, Math.min(1, t)) * (n - 1));
    setHover(idx);
  };
  const handleLeave = () => setHover(null);

  const ticks = yTicks(max, 4);

  return (
    <div className="chart" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={handleMove} onMouseLeave={handleLeave}>
        {/* Y grid */}
        {showAxis && ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={ys(t)} y2={ys(t)} stroke="var(--rule)" strokeDasharray={t === 0 ? '' : '2 3'} />
            <text x={padL - 8} y={ys(t) + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-4)" style={{ letterSpacing: '0.04em' }}>
              {format(t)}
            </text>
          </g>
        ))}

        {/* X labels — sparse */}
        {showAxis && labels.map((l, i) => {
          const step = Math.max(1, Math.ceil(n / 8));
          if (i % step !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={xs(i)} y={H - 8} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-4)" style={{ letterSpacing: '0.04em' }}>
              {l}
            </text>
          );
        })}

        {/* Series */}
        {series.map((s, si) => {
          const color = s.color || 'var(--ink-2)';
          if (variant === 'bar') {
            return (
              <g key={si}>
                {s.data.map((v, i) => {
                  const isHi = highlight && highlight.includes(i);
                  return (
                    <rect
                      key={i}
                      x={xs(i) - barW / 2}
                      y={ys(Math.max(v, 0))}
                      width={barW / series.length}
                      height={Math.max(1, Math.abs(ys(v) - ys(0)))}
                      transform={`translate(${(si - (series.length - 1) / 2) * (barW / series.length)}, 0)`}
                      fill={isHi ? 'var(--brick)' : color}
                      opacity={hover != null && hover !== i ? 0.4 : 1}
                    />
                  );
                })}
              </g>
            );
          }
          // Line / area
          const pts = s.data.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
          const areaD = `M ${xs(0)},${ys(min)} L ${pts.split(' ').join(' L ')} L ${xs(n - 1)},${ys(min)} Z`;
          return (
            <g key={si}>
              {variant === 'area' && <path d={areaD} fill={color} opacity="0.10" />}
              <polyline points={pts} fill="none" stroke={color} strokeWidth={s.dashed ? 1.2 : 1.6} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
              {/* Endpoint dot — open circle when the last point is partial (MTD) */}
              {!s.dashed && s.mtdLast && (
                <>
                  <circle cx={xs(n - 1)} cy={ys(s.data[n - 1])} r="4" fill="var(--paper)" stroke={color} strokeWidth="1.6" />
                  <text x={xs(n - 1) + 8} y={ys(s.data[n - 1]) + 3} fontSize="9.5" fontFamily="var(--sans)" fill="var(--ink-4)" style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                    MTD
                  </text>
                </>
              )}
              {!s.dashed && !s.mtdLast && (
                <circle cx={xs(n - 1)} cy={ys(s.data[n - 1])} r="3" fill={color} />
              )}
              <circle cx={xs(n - 1)} cy={ys(s.data[n - 1])} r="6" fill={color} opacity="0.18" />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hover !== null && (
          <g>
            <line x1={xs(hover)} x2={xs(hover)} y1={padT} y2={H - padB} stroke="var(--ink-3)" strokeDasharray="2 2" opacity="0.6" />
            {series.map((s, si) => (
              <circle key={si} cx={xs(hover)} cy={ys(s.data[hover])} r="3.5" fill={s.color || 'var(--ink-2)'} stroke="var(--bg)" strokeWidth="1.5" />
            ))}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hover !== null && (() => {
        const left = (xs(hover) / W) * 100;
        return (
          <div className="chart__tip" style={{ left: `${left}%`, top: `${(padT / H) * 100}%` }}>
            <em>{labels[hover]}</em>
            {series.map((s, i) => (
              <div key={i}>
                {series.length > 1 && <span style={{ color: s.color || 'var(--ink-4)' }}>● </span>}
                <strong style={{ display: 'inline' }}>{formatFull(s.data[hover])}</strong>
                {series.length > 1 && <span style={{ marginLeft: 6, opacity: 0.6 }}>{s.name}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {showLegend && series.length > 1 && (
        <div className="chart__legend">
          {series.map((s, i) => (
            <span key={i}>
              <i style={{ background: s.color || 'var(--ink-2)' }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// HorizontalBars — comparison list (e.g. funds, fundraisers, departments)
// ───────────────────────────────────────────────────────────────────────
function HorizontalBars({ items, format = fmt.shortMoney, valueKey = 'value', labelKey = 'label', colorKey = null, max = null }) {
  const m = max ?? Math.max(...items.map(i => i[valueKey]));
  return (
    <div className="barlist">
      {items.map((item, i) => {
        const v = item[valueKey];
        const pct = (v / m) * 100;
        const col = colorKey ? item[colorKey] : 'var(--ink-2)';
        return (
          <div key={i} className="barlist__row">
            <div>
              <div className="barlist__label">{item[labelKey]}</div>
              {item.sub && <div className="barlist__sub">{item.sub}</div>}
              <div className="barlist__bar"><i style={{ width: pct + '%', background: col }} /></div>
            </div>
            <div className="barlist__num">{format(v)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Donut — share of total
// ───────────────────────────────────────────────────────────────────────
function Donut({ segments, size = 160, thickness = 18, format = (v) => v, centerLabel = null, centerSub = null }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--rule)" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
        {centerLabel && (
          <>
            <text x={c} y={c - 2} textAnchor="middle" fontFamily="var(--serif)" fontSize="22" fill="var(--ink)" fontWeight="500" letterSpacing="-0.01em">
              {centerLabel}
            </text>
            {centerSub && (
              <text x={c} y={c + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink-4)" letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}>
                {centerSub}
              </text>
            )}
          </>
        )}
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: 10, fontSize: 12.5, paddingBottom: 8, borderBottom: '1px solid var(--rule)' }}>
            <span style={{ width: 10, height: 10, background: seg.color, borderRadius: 2 }} />
            <span style={{ color: 'var(--ink-2)' }}>{seg.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{format(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Funnel — academic admissions funnel
// ───────────────────────────────────────────────────────────────────────
function Funnel({ steps, color = 'var(--navy)', format = fmt.num }) {
  const max = Math.max(...steps.map(s => s.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev ? (s.value / prev) : null;
        return (
          <div key={i} style={{ borderBottom: i < steps.length - 1 ? '1px solid var(--rule)' : 0, padding: '14px 0', display: 'grid', gridTemplateColumns: '160px 1fr 80px 70px', gap: 16, alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ height: 22, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: pct + '%', background: color, opacity: 0.85 - i * 0.12, borderRadius: 2 }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>{format(s.value)}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
              {conv !== null ? fmt.pct(conv, 0) : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// HeatStrip — 60-month strip for exception detection (depts × months)
// ───────────────────────────────────────────────────────────────────────
function HeatStrip({ data, height = 18, format = fmt.pct, thresholdHi = 0.10, thresholdLo = -0.10 }) {
  // data: array of {value} per month, where value is variance ratio
  return (
    <div style={{ display: 'flex', gap: 1, height, width: '100%' }}>
      {data.map((d, i) => {
        const v = d.value;
        let bg = 'var(--rule)';
        if (v > thresholdHi) bg = `rgba(218,32,55, ${Math.min(1, 0.3 + Math.abs(v) * 4)})`;
        else if (v < thresholdLo) bg = `rgba(198,138,46, ${Math.min(1, 0.3 + Math.abs(v) * 4)})`;
        else bg = `rgba(47,143,107, ${0.18 + Math.abs(v) * 2})`;
        return (
          <div key={i} style={{ flex: 1, background: bg, borderRadius: 1 }} title={`${d.label}: ${format(v)}`} />
        );
      })}
    </div>
  );
}

Object.assign(window, { Sparkline, LineChart, HorizontalBars, Donut, Funnel, HeatStrip });
