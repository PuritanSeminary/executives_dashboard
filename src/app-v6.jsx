// app-v6.jsx — Strict Bauhaus dashboard wiring.
// Tweaks: layout variant (sidebar/top), default date range.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "brand",
  "theme": "light",
  "user": "neele",
  "defaultRange": "5y",
  "editStyle": "homescreen"
}/*EDITMODE-END*/;

// ── Cmd+K palette ────────────────────────────────────
function CommandPalette({ open, onClose, onNav, onDrill }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);
  const D = window.PRTS_DATA;

  const items = React.useMemo(() => {
    const a = [
      { sect: 'Pages', kind: 'page', label: 'Overview',  i: '#', action: () => onNav('overview') },
      { sect: 'Pages', kind: 'page', label: 'Academic',  i: '#', action: () => onNav('academic') },
      { sect: 'Pages', kind: 'page', label: 'Personnel', i: '#', action: () => onNav('hr') },
      { sect: 'Pages', kind: 'page', label: 'Financial', i: '#', action: () => onNav('financial') },
      { sect: 'Pages', kind: 'page', label: 'Donations', i: '#', action: () => onNav('donations') },
      { sect: 'Metrics', kind: 'metric', label: 'Operating spend', i: '$', action: () => onDrill({ kind: 'op-spend' }) },
      { sect: 'Metrics', kind: 'metric', label: 'Donations',       i: '$', action: () => onDrill({ kind: 'donations' }) },
      { sect: 'Metrics', kind: 'metric', label: 'Investments',     i: '$', action: () => onDrill({ kind: 'investments' }) },
      { sect: 'Metrics', kind: 'metric', label: 'Personnel',       i: '$', action: () => onDrill({ kind: 'headcount' }) },
      { sect: 'Metrics', kind: 'metric', label: 'Enrollment',      i: '$', action: () => onDrill({ kind: 'enrollment' }) },
      { sect: 'Metrics', kind: 'metric', label: 'Tuition',         i: '$', action: () => onDrill({ kind: 'tuition' }) },
    ];
    D.finance.departments.forEach(d => a.push({
      sect: 'Departments', kind: 'dept', label: d.name + ' · ' + d.head, i: '·', action: () => onDrill({ kind: 'department', deptId: d.id })
    }));
    return a;
  }, [D, onNav, onDrill]);

  const filtered = React.useMemo(() => {
    if (!q.trim()) return items;
    const lc = q.toLowerCase();
    return items.filter(it => it.label.toLowerCase().includes(lc) || it.sect.toLowerCase().includes(lc));
  }, [items, q]);

  React.useEffect(() => {
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);
  React.useEffect(() => { setSel(0); }, [q]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[sel]; if (it) { it.action(); onClose(); } }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;
  const grouped = {};
  filtered.forEach(it => { (grouped[it.sect] = grouped[it.sect] || []).push(it); });
  let globalIdx = 0;
  return (
    <>
      <div className="cmdk__backdrop" onClick={onClose} />
      <div className="cmdk">
        <input ref={inputRef} className="cmdk__input"
          placeholder="Search pages, metrics, departments…"
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} />
        <div className="cmdk__list">
          {Object.entries(grouped).map(([sect, items]) => (
            <React.Fragment key={sect}>
              <div className="cmdk__sect">{sect}</div>
              {items.map(it => {
                const i = globalIdx++;
                return (
                  <div key={i} className="cmdk__item" aria-selected={i === sel}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => { it.action(); onClose(); }}>
                    <span className="cmdk__item-i">{it.i}</span>
                    <span className="cmdk__item-lbl">{it.label}</span>
                    <span className="cmdk__item-kind">{it.kind}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Top-nav variant (alternate layout from tweaks) ──
function TopMasthead({ chapter, onNav, badges = {}, onCmdK }) {
  return (
    <header style={{
      position: 'sticky',
      top: 3,
      zIndex: 30,
      background: 'var(--ink)',
      color: '#fff',
      borderBottom: '2px solid var(--red)',
    }}>
      <div style={{
        maxWidth: 'var(--col)',
        margin: '0 auto',
        padding: '14px var(--pad-x)',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PRTSeal size={32} />
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.005em', lineHeight: 1.2 }}>
            Puritan Reformed
            <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Theological Seminary</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 24 }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'academic', label: 'Academic' },
            { id: 'hr', label: 'Personnel' },
            { id: 'financial', label: 'Financial' },
            { id: 'donations', label: 'Donations' },
          ].map((n, i) => (
            <button key={n.id}
              aria-current={chapter === n.id ? 'page' : undefined}
              onClick={() => onNav(n.id)}
              style={{
                appearance: 'none',
                border: 0,
                background: chapter === n.id ? 'var(--red)' : 'transparent',
                color: '#fff',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}>
              <span style={{ opacity: 0.55, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>0{i + 1}</span>
              {n.label}
              {badges[n.id] && <span style={{ background: '#fff', color: 'var(--ink)', fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{badges[n.id]}</span>}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button onClick={onCmdK} style={{
          appearance: 'none',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          padding: '6px 12px',
          fontFamily: 'var(--sans)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          borderRadius: 0,
        }}>Search ⌘K</button>
        <span style={{
          fontFamily: 'var(--sans)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
        }}>
          <i style={{ width: 6, height: 6, background: 'var(--pos)', display: 'inline-block' }} />
          Synced 04:12 GMT
        </span>
      </div>
    </header>
  );
}

function App() {
  const D = window.PRTS_DATA;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Read chapter from URL on mount so deep-links work (e.g. ?chapter=financial)
  const initialChapter = (() => {
    const m = window.location.search.match(/[?&]chapter=([a-z]+)/);
    if (m && ['overview','financial','donations','hr','academic','help'].includes(m[1])) return m[1];
    return 'overview';
  })();
  const [chapter, setChapter] = React.useState(initialChapter);

  const [rangeId, setRangeId] = React.useState(t.defaultRange || '5y');
  const [drill, setDrill] = React.useState(null);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // Manual data refresh — re-pulls figures and stamps a new sync time.
  // dataVersion bumps force the view tree to re-read window.PRTS_DATA.
  const [syncTime, setSyncTime] = React.useState('04:12 GMT');
  const [refreshing, setRefreshing] = React.useState(false);
  const [, setDataVersion] = React.useState(0);
  const handleRefresh = React.useCallback(() => {
    setRefreshing((busy) => {
      if (busy) return busy; // ignore re-entrant clicks while a pull is in flight
      // Simulate the round-trip to the proxy/cache, then commit the new data.
      window.setTimeout(async () => {
        const applied = window.PRTS_HYDRATE ? await window.PRTS_HYDRATE() : false;
        const meta = window.PRTS_DATA.meta || {};
        if (applied) {
          const stamp = meta.lastRefresh;
          setSyncTime(stamp);
          setDataVersion((v) => v + 1);
          setToast({ kind: 'ok', text: 'Data refreshed — ' + stamp });
        } else if (meta.financialLive) {
          // Live data already loaded but the endpoint is unreachable now. Keep the
          // last successful cached figures on screen — do NOT fall back to mock.
          setToast({ kind: 'bad', text: 'Could not reach live data — showing last update' });
        } else {
          // No successful pull yet, so the figures are sample data: run the mock sim.
          const stamp = window.PRTS_API.refresh();
          setSyncTime(stamp);
          setDataVersion((v) => v + 1);
          setToast({ kind: 'ok', text: 'Sample data refreshed — ' + stamp });
        }
        setRefreshing(false);
        window.setTimeout(() => setToast(null), 2400);
      }, 850);
      return true;
    });
  }, []);

  // On mount, hydrate the Financial figures from the live backend cache (SKY
  // query 71 -> Blob -> /api/financial). Silently keeps the mock data if the
  // endpoint isn't ready; bumps dataVersion so the view tree re-reads PRTS_DATA.
  React.useEffect(() => {
    let cancelled = false;
    if (typeof window.PRTS_HYDRATE !== 'function') return undefined;
    window.PRTS_HYDRATE().then((applied) => {
      if (cancelled || !applied) return;
      setDataVersion((v) => v + 1);
      if (window.PRTS_DATA.meta && window.PRTS_DATA.meta.lastRefresh) {
        setSyncTime(window.PRTS_DATA.meta.lastRefresh);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Keep URL in sync with current chapter (so Share copies a meaningful link)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('chapter', chapter);
    const url = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', url);
  }, [chapter]);

  // Export = print to PDF via the browser's native dialog.
  // The print stylesheet (in styles-v6.css) hides chrome and lays the
  // report out cleanly across pages.
  const handleExport = React.useCallback(() => {
    window.print();
  }, []);

  // Share = copy a deep-link to the current view to clipboard.
  // Falls back to a share modal if clipboard API is blocked (iframes,
  // some browsers) so the user can still copy manually.
  const [shareOpen, setShareOpen] = React.useState(false);
  const handleShare = React.useCallback(async () => {
    const url = window.location.href;
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch (e) { /* fall through */ }
    }
    if (!copied) {
      // execCommand fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
    }
    if (copied) {
      setToast({ kind: 'ok', text: 'Link copied — ' + chapter + ' view' });
      setTimeout(() => setToast(null), 2400);
    } else {
      // Open dialog with manual copy
      setShareOpen(true);
    }
  }, [chapter]);

  // Allow Cmd/Ctrl+P (browser print) to use our print styles too — no work,
  // browsers honour print stylesheets automatically.

  const U = window.PRTS_USERS[t.user] || window.PRTS_USERS.neele;

  // ── Overview customization (per-user, opt-in) ─────
  const { layout: overviewLayout, setLayout: setOverviewLayout, resetLayout: resetOverviewLayout, isCustomized: overviewCustomized } = window.useOverviewLayout(U.id);
  const [editingOverview, setEditingOverview] = React.useState(false);
  // Exit edit mode if the user navigates away from the overview tab
  React.useEffect(() => { if (chapter !== 'overview') setEditingOverview(false); }, [chapter]);
  // Track edit mode on body so global CSS can dim the rest
  React.useEffect(() => {
    const active = editingOverview && chapter === 'overview';
    document.body.classList.toggle('editing-overview', active);
    // Also mirror the editStyle so CSS can scope iOS-jiggle vs. editorial.
    const style = (t.editStyle || 'editorial');
    document.body.classList.toggle('edit-homescreen', active && style === 'homescreen');
    document.body.classList.toggle('edit-editorial',  active && style === 'editorial');
    document.body.classList.toggle('edit-tactile',    active && style === 'tactile');
    return () => {
      document.body.classList.remove('editing-overview', 'edit-homescreen', 'edit-editorial', 'edit-tactile');
    };
  }, [editingOverview, chapter, t.editStyle]);
  // Exit edit mode when switching users (their layout differs)
  React.useEffect(() => { setEditingOverview(false); }, [U.id]);

  // Track which signals have been "seen" (visited tab cleared them).
  // Persisted per-user in localStorage so refreshes/logins keep state.
  const seenKey = 'prts.seenSignals.' + U.id;
  const snoozedKey = 'prts.snoozedSignals.' + U.id;
  const notesKey = 'prts.signalNotes.' + U.id;
  const [seenIds, setSeenIds] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey) || '[]')); }
    catch (e) { return new Set(); }
  });
  const [snoozedIds, setSnoozedIds] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(snoozedKey) || '[]')); }
    catch (e) { return new Set(); }
  });
  const [notes, setNotes] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(notesKey) || '{}'); }
    catch (e) { return {}; }
  });
  React.useEffect(() => {
    try { setSeenIds(new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'))); } catch (e) { setSeenIds(new Set()); }
    try { setSnoozedIds(new Set(JSON.parse(localStorage.getItem(snoozedKey) || '[]'))); } catch (e) { setSnoozedIds(new Set()); }
    try { setNotes(JSON.parse(localStorage.getItem(notesKey) || '{}')); } catch (e) { setNotes({}); }
  }, [seenKey, snoozedKey, notesKey]);

  const markSeen = React.useCallback((ids) => {
    setSeenIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try { localStorage.setItem(seenKey, JSON.stringify([...next])); } catch (e) {}
      return next;
    });
  }, [seenKey]);

  const snoozeSignal = React.useCallback((id) => {
    setSnoozedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(snoozedKey, JSON.stringify([...next])); } catch (e) {}
      return next;
    });
  }, [snoozedKey]);

  const setSignalNote = React.useCallback((id, text) => {
    setNotes(prev => {
      const next = { ...prev };
      if (text && text.trim()) next[id] = text.trim();
      else delete next[id];
      try { localStorage.setItem(notesKey, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, [notesKey]);

  const resetSeen = React.useCallback(() => {
    try { localStorage.removeItem(seenKey); } catch (e) {}
    try { localStorage.removeItem(snoozedKey); } catch (e) {}
    setSeenIds(new Set());
    setSnoozedIds(new Set());
  }, [seenKey, snoozedKey]);

  // When the user changes the default range tweak, also apply it now
  React.useEffect(() => { setRangeId(t.defaultRange || '5y'); }, [t.defaultRange]);

  // Apply layout variant + theme to body / html
  React.useEffect(() => {
    document.body.classList.remove('layout-bauhaus', 'layout-editorial', 'layout-editorial-compact', 'layout-compact', 'layout-top', 'layout-brand', 'layout-brand-compact');
    const lay = t.layout || 'bauhaus';
    document.body.classList.add('layout-' + lay);
    // Brand Compact inherits the full Brand treatment, then layers density on top.
    if (lay === 'brand-compact') document.body.classList.add('layout-brand');
  }, [t.layout]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme || 'light');
  }, [t.theme]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => { window.scrollTo(0, 0); }, [chapter]);

  // Notification counts per nav item — driven by the signals engine so
  // the badges stay consistent with what's flagged on the overview.
  // Badges only count UNSEEN signals — visiting a tab clears its badge.
  const signals = (window.getSignals ? window.getSignals(D) : []).filter(s => !snoozedIds.has(s.id));

  const SIGNAL_TAB = (s) => {
    if (s.id.startsWith('budget-') || s.id.startsWith('grant-') || s.id === 'tuition-discount') return 'financial';
    if (s.id === 'donations-high' || s.id === 'recurring-high') return 'donations';
    if (s.id.startsWith('pos-')) return 'hr';
    if (s.id.startsWith('enroll-')) return 'academic';
    return null;
  };

  const badges = React.useMemo(() => {
    const b = { financial: 0, donations: 0, hr: 0, academic: 0 };
    signals.forEach(s => {
      const tab = SIGNAL_TAB(s);
      if (!tab) return;
      const needsAttention = !seenIds.has(s.id);
      if (needsAttention) b[tab]++;
    });
    return {
      financial: b.financial || null,
      donations: b.donations || null,
      hr: b.hr || null,
      academic: b.academic || null,
    };
  }, [signals, seenIds]);

  // When the user navigates to a chapter, mark its signals as seen.
  // (Do NOT auto-mark shared notes as read here — a tab visit is not the same
  // as actually reading the note. Shared notes only clear when the user
  // explicitly opens the signal.)
  const goToChapter = React.useCallback((nextChapter) => {
    setChapter(nextChapter);
    const inTab = signals.filter(s => SIGNAL_TAB(s) === nextChapter);
    if (inTab.length) markSeen(inTab.map(s => s.id));
  }, [signals, markSeen]);

  const useTopLayout = false; // top-nav variant retired; layout picker handles it now

  return (
    <>
      {/* Ambient Bauhaus motion layer — books, coins, geometric glyphs drift up */}
      <BackgroundMotion density={22} opacity={0.28} />

      <Masthead
        chapter={chapter}
        onNav={goToChapter}
        badges={badges}
        onCmdK={() => setCmdOpen(true)}
        layout={t.layout}
        onLayoutChange={(v) => setTweak('layout', v)}
        theme={t.theme}
        onThemeChange={(v) => setTweak('theme', v)}
        user={U}
        onUserChange={(v) => setTweak('user', v)}
        onExport={handleExport}
        onShare={handleShare}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        syncTime={syncTime}
        navEditing={editingOverview && chapter === 'overview'}
        navOrder={overviewLayout && overviewLayout.navOrder}
        onNavOrderChange={(order) => setOverviewLayout(prev => ({ ...prev, navOrder: order }))}
      />

      <main className="report">
        {chapter === 'overview'  && <OverviewView  rangeId={rangeId} onDrill={setDrill} user={U} onSnooze={snoozeSignal} notes={notes} onSetNote={setSignalNote} layout={overviewLayout} setLayout={setOverviewLayout} editing={editingOverview} setEditing={setEditingOverview} resetLayout={resetOverviewLayout} isCustomized={overviewCustomized} editStyle={t.editStyle} />}
        {chapter === 'financial' && <FinancialView rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'donations' && <DonationsView rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'hr'        && <HRView        rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'academic'  && <AcademicView  rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'help'      && <HelpView      user={U} />}

        <div className="colophon">
          <div className="colophon__brand">
            <PRTSeal size={36} />
            <div className="colophon__brand-text">
              Puritan Reformed Theological Seminary
              <em>2965 Leonard Street NE · Grand Rapids, Michigan 49525 · prts.edu</em>
            </div>
          </div>
          <span>A Lived Theology.</span>
        </div>
      </main>

      {drill && <Drilldown
        payload={drill}
        onClose={() => setDrill(null)}
        user={U}
        privateNotes={notes}
        onSetPrivateNote={setSignalNote}
      />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNav={setChapter} onDrill={setDrill} />

      {toast && (
        <div className={'toast toast--' + toast.kind} role="status">
          <span className="toast__sq" />
          {toast.text}
        </div>
      )}

      {shareOpen && <ShareDialog url={window.location.href} chapter={chapter} onClose={() => setShareOpen(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="User">
          <TweakSelect
            label="View as"
            value={t.user}
            onChange={(v) => setTweak('user', v)}
            options={[
              { label: 'Dr. Neele (President)',    value: 'neele' },
              { label: 'Dr. Bilkes (Vice President)', value: 'bilkes' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Interface">
          <TweakSelect
            label="Layout"
            value={t.layout}
            onChange={(v) => setTweak('layout', v)}
            options={[
              { label: 'Editorial',         value: 'editorial' },
              { label: 'Editorial Compact', value: 'editorial-compact' },
              { label: 'Brand',             value: 'brand' },
              { label: 'Brand Compact',     value: 'brand-compact' },
            ]}
          />
          <TweakRadio
            label="Theme"
            value={t.theme}
            onChange={(v) => setTweak('theme', v)}
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark',  value: 'dark' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Defaults">
          <TweakSelect
            label="Default date range"
            value={t.defaultRange}
            onChange={(v) => setTweak('defaultRange', v)}
            options={[
              { label: '5 Years',  value: '5y' },
              { label: '3 Years',  value: '3y' },
              { label: '1 Year',   value: '1y' },
              { label: 'YTD',      value: 'ytd' },
              { label: 'MTD',      value: 'mtd' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Behaviour">
          <TweakButton label="Open command palette (⌘K)" onClick={() => setCmdOpen(true)} />
          <TweakButton label="Reset read badges" onClick={resetSeen} />
        </TweakSection>
        <TweakSection label="Overview edit mode">
          <TweakRadio
            label="Style while editing"
            value={t.editStyle}
            onChange={(v) => setTweak('editStyle', v)}
            options={[
              { label: 'Homescreen', value: 'homescreen' },
              { label: 'Editorial',  value: 'editorial' },
              { label: 'Tactile',    value: 'tactile' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ── Share dialog ─────────────────────────────────────
function ShareDialog({ url, chapter, onClose }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    setTimeout(() => { inputRef.current?.select(); }, 50);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const copy = async () => {
    if (!inputRef.current) return;
    inputRef.current.select();
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      try { document.execCommand('copy'); } catch (er) {}
    }
  };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.36)', zIndex: 250 }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(540px, 92vw)', zIndex: 251,
        background: 'var(--paper)', border: '1px solid var(--ink)',
        boxShadow: '0 30px 64px -16px rgba(28,28,28,0.36)',
      }}>
        <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid var(--ink)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>Share link</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.012em' }}>Send this view to a colleague</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4, lineHeight: 1.45 }}>
              Anyone with this link opens the workspace on the <strong style={{ color: 'var(--ink-2)' }}>{chapter}</strong> tab.
            </div>
          </div>
          <button onClick={onClose} className="drill__close" aria-label="Close">✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            style={{
              fontFamily: 'var(--mono)', fontSize: 12, padding: '10px 12px',
              border: '1px solid var(--rule)', background: 'var(--vellum)',
              color: 'var(--ink-2)', outline: 'none', borderRadius: 0,
              width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="topbar__btn">Done</button>
            <button onClick={copy} className="topbar__btn topbar__btn--primary">Copy link</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
            If the Copy button doesn't work in your browser, the link is selected — press ⌘C / Ctrl+C.
          </div>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
