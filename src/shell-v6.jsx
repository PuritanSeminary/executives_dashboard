// shell-v6.jsx — Strict Bauhaus dashboard primitives.
// Sidebar + topbar + section + KPI + Hero + B&W portrait.
// Component API matches v4/v5 (Masthead, Section, KPICard, Hero,
// Finding, etc.) so legacy view files keep working.

// ── PRTS symbol (just the mark; for avatars + tight spaces) ─
function PRTSeal({ size = 40, variant = 'red' }) {
  const src = variant === 'white' ?
  'assets/brand/symbol-white.svg' :
  variant === 'black' ?
  'assets/brand/symbol-black.svg' :
  'assets/brand/symbol-red.svg';
  // Symbol aspect ratio is ~58:163 (tall)
  return (
    <img
      src={src}
      alt="PRTS"
      style={{ display: 'block', height: size, width: 'auto', flexShrink: 0 }} />);


}

// ── PRTS full inline lockup (symbol + wordmark, brand-compliant) ─
function PRTSLockup({ height = 44, variant = 'auto' }) {
  // Variants per brand guide:
  //   'black'  -> Red Symbol + Black Text on WHITE/light bg
  //   'white'  -> Red Symbol + White Text on DARK bg
  //   'auto'   -> swaps automatically based on the active theme
  // Aspect ratio is 399:159 (~2.5:1)
  if (variant === 'auto') {
    // Both variants stacked in the same spot; CSS shows exactly one.
    return (
      <span className="prts-lockup-wrap" style={{ height }}>
        <img
          src="assets/brand/lockup-inline-black.svg"
          alt="Puritan Reformed Theological Seminary"
          className="prts-lockup prts-lockup--light"
          style={{ height, width: 'auto' }} />
        
        <img
          src="assets/brand/lockup-inline-white.svg"
          alt=""
          aria-hidden="true"
          className="prts-lockup prts-lockup--dark"
          style={{ height, width: 'auto' }} />
        
      </span>);

  }
  const src = variant === 'white' ?
  'assets/brand/lockup-inline-white.svg' :
  'assets/brand/lockup-inline-black.svg';
  return (
    <img
      src={src}
      alt="Puritan Reformed Theological Seminary"
      style={{ display: 'block', height, width: 'auto' }} />);


}

// ── Icons (small, neutral) ───────────────────────────
const Icon = {
  download:
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>,

  refresh:
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 3 21 9 15 9" />
      <polyline points="3 21 3 15 9 15" />
      <path d="M19.5 8.5A8 8 0 0 0 6 5.3L3 8M21 16l-3 2.7A8 8 0 0 1 4.5 15.5" />
    </svg>,

  hamburger:
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>,

  search:
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>

};

const NAV = [
{ id: 'overview', label: 'Overview' },
{ id: 'academic', label: 'Academic' },
{ id: 'hr', label: 'Personnel' },
{ id: 'financial', label: 'Financial' },
{ id: 'donations', label: 'Donations' }];


const CHAPTER_TITLES = {
  overview: 'Overview',
  financial: 'Financial',
  donations: 'Donations',
  hr: 'Personnel',
  academic: 'Academic',
  help: 'How to read'
};

// ── Masthead: sidebar + topbar ───────────────────────
function Masthead({ chapter, onNav, badges = {}, onCmdK, layout = 'bauhaus', onLayoutChange, theme = 'light', onThemeChange, user, onUserChange, onExport, onShare, onRefresh, refreshing = false, syncTime = '04:12 GMT', navEditing = false, navOrder, onNavOrderChange }) {
  const [layoutOpen, setLayoutOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
  // Sidebar tab drag-reorder state (active only while editing the Overview).
  const [draggingNavId, setDraggingNavId] = React.useState(null);
  const [navDropTarget, setNavDropTarget] = React.useState(null);
  const [sidebarHidden, setSidebarHidden] = React.useState(() => {
    try {
      const stored = localStorage.getItem('prts.sidebarHidden');
      // On narrow viewports the sidebar overlays content as a drawer —
      // default it CLOSED so the page reads naturally on first load.
      const narrow = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(max-width: 899px)').matches;
      if (stored === null) return narrow;
      // Respect stored preference, but force-closed on narrow widths
      // (a sidebar pinned open at 360px wide is unusable).
      return narrow ? true : stored === '1';
    } catch (e) {return false;}
  });
  // Auto-close the drawer when the viewport crosses into mobile, and
  // restore preference when it crosses back to desktop.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => {
      if (mq.matches) {
        setSidebarHidden(true);
      } else {
        try {
          const stored = localStorage.getItem('prts.sidebarHidden');
          setSidebarHidden(stored === '1');
        } catch (e) {setSidebarHidden(false);}
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);else
    if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);else
      if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);
  const layoutRef = React.useRef(null);
  const userRef = React.useRef(null);
  React.useEffect(() => {
    document.body.classList.toggle('sidebar-hidden', sidebarHidden);
    try {localStorage.setItem('prts.sidebarHidden', sidebarHidden ? '1' : '0');} catch (e) {}
  }, [sidebarHidden]);
  React.useEffect(() => {
    const close = (e) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target)) setLayoutOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Dismiss the sidebar ONLY when the user clicks the empty page background —
  // not cards, headers, tables, or any content. Armed only while open.
  React.useEffect(() => {
    if (sidebarHidden) return;
    const KEEP = '.sidebar, .floating-hamburger, .tweaks-panel, [data-tweaks-host], ' +
      '.modpal, .drill, .custom-bar, .chatnudge, .layout-picker__menu';
    // The click must land directly on a background surface (the report wrapper,
    // topbar gutter, or body) — clicking through a card does NOT count.
    const BG = '.report, .main, .content, .topbar, .topbar__inner';
    const onBgDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest(KEEP)) return;
      const onBackground = e.target === document.body ||
        (e.target.matches && e.target.matches(BG));
      if (!onBackground) return;
      setSidebarHidden(true);
    };
    document.addEventListener('mousedown', onBgDown);
    return () => document.removeEventListener('mousedown', onBgDown);
  }, [sidebarHidden]);

  const LAYOUTS = [
  { id: 'brand', label: 'Brand' },
  { id: 'editorial', label: 'Editorial' }];

  const layoutBase = (layout || 'brand').indexOf('editorial') === 0 ? 'editorial' : 'brand';
  const layoutCompact = (layout || '').indexOf('-compact') !== -1;
  const setBase = (b) => onLayoutChange?.(b + (layoutCompact ? '-compact' : ''));
  const toggleCompact = () => onLayoutChange?.(layoutBase + (layoutCompact ? '' : '-compact'));
  const current = LAYOUTS.find((l) => l.id === layoutBase) || LAYOUTS[0];
  const U = user || window.PRTS_USERS.neele;
  const USERS = Object.values(window.PRTS_USERS || {});

  // Resolve the sidebar tab order: stored navOrder first, then any NAV
  // entries not present in it (defensive against future additions).
  const orderedNav = React.useMemo(() => {
    const order = navOrder && navOrder.length ? navOrder : NAV.map((n) => n.id);
    const byId = Object.fromEntries(NAV.map((n) => [n.id, n]));
    return order.map((id) => byId[id]).filter(Boolean).
    concat(NAV.filter((n) => !order.includes(n.id)));
  }, [navOrder]);

  // Tab drag-reorder (mirrors the section reorder pattern on the Overview).
  const onNavDragStart = (id) => (e) => {
    setDraggingNavId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {e.dataTransfer.setData('text/plain', id);} catch (err) {}
  };
  const onNavDragOver = (id) => (e) => {
    if (!draggingNavId || draggingNavId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const edge = e.clientY - rect.top < rect.height / 2 ? 'above' : 'below';
    setNavDropTarget((prev) => prev && prev.id === id && prev.edge === edge ? prev : { id, edge });
  };
  const onNavDrop = (id) => (e) => {
    e.preventDefault();
    if (!draggingNavId || draggingNavId === id) {setDraggingNavId(null);setNavDropTarget(null);return;}
    const ids = orderedNav.map((n) => n.id);
    const fromIdx = ids.indexOf(draggingNavId);
    let toIdx = ids.indexOf(id);
    if (navDropTarget && navDropTarget.id === id && navDropTarget.edge === 'below') toIdx = toIdx + (fromIdx < toIdx ? 0 : 1);else
    toIdx = toIdx + (fromIdx < toIdx ? -1 : 0);
    toIdx = Math.max(0, Math.min(ids.length - 1, toIdx));
    const next = window.moveItem(ids, fromIdx, toIdx);
    onNavOrderChange && onNavOrderChange(next);
    setDraggingNavId(null);
    setNavDropTarget(null);
  };
  const onNavDragEnd = () => {setDraggingNavId(null);setNavDropTarget(null);};

  return (
    <>
      <button
        className="floating-hamburger"
        onClick={() => setSidebarHidden((h) => !h)}
        aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
        title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}>
        
        {Icon.hamburger}
      </button>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <PRTSLockup height={56} variant="auto" />
        </div>

        <button className="sidebar__cmdk" onClick={onCmdK}>
          <span style={{ display: 'inline-flex' }}>{Icon.search}</span>
          Search & jump
          <kbd>⌘K</kbd>
        </button>

        <div className="sidebar__section-lbl">Workspace</div>
        <nav className={'sidebar__nav' + (navEditing ? ' sidebar__nav--editing' : '')}>
          {orderedNav.map((n, i) => {
            const dragProps = navEditing ? {
              draggable: true,
              onDragStart: onNavDragStart(n.id),
              onDragOver: onNavDragOver(n.id),
              onDrop: onNavDrop(n.id),
              onDragEnd: onNavDragEnd
            } : null;
            const isDragging = draggingNavId === n.id;
            const isTarget = navDropTarget && navDropTarget.id === n.id;
            const cls = 'sidebar__item' + (
            navEditing ? ' sidebar__item--editing' : '') + (
            isDragging ? ' sidebar__item--dragging' : '') + (
            isTarget ? ' sidebar__item--drop-' + navDropTarget.edge : '');
            return (
              <button
                key={n.id}
                className={cls}
                aria-current={chapter === n.id ? 'page' : undefined}
                onClick={navEditing ? undefined : () => onNav(n.id)}
                {...dragProps || {}}>
                
                {navEditing &&
                <span className="sidebar__item-grip" aria-hidden="true" title="Drag to reorder">
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                      <circle cx="2.5" cy="3" r="1.1" /><circle cx="7.5" cy="3" r="1.1" />
                      <circle cx="2.5" cy="7" r="1.1" /><circle cx="7.5" cy="7" r="1.1" />
                      <circle cx="2.5" cy="11" r="1.1" /><circle cx="7.5" cy="11" r="1.1" />
                    </svg>
                  </span>
                }
                <span className="sidebar__item-num">0{i + 1}</span>
                <span className="sidebar__item-lbl">{n.label}</span>
                {badges[n.id] ? <span className="sidebar__item-badge">{badges[n.id]}</span> : null}
              </button>);

          })}
        </nav>

        <div className="sidebar__spacer" />

        {/* Slot for the per-page Customize button (e.g. Overview).
                 Views portal their button here via #sidebar-customize-slot. */}
        <div id="sidebar-customize-slot" className="sidebar__customize-slot" />

        {/* Help item — sits at the bottom, no number, separate visual treatment */}
        <button
          className="sidebar__item sidebar__item--utility"
          aria-current={chapter === 'help' ? 'page' : undefined}
          onClick={() => onNav('help')}>
          
          <span className="sidebar__item-num" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" />
              <line x1="12" y1="17" x2="12" y2="17.01" />
            </svg>
          </span>
          <span className="sidebar__item-lbl">How to read</span>
        </button>

        <div className="sidebar__user sidebar__user--expanded" ref={userRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setUserOpen((o) => !o)}>
          <div className="sidebar__user-row">
            <div className="sidebar__avatar">{U.initials}</div>
            <div className="sidebar__user-text">
              <strong>{U.short}</strong>
              <span>{U.role}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-4)', marginLeft: 'auto' }}>
              <polyline points={userOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
            </svg>
          </div>
          {userOpen &&
          <div className="layout-picker__menu" style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)', top: 'auto',
            left: 8, right: 8, width: 'auto'
          }}>
              <div className="layout-picker__menu-hd">Switch user</div>
              {USERS.map((u) =>
            <button key={u.id} className="layout-picker__opt" aria-selected={u.id === U.id}
            onClick={(e) => {e.stopPropagation();onUserChange?.(u.id);setUserOpen(false);}}>
                  <span className="layout-picker__opt-tick">{u.id === U.id ? '●' : '○'}</span>
                  <span className="layout-picker__opt-text">
                    <strong>{u.name}</strong>
                    <em>{u.role}</em>
                  </span>
                </button>
            )}
            </div>
          }
        </div>
      </aside>

      <div className="topbar">
        <div className="topbar__inner">
          {/* Interface picker */}
          <div className="layout-picker" ref={layoutRef}>
            <button className="layout-picker__btn" onClick={() => setLayoutOpen((o) => !o)} aria-expanded={layoutOpen}>
              <span className="layout-picker__lbl">Interface</span>
              <strong>{current.label}</strong>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {layoutOpen &&
            <div className="layout-picker__menu" role="listbox">
                <div className="layout-picker__menu-hd">Interface</div>
                {LAYOUTS.map((l) =>
              <button
                key={l.id}
                className="layout-picker__opt"
                aria-selected={l.id === layoutBase}
                onClick={() => {setBase(l.id);setLayoutOpen(false);}}>
                
                    <span className="layout-picker__opt-tick">
                      {l.id === layoutBase ? '●' : '○'}
                    </span>
                    <span className="layout-picker__opt-text">
                      <strong>{l.label}</strong>
                    </span>
                  </button>
              )}
                <div className="layout-picker__menu-hd layout-picker__menu-hd--sep">Appearance</div>
                <button
                type="button"
                className="layout-picker__toggle"
                role="switch"
                aria-checked={layoutCompact}
                onClick={(e) => {e.stopPropagation();toggleCompact();}}>
                
                  <span className="layout-picker__opt-text">
                    <strong>Compact</strong>
                  </span>
                  <span className="lp-switch" style={{ background: layoutCompact ? 'var(--blue)' : 'var(--ink-faint)' }} aria-hidden="true">
                    <span className="lp-switch__knob" style={{ left: layoutCompact ? 18 : 2 }} />
                  </span>
                </button>
                <button
                type="button"
                className="layout-picker__toggle"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={(e) => {e.stopPropagation();onThemeChange?.(theme === 'dark' ? 'light' : 'dark');}}>
                
                  <span className="layout-picker__opt-text">
                    <strong>Dark mode</strong>
                  </span>
                  <span className="lp-switch" style={{ background: theme === 'dark' ? 'var(--blue)' : 'var(--ink-faint)' }} aria-hidden="true">
                    <span className="lp-switch__knob" style={{ left: theme === 'dark' ? 18 : 2 }} />
                  </span>
                </button>
              </div>
            }
          </div>

          <button
            className={'topbar__btn topbar__btn--refresh' + (refreshing ? ' is-refreshing' : '')}
            title="Refresh data now"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}>
            <span className="topbar__refresh-ico" style={{ display: 'inline-flex', marginRight: 6, verticalAlign: 'middle' }}>{Icon.refresh}</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="topbar__btn" title="Print to PDF" onClick={onExport}>
            <span style={{ display: 'inline-flex', marginRight: 6, verticalAlign: 'middle' }}>{Icon.download}</span>
            Export
          </button>
        </div>
      </div>
    </>);

}

// ── PageHead: Bauhaus title plate (red square + giant title) ──
function PageHead({ mark, eyebrow, title, sub, meta = [] }) {
  return (
    <div className="pagehead">
      <div className="pagehead__mark">
        {mark || 'CH 01'}
      </div>
      <div className="pagehead__body">
        {eyebrow && <div className="pagehead__eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="pagehead__sub">{sub}</div>}
      </div>
      <div className="pagehead__meta">
        {meta.map((m, i) =>
        <div key={i} className="pagehead__meta-row">
            {m.label}
            <strong>{m.value}</strong>
          </div>
        )}
      </div>
    </div>);

}

// ── Section (numbered + heavy black rule) ────────────
function Section({ num, title, aside, children }) {
  return (
    <section className="section">
      <div className="section__hd">
        <div className="section__num">
          <span className="sq" />
          {String(num).padStart(2, '0')}
        </div>
        <h2 className="section__title">{title}</h2>
        {aside && <div className="section__aside">{aside}</div>}
      </div>
      {children}
    </section>);

}

// ── Hero (smaller, paired with summary) ──────────────
function Hero({ label, value, delta, deltaLabel, caption, spark, sparkColor = 'var(--red)', tag, onClick }) {
  let dcls = 'hero__delta hero__delta--flat';
  let arrow = '·';
  if (delta != null) {
    if (delta > 0.005) {dcls = 'hero__delta';arrow = '↑';} else
    if (delta < -0.005) {dcls = 'hero__delta hero__delta--down';arrow = '↓';}
  }
  return (
    <div className="hero" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div>
        <div className="hero__label">
          {label}
          {tag && <span className="pill">{tag}</span>}
        </div>
        <div className="hero__num">{value}</div>
        <div className="hero__sub">
          {delta != null && <div className={dcls}>{arrow} {fmt.signedPct(delta)}</div>}
          {deltaLabel && <span className="hero__delta-sub">{deltaLabel}</span>}
        </div>
      </div>
      {spark &&
      <div className="hero__chart">
          <Sparkline data={spark} color={sparkColor} height={44} dot={false} fill={false} />
        </div>
      }
    </div>);

}

// ── KPI card ─────────────────────────────────────────
// Color system (consistent across all layouts):
//   STATUS controls the BIG NUMBER color  — reflects absolute state:
//     undefined / 'neutral' → ink (no signal)
//     'pos'                 → ink number, green dot (light: "all good")
//     'info'                → ink number, blue dot   (light: "context")
//     'warn'                → gold number          (loud: "watch this")
//     'alert'               → red number           (loud: "problem")
//
//   DELTA controls the small pill below — reflects DIRECTION only:
//     positive change → green up arrow
//     negative change → red down arrow
//     flat            → grey dot
//
// The two are independent. A metric in 'alert' can still be trending up;
// the big number turns red (problem) while the delta stays green (improving).
// ── CardInfo: the ⓘ disclosure ───────────────────────
// Explanatory copy ("what this is / how to read it") is hidden by default
// so tiles stay quiet. The ⓘ reveals it in a small popover on demand —
// useful on first read, out of the way once you know the data.
function CardInfo({ children, align = 'left' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
  }, [open]);
  const stop = (e) => e.stopPropagation();
  return (
    <span className="tile-info-wrap" ref={ref} onMouseDown={stop} onClick={stop}>
      <button
        type="button"
        className={'tile-info' + (open ? ' is-open' : '')}
        aria-label={open ? 'Hide details' : 'About this'}
        aria-expanded={open}
        title="About this"
        onClick={(e) => {stop(e);setOpen((o) => !o);}}>
        i</button>
      {open && <span className={'tile-pop' + (align === 'right' ? ' tile-pop--right' : '')}>{children}</span>}
    </span>);

}

function KPICard({ label, value, delta, deltaLabel, caption, spark, sparkColor = 'var(--ink)', sparkFloor = null, accent, status, onClick }) {
  let dcls = 'kpi__delta kpi__delta--flat';
  let arrow = '·';
  if (delta != null) {
    if (delta > 0.005) {dcls = 'kpi__delta kpi__delta--up';arrow = '↑';} else
    if (delta < -0.005) {dcls = 'kpi__delta kpi__delta--down';arrow = '↓';}
  }
  // `status` is the new canonical prop. `accent` is kept for backwards
  // compatibility; legacy 'accent' value maps to the new 'alert'.
  const s = status || (accent === 'accent' ? 'alert' : accent);
  const accentCls = s === 'alert' ? ' kpi--alert' :
  s === 'warn' ? ' kpi--warn' :
  s === 'info' ? ' kpi--info' :
  s === 'pos' ? ' kpi--pos' :
  '';
  return (
    <div className={'kpi' + accentCls} onClick={onClick}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__num">{value}</div>
      {delta != null &&
      <div className="kpi__delta-block">
          <div className={dcls}>{arrow} {fmt.signedPct(delta)}</div>
          {deltaLabel && <span className="kpi__delta-sub">{deltaLabel}</span>}
        </div>
      }
      {caption && <div className="kpi__info"><CardInfo align="right">{caption}</CardInfo></div>}
      {spark &&
      <div className="kpi__spark">
          <Sparkline data={spark} color={sparkColor} height={28} dot={false} fill={false} yFloor={sparkFloor} />
        </div>
      }
    </div>);

}

// ── Finding (pull quote with 5pt red stroke + dismiss + note) ─────────
function Finding({ num, kicker, children, cite, onDismiss, onExpand, note, onNoteChange }) {
  const [showNote, setShowNote] = React.useState(!!note);
  const [draft, setDraft] = React.useState(note || '');
  React.useEffect(() => {setDraft(note || '');if (note) setShowNote(true);}, [note]);
  const saveNote = () => {if (onNoteChange) onNoteChange(draft.trim());};
  const clearNote = () => {setDraft('');if (onNoteChange) onNoteChange('');setShowNote(false);};
  const stop = (e) => e.stopPropagation();
  return (
    <div className={'finding' + (onExpand ? ' finding--click' : '')} onClick={onExpand}>
      {onDismiss &&
      <button
        className="finding__dismiss"
        onClick={(e) => {e.stopPropagation();onDismiss();}}
        aria-label="Dismiss"
        title="Dismiss this signal">
        
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>
        </button>
      }
      {onExpand &&
      <button
        className="finding__expand"
        onClick={(e) => {e.stopPropagation();onExpand();}}
        aria-label="Open full view"
        title="Open full view">
        
          Open
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg>
        </button>
      }
      <div className="finding__num">
        <strong>№ {num}</strong>
        {kicker}
      </div>
      <div className="finding__body">{children}</div>
      <div className="finding__cite">
        <strong>{cite.source}</strong>
        <span>{cite.lead}</span>
      </div>

      {/* Composer buttons */}
      {onNoteChange && !showNote &&
      <div className="finding__compose-row">
          <button className="finding__note-add" onClick={(e) => {stop(e);setShowNote(true);}}>+ Add private note</button>
        </div>
      }

      {/* Private note editor */}
      {showNote &&
      <div className="finding__note" onClick={stop}>
          <div className="finding__note-label">Your note · private</div>
          <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveNote}
          placeholder="Discussed in June committee — reviewing July 1."
          rows={2} />
        
          {note &&
        <div className="finding__note-row">
              <span>Saved · only you see this</span>
              <button onClick={clearNote}>Clear</button>
            </div>
        }
        </div>
      }
    </div>);

}

// ── HeroSummary (right side of hero row) ─────────────
function HeroSummary({ title, rows, onDismiss, onRowClick, emptyText }) {
  return (
    <div className="hero-summary">
      <div className="hero-summary__title">{title}</div>
      <div className="hero-summary__rows">
        {rows.length === 0 && emptyText &&
        <div className="hero-summary__empty">{emptyText}</div>
        }
        {rows.map((r, i) =>
        <div
          key={r.id || i}
          className={'hero-summary__row hero-summary__row--' + (r.tone || 'neutral') + (onRowClick ? ' hero-summary__row--click' : '')}
          onClick={() => onRowClick && onRowClick(r)}
          role={onRowClick ? 'button' : undefined}
          tabIndex={onRowClick ? 0 : undefined}>
          
            <div className="hero-summary__row-val">{r.val}</div>
            <div className="hero-summary__row-text">
              <strong>{r.label}</strong>
              <span>{r.detail}</span>
            </div>
            {onDismiss && r.id &&
          <button
            className="hero-summary__row-dismiss"
            onClick={(e) => {e.stopPropagation();onDismiss(r.id);}}
            aria-label="Dismiss"
            title="Dismiss this item">
            
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>
              </button>
          }
          </div>
        )}
      </div>
    </div>);

}

// ── HeroToday (personal agenda for today — replaces portrait) ─
function HeroToday({ kicker, items, onItemClick }) {
  return (
    <div className="hero-today">
      <div className="hero-today__kicker">{kicker}</div>
      <div className="hero-today__list">
        {items.map((it, i) =>
        <div
          key={i}
          className={'hero-today__row' + (onItemClick ? ' hero-today__row--click' : '')}
          onClick={() => onItemClick && onItemClick(it)}
          role={onItemClick ? 'button' : undefined}
          tabIndex={onItemClick ? 0 : undefined}>
          
            <div className="hero-today__time">{it.time}</div>
            <div className="hero-today__text">
              <strong>{it.label}</strong>
              <span>{it.detail}</span>
            </div>
          </div>
        )}
      </div>
    </div>);

}

// ── HeroPortrait (kept for legacy / opt-in use) ───────────
function HeroPortrait({ kicker, name, title }) {
  return (
    <div className="hero-portrait">
      <div className="hero-portrait__bg" />
      <div className="hero-portrait__caption">
        <div className="hero-portrait__caption-kicker">{kicker}</div>
        <div className="hero-portrait__caption-name">{name}</div>
        <div className="hero-portrait__caption-title">{title}</div>
      </div>
    </div>);

}

// ── Range pills ──────────────────────────────────────
const RANGES = [
{ id: '5y', label: '5Y' },
{ id: '3y', label: '3Y' },
{ id: '1y', label: '1Y' },
{ id: 'ytd', label: 'YTD' },
{ id: 'mtd', label: 'MTD' }];

function Range({ value, onChange }) {
  return (
    <div className="range" role="tablist">
      {RANGES.map((r) =>
      <button key={r.id} role="tab" aria-pressed={value === r.id} onClick={() => onChange(r.id)}>{r.label}</button>
      )}
    </div>);

}
function rangeSlice(rangeId, totalMonths) {
  const last = totalMonths;
  switch (rangeId) {
    case 'mtd':return [last - 1, last];
    case 'ytd':return [last - 5, last];
    case '1y':return [last - 12, last];
    case '3y':return [last - 36, last];
    case '5y':
    default:return [0, last];
  }
}

// ── Variance flag ────────────────────────────────────
function VarianceFlag({ variance }) {
  const abs = Math.abs(variance);
  // Expense variance, stated in plain words for a non-finance audience: the word
  // carries direction (over / under budget) and the colour carries how concerned
  // to be (red = meaningfully over = unfavourable, gold = under, green = within
  // tolerance). Avoids the "+ but red" clash of a signed percentage.
  const dir = variance >= 0 ? 'over' : 'under';
  const cls = abs < 0.05 ? 'flag--ok' : (variance > 0 ? 'flag--over' : 'flag--under');
  return <span className={'flag ' + cls}>{fmt.pct(abs, 1)} {dir}</span>;
}

// ── Legacy shims (used by financial/donations/hr/academic) ─

function Brief({ kicker, date, headline, dek, sources }) {
  return (
    <div className="pagehead" style={{ marginBottom: 36 }}>
      <div className="pagehead__markcol">
        {date && <div className="pagehead__date" style={{ textAlign: "left" }}>{date}</div>}
        <div className="pagehead__mark">{kicker || 'BRIEF'}</div>
      </div>
      <div className="pagehead__body">
        <div className="pagehead__eyebrow">
          {kicker} {date && <><span className="sep" style={{ display: 'inline-block', width: 1, height: 11, background: 'var(--ink-faint)', margin: '0 8px', verticalAlign: 'middle' }} />{date}</>}
        </div>
        {headline && <h1>{headline}</h1>}
        {dek && <div className="pagehead__sub">{dek}</div>}
      </div>
      <div className="pagehead__meta">
        {sources && sources.map((s, i) =>
        <div key={i} className="pagehead__meta-row">
            {s.label}
            <strong>{s.value}</strong>
          </div>
        )}
      </div>
    </div>);

}

function SectionHd({ kicker, title, lead, roman }) {
  return (
    <div className="section__hd">
      <div className="section__num">
        <span className="sq" />
        {roman || '··'}
      </div>
      <h2 className="section__title">{title}</h2>
      {lead && <div className="section__aside">{lead}</div>}
    </div>);

}

// Legacy KPI alias → modern KPICard
function KPI({ label, value, unit, delta, deltaLabel = 'vs. prior', caption, spark, sparkColor = 'var(--ink)', sparkFloor = null, status, source, cite, onClick }) {
  const accent = status === 'bad' ? 'accent' :
  status === 'warn' ? 'warn' :
  status === 'ok' ? 'pos' :
  null;
  return (
    <KPICard
      label={label}
      value={value}
      delta={delta}
      deltaLabel={deltaLabel}
      caption={caption}
      spark={spark}
      sparkColor={sparkColor}
      sparkFloor={sparkFloor}
      accent={accent}
      onClick={onClick} />);


}

// ChapterIntro (legacy) → just renders as a PageHead
function ChapterIntro({ num, kicker, title, meta = [] }) {
  return (
    <PageHead
      mark={`CH ${num || '01'}`}
      eyebrow={kicker}
      title={title}
      meta={meta} />);


}

Object.assign(window, {
  Masthead, PageHead, Section, Hero, HeroSummary, HeroPortrait, HeroToday,
  KPICard, Finding, Range, VarianceFlag, rangeSlice, PRTSeal, PRTSLockup,
  CardInfo,
  // legacy
  Brief, SectionHd, KPI, ChapterIntro
});