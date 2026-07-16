// overview-customize.jsx — Per-user, opt-in customization of the Overview tab.
//
// What it covers:
//   • Section order + visibility (numbered sections 01..N renumber as they reorder)
//   • Which KPIs appear in the band, and in what order (max 6 visible)
//   • Which metric is the big hero number
//   • Agenda position: left (default) · top · hidden
//
// State is per-user (keyed by user.id) and persisted in localStorage.
// Both users start with the same default — customization is opt-in.
//
// Two visual treatments for edit mode, switchable via Tweaks:
//   'editorial' — strict dashed outlines, no motion (matches the Bauhaus tone)
//   'tactile'   — rounded handles + subtle wobble on KPI tiles (homescreen-ish,
//                 but contained: never breaks the 6-col grid or section column)

// ── Defaults ────────────────────────────────────────────────────
const LAYOUT_VERSION = 3;
const DEFAULT_LAYOUT = {
  v: LAYOUT_VERSION,
  // Sidebar tab order (drag-reorderable from the Overview edit mode).
  navOrder: ['overview', 'academic', 'hr', 'financial', 'donations'],
  sections: [
    { id: 'kpis',    visible: true },
    { id: 'flagged', visible: true },
    { id: 'depts',   visible: true },
    { id: 'chart',   visible: true },
    { id: 'gifts',   visible: true },
  ],
  kpiOrder: ['op', 'inv', 'tuition', 'pers', 'enroll', 'endow'],
  heroId: 'donations',
  heroHidden: false,       // hide the big hero metric tile
  attentionHidden: false,  // hide the "Needs your attention" panel
  agendaPos: 'left', // 'left' | 'top' | 'hidden'
  // Row-level customization within sections
  deptHidden: [],
  deptOrder: null,    // null = default sort by variance
  giftHidden: [],
  giftOrder: null,    // null = original order (most recent first)
  signalHidden: [],
  signalOrder: null,
};

// Migrate older layouts so existing custom layouts survive a version bump
function migrateLayout(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT;
  if (raw.v === LAYOUT_VERSION) {
    // Backfill navOrder for any layout saved before the field existed.
    return raw.navOrder ? raw : { ...raw, navOrder: DEFAULT_LAYOUT.navOrder };
  }
  // v1 / v2 → current: keep the user's saved choices, add new fields.
  if (raw.v === 1 || raw.v === 2) {
    return {
      ...DEFAULT_LAYOUT,
      ...raw,
      navOrder: raw.navOrder || DEFAULT_LAYOUT.navOrder,
      v: LAYOUT_VERSION,
    };
  }
  return DEFAULT_LAYOUT;
}

// Section metadata — title + aside copy lives here so a hidden section in the
// palette can still display its title.
const SECTION_META = {
  kpis:    { title: 'Performance overview', aside: 'Six leading indicators. Click any to descend into the trend.' },
  flagged: { title: 'Flagged this week',    aside: 'Items pulled by the signal engine. Each card cites the rule that triggered it.' },
  depts:   { title: 'Departments',          aside: 'YTD spend against approved budgets, ordered by absolute variance.' },
  chart:   { title: 'Five-year shape',      aside: 'Monthly operating spend against donations. December pulses visible.' },
  gifts:   { title: 'Recent gifts',         aside: 'Last ten · all sources · anonymous donors counted but unattributed.' },
};

// ── KPI library — definitions are pure functions of D ──────────
// Each returns the props a <KPICard> needs, plus an `id` and `name` for the
// palette UI. The library lists 9 candidates; the user picks 6 to display.
function lastN(arr, n) { return arr.slice(arr.length - n); }
function pctChange(curr, prev) { return prev ? (curr - prev) / prev : 0; }

function buildKpiLibrary(D) {
  const C = window.PRTS_VIEW.complete; // drop the partial current month from sparks
  const opSpend = D.finance.operatingSpend;
  const opTtm = opSpend.slice(-13, -1).reduce((s, v) => s + v, 0);
  const opPrior = opSpend.slice(-25, -13).reduce((s, v) => s + v, 0);

  const donTotal = D.donations.total;
  const donTtm = donTotal.slice(-13, -1).reduce((s, v) => s + v, 0);
  const donPrior = donTotal.slice(-25, -13).reduce((s, v) => s + v, 0);
  const giftsCount = D.donations.recentGifts.length; // illustrative

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
  const prog = Object.fromEntries(D.academic.programs.map(p => [p.id, p.students]));
  const doctoral = (prog.phd || 0) + (prog.dmin || 0);
  const tuit = D.finance.tuition;
  const eqPct = D.finance.investments.composition[0].pct;

  return [
    {
      id: 'op', name: 'Operating · TTM',
      props: {
        label: 'Operating · TTM',
        value: fmt.shortMoney(opTtm),
        delta: pctChange(opTtm, opPrior),
        deltaLabel: 'vs. prior 12 mo',
        caption: <>{D.finance.departments.length} departments · <strong>{exceptions.length} outside ±10%</strong></>,
        spark: lastN(C(opSpend), 24),
        sparkColor: 'var(--ink-3)',
      },
      drill: { kind: 'op-spend' },
    },
    {
      id: 'inv', name: 'Investments',
      props: {
        label: 'Investments',
        value: fmt.shortMoney(D.finance.investments.total),
        delta: pctChange(invCurr, invPrior),
        deltaLabel: "vs. May '25",
        caption: <><strong>{fmt.pct(eqPct, 0)} equities</strong> · {fmt.pct(0.32, 0)} cash equiv</>,
        spark: lastN(inv, 36),
        sparkColor: 'var(--ink-3)',
        status: 'pos',
      },
      drill: { kind: 'investments' },
    },
    {
      id: 'tuition', name: 'Tuition yield',
      props: {
        label: 'Tuition yield',
        value: fmt.pct(tuit.current.rate, 1),
        delta: tuit.current.rate - tuit.priorAY.rate,
        deltaLabel: "vs. AY '24–25",
        caption: <>Net ${fmt.num(Math.round(tuit.current.net / 100) / 10)}k against ${fmt.num(Math.round(tuit.current.list / 100) / 10)}k list · discount <strong>{Math.abs((tuit.current.rate - tuit.priorAY.rate) * 100).toFixed(1)} pts</strong></>,
        spark: tuit.realization.map(r => r.rate),
        sparkColor: 'var(--red)',
        status: 'alert',
      },
      drill: { kind: 'tuition' },
    },
    {
      id: 'pers', name: 'Personnel',
      props: {
        label: 'Personnel',
        value: hcTotal,
        delta: pctChange(hcTotal, hcTotalPrior),
        deltaLabel: "vs. May '25",
        caption: <>{hcCurr.ft} FT · {hcCurr.pt} PT · <strong>{D.hr.openPositions.length} open</strong></>,
        spark: lastN(hc.map(h => h.ft + h.pt), 24),
        sparkColor: 'var(--ink-3)',
      },
      drill: { kind: 'headcount' },
    },
    {
      id: 'enroll', name: 'Enrolled · Spring',
      props: {
        label: 'Enrolled · Spring',
        value: students,
        delta: pctChange(students, D.academic.priorYearEnrollment),
        deltaLabel: "vs. Spring '25",
        caption: <>{prog.mdiv} MDiv · {prog.mts} MTS · {prog.thm} ThM · <strong>{doctoral} doctoral</strong></>,
        spark: D.academic.enrollmentTrend,
        sparkColor: 'var(--ink-3)',
      },
      drill: { kind: 'enrollment' },
    },
    {
      id: 'endow', name: 'Endowment YTD',
      props: {
        label: 'Endowment YTD',
        value: fmt.signedPct(D.finance.investments.ytdWeighted),
        delta: 0.012,
        deltaLabel: 'vs. benchmark',
        caption: <>{fmt.shortMoney(D.finance.investments.total)} total · <strong>+12 bps</strong> over benchmark</>,
        spark: lastN(inv, 12).map(v => v / inv[inv.length - 13]),
        sparkColor: 'var(--pos)',
        status: 'pos',
      },
      drill: { kind: 'investments' },
    },
    // ── Extra entries that aren't on by default — make the swap meaningful ──
    {
      id: 'donations-ttm', name: 'Donations · TTM',
      props: {
        label: 'Donations · TTM',
        value: fmt.shortMoney(donTtm),
        delta: pctChange(donTtm, donPrior),
        deltaLabel: 'vs. prior 12 mo',
        caption: <>{D.donations.recentGifts.length} recent gifts · <strong>Five-year high</strong></>,
        spark: lastN(C(donTotal), 24),
        sparkColor: 'var(--ink-3)',
        status: 'pos',
      },
      drill: { kind: 'donations' },
    },
    {
      id: 'open-pos', name: 'Open positions',
      props: {
        label: 'Open positions',
        value: D.hr.openPositions.length,
        delta: null,
        caption: <>{D.hr.openPositions.filter(p => !p.stage.includes('Re-opening')).length} active searches · <strong>{D.hr.openPositions.filter(p => p.stage.includes('Re-opening')).length} re-opening</strong></>,
        spark: [3, 4, 4, 5, 6, D.hr.openPositions.length],
        sparkColor: 'var(--warn)',
        status: 'warn',
      },
      drill: { kind: 'headcount' },
    },
    {
      id: 'reserve', name: 'Operating reserve',
      // Illustrative: assume reserve ≈ 18% of TTM operating
      props: {
        label: 'Operating reserve',
        value: D.finance.reserve.days + ' days',
        delta: -0.04,
        deltaLabel: 'vs. last quarter',
        caption: <>Target {D.finance.reserve.targetDays} days · <strong>{fmt.shortMoney(D.finance.reserve.unrestricted)} unrestricted</strong></>,
        spark: D.finance.reserve.trend,
        sparkColor: 'var(--warn)',
        status: 'warn',
      },
      drill: { kind: 'investments' },
    },
  ];
}

// ── Hero metric library (the big number on the hero row) ────────
function buildHeroLibrary(D) {
  const C = window.PRTS_VIEW.complete; // drop the partial current month from sparks
  const opSpend = D.finance.operatingSpend;
  const opTtm = opSpend.slice(-13, -1).reduce((s, v) => s + v, 0);
  const opPrior = opSpend.slice(-25, -13).reduce((s, v) => s + v, 0);

  const donTotal = D.donations.total;
  const donTtm = donTotal.slice(-13, -1).reduce((s, v) => s + v, 0);
  const donPrior = donTotal.slice(-25, -13).reduce((s, v) => s + v, 0);

  const inv = D.finance.investments.history;
  const invCurr = inv[inv.length - 1];
  const invPrior = inv[inv.length - 13];

  return [
    {
      id: 'donations', name: 'Donations · TTM',
      props: {
        label: 'Donations · trailing 12 mo',
        tag: 'Five-year high',
        value: fmt.shortMoney(donTtm),
        delta: pctChange(donTtm, donPrior),
        deltaLabel: 'vs. prior 12 mo',
        spark: lastN(C(donTotal), 60),
        sparkColor: 'var(--ink-2)',
      },
      drill: { kind: 'donations' },
    },
    {
      id: 'opspend', name: 'Operating · TTM',
      props: {
        label: 'Operating spend · trailing 12 mo',
        value: fmt.shortMoney(opTtm),
        delta: pctChange(opTtm, opPrior),
        deltaLabel: 'vs. prior 12 mo',
        spark: lastN(C(opSpend), 60),
        sparkColor: 'var(--ink)',
      },
      drill: { kind: 'op-spend' },
    },
    {
      id: 'investments', name: 'Investments',
      props: {
        label: 'Investments · total',
        tag: '+6.2% YTD',
        value: fmt.shortMoney(D.finance.investments.total),
        delta: pctChange(invCurr, invPrior),
        deltaLabel: "vs. May '25",
        spark: lastN(inv, 60),
        sparkColor: 'var(--pos)',
      },
      drill: { kind: 'investments' },
    },
    {
      id: 'enrollment', name: 'Enrolled · Spring',
      props: {
        label: 'Enrolled this semester',
        value: D.academic.totalStudents,
        delta: pctChange(D.academic.totalStudents, D.academic.priorYearEnrollment),
        deltaLabel: "vs. Spring '25",
        spark: D.academic.enrollmentTrend,
        sparkColor: 'var(--ink)',
      },
      drill: { kind: 'enrollment' },
    },
  ];
}

// ── Layout persistence hook ─────────────────────────────────────
function useOverviewLayout(userId) {
  const key = 'prts.overviewLayout.' + userId;
  const [layout, setLayoutState] = React.useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      return migrateLayout(raw);
    } catch (e) {}
    return DEFAULT_LAYOUT;
  });
  React.useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      setLayoutState(migrateLayout(raw));
    } catch (e) { setLayoutState(DEFAULT_LAYOUT); }
  }, [key]);

  const setLayout = React.useCallback((next) => {
    setLayoutState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
      return value;
    });
  }, [key]);

  const resetLayout = React.useCallback(() => {
    try { localStorage.removeItem(key); } catch (e) {}
    setLayoutState(DEFAULT_LAYOUT);
  }, [key]);

  const isCustomized = React.useMemo(() => {
    return JSON.stringify(layout) !== JSON.stringify({ ...DEFAULT_LAYOUT, v: LAYOUT_VERSION });
  }, [layout]);

  return { layout, setLayout, resetLayout, isCustomized };
}

// ── CustomizeBar — top edit-mode chrome (Done / Reset / hint) ───
function CustomizeBar({ editing, onToggle, onReset, isCustomized, editStyle, userName, availableCount = 0, paletteOpen, onTogglePalette }) {
  if (!editing) {
    return (
      <button
        type="button"
        className={'custom-btn' + (isCustomized ? ' custom-btn--customized' : '')}
        onClick={onToggle}
        title="Customize this overview"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
        Customize
        {isCustomized && <span className="custom-btn__dot" title="Custom layout saved" />}
      </button>
    );
  }
  return (
    <div className={'custom-bar custom-bar--' + (editStyle || 'editorial')}>
      <div className="custom-bar__inner">
        <span className="custom-bar__sq" />
        <div className="custom-bar__text">
          <strong>Editing overview</strong>
        </div>
        {availableCount > 0 && (
          <button
            type="button"
            className={'custom-bar__btn custom-bar__btn--toggle' + (paletteOpen ? ' is-open' : '')}
            onClick={onTogglePalette}
            aria-pressed={paletteOpen}
            title="Restore hidden modules, KPIs, and rows"
          >
            Available
          </button>
        )}
        <button type="button" className="custom-bar__btn" onClick={onReset} title="Restore the default layout">Reset</button>
        <button type="button" className="custom-bar__btn custom-bar__btn--primary" onClick={onToggle}>Done</button>
      </div>
    </div>
  );
}

// ── Section frame (drag handle + visibility eye, only when editing) ──
function SectionFrame({ id, editing, dragProps, dropIndicator, isDragging, onHide, children }) {
  if (!editing) return children;
  const meta = SECTION_META[id];
  const className = 'sec-frame' + (isDragging ? ' sec-frame--dragging' : '');
  return (
    <div className={className} data-section-id={id} {...(dragProps || {})}>
      {dropIndicator === 'above' && <div className="sec-frame__drop sec-frame__drop--above" />}
      <div className="sec-frame__chrome">
        <span className="sec-frame__handle" title="Drag to reorder">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/>
            <circle cx="3" cy="7" r="1.4"/><circle cx="9" cy="7" r="1.4"/>
            <circle cx="3" cy="11" r="1.4"/><circle cx="9" cy="11" r="1.4"/>
          </svg>
          {meta?.title || id}
        </span>
        <button type="button" className="sec-frame__eye" onClick={(e) => { e.stopPropagation(); onHide(id); }} title="Hide this section">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Hide
        </button>
      </div>
      <div className="sec-frame__body">{children}</div>
      {dropIndicator === 'below' && <div className="sec-frame__drop sec-frame__drop--below" />}
    </div>
  );
}

// ── KPI tile frame (X to remove, drag-swap inside the band) ─────
function KpiTileFrame({ id, editing, onRemove, dragProps, isDragging, swapTarget, children }) {
  if (!editing) return children;
  const className = 'kpi-frame'
    + (isDragging ? ' kpi-frame--dragging' : '')
    + (swapTarget ? ' kpi-frame--target' : '');
  return (
    <div className={className} data-kpi-id={id} {...(dragProps || {})}>
      <button type="button" className="kpi-frame__x" onClick={(e) => { e.stopPropagation(); onRemove(id); }} title="Remove from band">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
      </button>
      <span className="kpi-frame__grip" aria-hidden="true">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2.5" cy="3" r="1.1"/><circle cx="7.5" cy="3" r="1.1"/>
          <circle cx="2.5" cy="7" r="1.1"/><circle cx="7.5" cy="7" r="1.1"/>
          <circle cx="2.5" cy="11" r="1.1"/><circle cx="7.5" cy="11" r="1.1"/>
        </svg>
      </span>
      {children}
    </div>
  );
}

// ── Module palette drawer (hidden sections + extra KPIs) ────────
function ModulePalette({
  editing,
  hiddenSections, hiddenKpis, agendaHidden,
  heroHidden, attentionHidden,
  hiddenDepts = [], hiddenGifts = [], hiddenSignals = [],
  onShowSection, onAddKpi, onShowAgenda, onShowHero, onShowAttention,
  onShowDept, onShowGift, onShowSignal,
  onClose, kpiBandFull, editStyle, open,
}) {
  if (!editing || !open) return null;
  const hasHiddenModules = hiddenSections.length > 0 || agendaHidden || heroHidden || attentionHidden;
  const hasHiddenRows = hiddenDepts.length > 0 || hiddenGifts.length > 0 || hiddenSignals.length > 0;
  return (
    <aside className={'modpal modpal--' + (editStyle || 'editorial')}>
      <div className="modpal__hd">
        <span className="modpal__sq" />
        Available
        {onClose && (
          <button type="button" className="modpal__hd-close" onClick={onClose} aria-label="Close available menu">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
          </button>
        )}
      </div>
      <div className="modpal__body">
        <div className="modpal__group">
          <div className="modpal__group-hd">Hidden modules</div>
          {!hasHiddenModules && <div className="modpal__empty">All modules visible.</div>}
          {heroHidden && (
            <div className="modpal__item modpal__item--section">
              <div className="modpal__item-text">
                <strong>Hero metric</strong>
                <em>The large featured number at the top of the overview.</em>
              </div>
              <button type="button" className="modpal__add" onClick={onShowHero}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Show
              </button>
            </div>
          )}
          {attentionHidden && (
            <div className="modpal__item modpal__item--section">
              <div className="modpal__item-text">
                <strong>Needs your attention</strong>
                <em>The shortlist of signals flagged for you this week.</em>
              </div>
              <button type="button" className="modpal__add" onClick={onShowAttention}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Show
              </button>
            </div>
          )}
          {agendaHidden && (
            <div className="modpal__item modpal__item--section">
              <div className="modpal__item-text">
                <strong>Today's agenda</strong>
                <em>Your meetings, classes, and calls for today.</em>
              </div>
              <button type="button" className="modpal__add" onClick={onShowAgenda}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Show
              </button>
            </div>
          )}
          {hiddenSections.map(s => (
            <div key={s.id} className="modpal__item modpal__item--section">
              <div className="modpal__item-text">
                <strong>{SECTION_META[s.id]?.title || s.id}</strong>
                <em>{SECTION_META[s.id]?.aside}</em>
              </div>
              <button type="button" className="modpal__add" onClick={() => onShowSection(s.id)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Show
              </button>
            </div>
          ))}
        </div>

        <div className="modpal__group">
          <div className="modpal__group-hd">More KPIs</div>
          {hiddenKpis.length === 0 && <div className="modpal__empty">All KPIs already on the band.</div>}
          {hiddenKpis.map(k => (
            <div key={k.id} className="modpal__item">
              <div className="modpal__item-text">
                <strong>{k.name}</strong>
                <em>{typeof k.props.value === 'string' ? k.props.value : ''}</em>
              </div>
              <button type="button" className="modpal__add" onClick={() => onAddKpi(k.id)} disabled={kpiBandFull} title={kpiBandFull ? 'Remove one first (max 6)' : 'Add to KPI band'}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add
              </button>
            </div>
          ))}
        </div>

        {hasHiddenRows && (
          <div className="modpal__group">
            <div className="modpal__group-hd">Hidden items</div>
            {hiddenDepts.map(d => (
              <div key={'d-' + d.id} className="modpal__item modpal__item--row">
                <div className="modpal__item-text">
                  <strong>{d.name}</strong>
                  <em>Department · {d.head}</em>
                </div>
                <button type="button" className="modpal__add" onClick={() => onShowDept(d.id)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Show
                </button>
              </div>
            ))}
            {hiddenGifts.map(g => (
              <div key={'g-' + g.idx} className="modpal__item modpal__item--row">
                <div className="modpal__item-text">
                  <strong>{g.donor}</strong>
                  <em>Gift · ${g.amount.toLocaleString()}</em>
                </div>
                <button type="button" className="modpal__add" onClick={() => onShowGift(g.idx)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Show
                </button>
              </div>
            ))}
            {hiddenSignals.map(s => (
              <div key={'s-' + s.id} className="modpal__item modpal__item--row">
                <div className="modpal__item-text">
                  <strong>{s.label}</strong>
                  <em>Flagged · {s.rule}</em>
                </div>
                <button type="button" className="modpal__add" onClick={() => onShowSignal(s.id)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Show
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Hero metric picker (overlay in edit mode) ───────────────────
function HeroPicker({ editing, current, library, onPick }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  if (!editing) return null;
  return (
    <div className="hero-pick" ref={ref}>
      <button type="button" className="hero-pick__btn" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        Change metric
      </button>
      {open && (
        <div className="hero-pick__menu" onClick={(e) => e.stopPropagation()}>
          <div className="hero-pick__hd">Hero metric</div>
          {library.map(h => (
            <button key={h.id} type="button" className="hero-pick__opt" aria-selected={h.id === current}
              onClick={() => { onPick(h.id); setOpen(false); }}>
              <span className="hero-pick__tick">{h.id === current ? '●' : '○'}</span>
              <span>{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agenda position control (in edit mode) ──────────────────────
function AgendaPosControl({ editing, value, onChange }) {
  if (!editing) return null;
  const opts = [
    { id: 'left',   label: 'Left' },
    { id: 'top',    label: 'Top' },
    { id: 'hidden', label: 'Hide' },
  ];
  return (
    <div className="agenda-pos" onClick={(e) => e.stopPropagation()}>
      <span className="agenda-pos__lbl">Agenda</span>
      <div className="agenda-pos__seg">
        {opts.map(o => (
          <button key={o.id} type="button" aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Reorder helpers ─────────────────────────────────────────────
function moveItem(arr, fromIdx, toIdx) {
  if (fromIdx === toIdx) return arr;
  const next = arr.slice();
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next;
}
function swapItems(arr, a, b) {
  if (a === b) return arr;
  const next = arr.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// Given a baseline-ordered items array and the user's stored order + hidden
// list, return the array of items to display. Items not mentioned in `order`
// fall back to their baseline position (appended at the end).
function applyOrderHide(items, getId, order, hiddenIds) {
  const hidden = new Set(hiddenIds || []);
  const visible = items.filter(it => !hidden.has(getId(it)));
  if (!order || order.length === 0) return visible;
  const seen = new Set();
  const ordered = [];
  for (const id of order) {
    const found = visible.find(it => getId(it) === id);
    if (found) { ordered.push(found); seen.add(id); }
  }
  for (const it of visible) {
    if (!seen.has(getId(it))) ordered.push(it);
  }
  return ordered;
}

Object.assign(window, {
  DEFAULT_LAYOUT, SECTION_META, LAYOUT_VERSION,
  buildKpiLibrary, buildHeroLibrary,
  useOverviewLayout,
  CustomizeBar, SectionFrame, KpiTileFrame, ModulePalette, HeroPicker, AgendaPosControl,
  moveItem, swapItems, applyOrderHide,
});
