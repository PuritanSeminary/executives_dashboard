// views-overview-v6.jsx — strict Bauhaus overview, NOW per-user customizable.
//
// Each section is rendered through the layout state (see overview-customize.jsx):
//   layout.sections    — order + visibility of the 5 numbered sections
//   layout.kpiOrder    — which KPIs appear in the band and in what order
//   layout.heroId      — which metric is the big hero number
//   layout.agendaPos   — 'left' | 'top' | 'hidden'
//
// In edit mode, sections gain a dark chrome bar (drag handle + eye), KPI tiles
// gain a corner-X + drag-swap, the hero shows a "Change metric" picker, and a
// side palette lists hidden modules + extra KPIs to add back.

function toRoman(n) {
  const map = [['x',10],['ix',9],['v',5],['iv',4],['i',1]];
  let s = '';
  for (const [r, v] of map) { while (n >= v) { s += r; n -= v; } }
  return s;
}

function sumLast(arr, n) { return arr.slice(arr.length - n).reduce((s, v) => s + v, 0); }

// CustomizeSlot — portals the rest-state Customize button into the sidebar
// slot (#sidebar-customize-slot) rendered by the Masthead. The slot only
// exists once the Masthead mounts, so we resolve it in a layout effect.
function CustomizeSlot({ editing, isCustomized, onToggle }) {
  const [slot, setSlot] = React.useState(null);
  React.useLayoutEffect(() => {
    setSlot(document.getElementById('sidebar-customize-slot'));
  }, []);
  if (editing) return null;
  if (!slot) return null;
  return ReactDOM.createPortal(
    <CustomizeBar
      editing={false}
      onToggle={onToggle}
      isCustomized={isCustomized}
    />,
    slot
  );
}

function OverviewView({
  rangeId, onDrill, user, onSnooze,
  notes = {}, onSetNote,
  sharedNotes = {}, onPostSharedNote,
  unreadSharedIds, onMarkSharedRead,
  // ── customization ──
  layout, setLayout, editing, setEditing, resetLayout, isCustomized, editStyle,
}) {
  const D = window.PRTS_DATA;
  const U = user || window.PRTS_USERS.neele;
  const months = D.months;

  // Library + helpers (also defined in overview-customize.jsx)
  const kpiLib  = React.useMemo(() => window.buildKpiLibrary(D), [D]);
  const heroLib = React.useMemo(() => window.buildHeroLibrary(D), [D]);
  const kpiById = React.useMemo(() => Object.fromEntries(kpiLib.map(k => [k.id, k])), [kpiLib]);

  // ── Signals (unchanged from prior version) ─────────
  const signals = React.useMemo(() => window.getSignals ? window.getSignals(D) : [], [D]);
  const attention = signals.slice(0, 3);
  const flagged = signals.slice(3);

  const flaggedRef = React.useRef(null);
  const [flaggedAt, setFlaggedAt] = React.useState(0);
  const stepFlagged = (dir) => {
    const el = flaggedRef.current;
    if (!el) return;
    const card = el.querySelector('.finding');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth / 3;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  React.useEffect(() => {
    const el = flaggedRef.current;
    if (!el) return;
    const onScroll = () => setFlaggedAt(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const openSignal = (sig) => {
    if (onMarkSharedRead) onMarkSharedRead(sig.id);
    onDrill({ kind: 'signal-detail', signal: sig });
  };
  const openGift = (g) => onDrill({ kind: 'gift-detail', gift: g });
  const openAgenda = (it) => onDrill({ kind: 'agenda-detail', item: it, user: U });

  // ── Time-of-day greeting + date ────────────────────
  const { greeting, todayDay, todayMonth, todayWeekday, todayLong, todayShort } = React.useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return {
      greeting: g,
      todayDay:     now.toLocaleDateString('en-US', { day: 'numeric' }),
      todayMonth:   now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      todayWeekday: now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      todayLong:    now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      todayShort:   now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  }, []);

  // ── Customization helpers ──────────────────────────
  const safeLayout = layout || window.DEFAULT_LAYOUT;
  const sections = safeLayout.sections;
  const visibleSections = sections.filter(s => s.visible);
  const hiddenSections = sections.filter(s => !s.visible);

  const visibleKpiIds = safeLayout.kpiOrder.filter(id => kpiById[id]);
  const hiddenKpis = kpiLib.filter(k => !visibleKpiIds.includes(k.id));

  const heroDef = heroLib.find(h => h.id === safeLayout.heroId) || heroLib[0];

  const updateLayout = (patch) => {
    if (!setLayout) return;
    setLayout(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  };
  const updateSections = (fn) => updateLayout(prev => ({ sections: fn(prev.sections) }));
  const updateKpis = (fn) => updateLayout(prev => ({ kpiOrder: fn(prev.kpiOrder) }));

  const hideSection = (id) => updateSections(secs => secs.map(s => s.id === id ? { ...s, visible: false } : s));
  const showSection = (id) => updateSections(secs => secs.map(s => s.id === id ? { ...s, visible: true } : s));

  const removeKpi = (id) => updateKpis(order => order.filter(x => x !== id));
  const addKpi = (id) => updateKpis(order => order.length >= 6 ? order : [...order, id]);

  const setHero = (id) => updateLayout({ heroId: id });
  const setAgendaPos = (pos) => updateLayout({ agendaPos: pos });

  // ── Row-level customization (departments, gifts, findings) ──
  const hideDept = (id) => updateLayout(prev => ({ deptHidden: [...(prev.deptHidden || []), id] }));
  const showDept = (id) => updateLayout(prev => ({ deptHidden: (prev.deptHidden || []).filter(x => x !== id) }));
  const reorderDepts = (fromId, toId, edge) => updateLayout(prev => {
    const sorted = [...D.finance.departments].sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance));
    const baseline = sorted.map(d => d.id);
    const current = window.applyOrderHide(sorted, d => d.id, prev.deptOrder, prev.deptHidden || []).map(d => d.id);
    const fromIdx = current.indexOf(fromId);
    let toIdx = current.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return {};
    if (edge === 'below') toIdx = toIdx + (fromIdx < toIdx ? 0 : 1);
    else                  toIdx = toIdx + (fromIdx < toIdx ? -1 : 0);
    toIdx = Math.max(0, Math.min(current.length - 1, toIdx));
    return { deptOrder: window.moveItem(current, fromIdx, toIdx) };
  });

  const hideGift = (idx) => updateLayout(prev => ({ giftHidden: [...(prev.giftHidden || []), idx] }));
  const showGift = (idx) => updateLayout(prev => ({ giftHidden: (prev.giftHidden || []).filter(x => x !== idx) }));
  const reorderGifts = (fromIdx, toIdx, edge) => updateLayout(prev => {
    const baseline = D.donations.recentGifts.slice(0, 10).map((_, i) => i);
    const visible = baseline.filter(i => !(prev.giftHidden || []).includes(i));
    const order = prev.giftOrder
      ? prev.giftOrder.filter(i => visible.includes(i)).concat(visible.filter(i => !prev.giftOrder.includes(i)))
      : visible.slice();
    const fIdx = order.indexOf(fromIdx);
    let tIdx = order.indexOf(toIdx);
    if (fIdx < 0 || tIdx < 0) return {};
    if (edge === 'below') tIdx = tIdx + (fIdx < tIdx ? 0 : 1);
    else                  tIdx = tIdx + (fIdx < tIdx ? -1 : 0);
    tIdx = Math.max(0, Math.min(order.length - 1, tIdx));
    return { giftOrder: window.moveItem(order, fIdx, tIdx) };
  });

  const hideSignal = (id) => updateLayout(prev => ({ signalHidden: [...(prev.signalHidden || []), id] }));
  const showSignal = (id) => updateLayout(prev => ({ signalHidden: (prev.signalHidden || []).filter(x => x !== id) }));
  const reorderSignals = (fromId, toId, edge) => updateLayout(prev => {
    const flagged0 = signals.slice(3);
    const visible = flagged0.filter(s => !(prev.signalHidden || []).includes(s.id)).map(s => s.id);
    const order = prev.signalOrder
      ? prev.signalOrder.filter(id => visible.includes(id)).concat(visible.filter(id => !prev.signalOrder.includes(id)))
      : visible.slice();
    const fIdx = order.indexOf(fromId);
    let tIdx = order.indexOf(toId);
    if (fIdx < 0 || tIdx < 0) return {};
    if (edge === 'below') tIdx = tIdx + (fIdx < tIdx ? 0 : 1);
    else                  tIdx = tIdx + (fIdx < tIdx ? -1 : 0);
    tIdx = Math.max(0, Math.min(order.length - 1, tIdx));
    return { signalOrder: window.moveItem(order, fIdx, tIdx) };
  });

  // Generic row-drag state (one at a time across whole page)
  const [rowDrag, setRowDrag] = React.useState(null); // { kind, fromId }
  const [rowDropTarget, setRowDropTarget] = React.useState(null); // { kind, toId, edge }
  const rowDragProps = (kind, id) => editing ? {
    draggable: true,
    onDragStart: (e) => {
      setRowDrag({ kind, fromId: id });
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', kind + ':' + id); } catch (err) {}
    },
    onDragOver: (e) => {
      if (!rowDrag || rowDrag.kind !== kind || rowDrag.fromId === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const edge = (e.clientY - rect.top) < rect.height / 2 ? 'above' : 'below';
      setRowDropTarget(prev => (prev && prev.kind === kind && prev.toId === id && prev.edge === edge) ? prev : { kind, toId: id, edge });
    },
    onDrop: (e) => {
      e.preventDefault();
      if (!rowDrag || rowDrag.kind !== kind || rowDrag.fromId === id) { setRowDrag(null); setRowDropTarget(null); return; }
      const edge = (rowDropTarget && rowDropTarget.kind === kind && rowDropTarget.toId === id) ? rowDropTarget.edge : 'below';
      if (kind === 'dept')   reorderDepts(rowDrag.fromId, id, edge);
      if (kind === 'gift')   reorderGifts(rowDrag.fromId, id, edge);
      if (kind === 'signal') reorderSignals(rowDrag.fromId, id, edge);
      setRowDrag(null); setRowDropTarget(null);
    },
    onDragEnd: () => { setRowDrag(null); setRowDropTarget(null); },
  } : {};

  // Visible / hidden lists for departments + gifts + signals
  const deptsSorted = React.useMemo(
    () => [...D.finance.departments].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
    [D]
  );
  const deptsVisible = window.applyOrderHide(deptsSorted, d => d.id, safeLayout.deptOrder, safeLayout.deptHidden);
  const deptsHiddenList = deptsSorted.filter(d => (safeLayout.deptHidden || []).includes(d.id));

  const giftsAll = D.donations.recentGifts.slice(0, 10).map((g, i) => ({ ...g, idx: i }));
  const giftsVisible = window.applyOrderHide(giftsAll, g => g.idx, safeLayout.giftOrder, safeLayout.giftHidden);
  const giftsHiddenList = giftsAll.filter(g => (safeLayout.giftHidden || []).includes(g.idx));

  // ── Drag-and-drop state for sections ───────────────
  const [draggingSecId, setDraggingSecId] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null); // { id, edge: 'above' | 'below' }

  const onSectionDragStart = (id) => (e) => {
    setDraggingSecId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch (err) {}
  };
  const onSectionDragOver = (id) => (e) => {
    if (!draggingSecId || draggingSecId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const edge = (e.clientY - rect.top) < rect.height / 2 ? 'above' : 'below';
    setDropTarget(prev => (prev && prev.id === id && prev.edge === edge) ? prev : { id, edge });
  };
  const onSectionDragLeave = () => {};
  const onSectionDrop = (id) => (e) => {
    e.preventDefault();
    if (!draggingSecId || draggingSecId === id) { setDraggingSecId(null); setDropTarget(null); return; }
    const fromIdx = sections.findIndex(s => s.id === draggingSecId);
    let toIdx = sections.findIndex(s => s.id === id);
    if (dropTarget && dropTarget.edge === 'below') toIdx = toIdx + (fromIdx < toIdx ? 0 : 1);
    else                                            toIdx = toIdx + (fromIdx < toIdx ? -1 : 0);
    toIdx = Math.max(0, Math.min(sections.length - 1, toIdx));
    updateSections(secs => window.moveItem(secs, fromIdx, toIdx));
    setDraggingSecId(null);
    setDropTarget(null);
  };
  const onSectionDragEnd = () => { setDraggingSecId(null); setDropTarget(null); };

  // ── Drag-and-drop state for KPI tiles ──────────────
  const [draggingKpiId, setDraggingKpiId] = React.useState(null);
  const [kpiSwapTarget, setKpiSwapTarget] = React.useState(null);
  const onKpiDragStart = (id) => (e) => {
    setDraggingKpiId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'kpi:' + id); } catch (err) {}
  };
  const onKpiDragOver = (id) => (e) => {
    if (!draggingKpiId || draggingKpiId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (kpiSwapTarget !== id) setKpiSwapTarget(id);
  };
  const onKpiDrop = (id) => (e) => {
    e.preventDefault();
    if (!draggingKpiId || draggingKpiId === id) { setDraggingKpiId(null); setKpiSwapTarget(null); return; }
    const aIdx = visibleKpiIds.indexOf(draggingKpiId);
    const bIdx = visibleKpiIds.indexOf(id);
    if (aIdx < 0 || bIdx < 0) { setDraggingKpiId(null); setKpiSwapTarget(null); return; }
    updateKpis(order => {
      const next = order.slice();
      [next[aIdx], next[bIdx]] = [next[bIdx], next[aIdx]];
      return next;
    });
    setDraggingKpiId(null);
    setKpiSwapTarget(null);
  };
  const onKpiDragEnd = () => { setDraggingKpiId(null); setKpiSwapTarget(null); };

  // ── Render helpers for each section ────────────────
  const opSpend = D.finance.operatingSpend;
  const donTotal = D.donations.total;

  const renderKpiBand = (visibleNum) => (
    <Section
      num={visibleNum}
      title="Performance overview"
      aside="Six leading indicators. Click any to descend into the trend."
    >
      <div className="kpis">
        {visibleKpiIds.map(id => {
          const k = kpiById[id];
          if (!k) return null;
          const dragProps = editing ? {
            draggable: true,
            onDragStart: onKpiDragStart(id),
            onDragOver: onKpiDragOver(id),
            onDrop: onKpiDrop(id),
            onDragEnd: onKpiDragEnd,
          } : null;
          return (
            <KpiTileFrame
              key={id}
              id={id}
              editing={editing}
              onRemove={removeKpi}
              dragProps={dragProps}
              isDragging={draggingKpiId === id}
              swapTarget={kpiSwapTarget === id}
            >
              <KPICard {...k.props} onClick={editing ? undefined : () => onDrill(k.drill)} />
            </KpiTileFrame>
          );
        })}
      </div>
    </Section>
  );

  const renderFlagged = (visibleNum) => {
    const hidden = new Set(safeLayout.signalHidden || []);
    const flaggedFiltered = flagged.filter(s => !hidden.has(s.id));
    const ordered = safeLayout.signalOrder
      ? safeLayout.signalOrder.map(id => flaggedFiltered.find(s => s.id === id)).filter(Boolean)
          .concat(flaggedFiltered.filter(s => !safeLayout.signalOrder.includes(s.id)))
      : flaggedFiltered;
    return (
    <Section
      num={visibleNum}
      title="Flagged this week"
      aside={<>Surfaced from {signals.length} active signals. Each card cites the rule that triggered it.</>}
    >
      <div className="findings findings--scroll">
        {ordered.length > 3 && (
          <>
            <button type="button" className="findings__nav findings__nav--prev"
              aria-label="Previous flagged items" onClick={() => stepFlagged(-1)} disabled={flaggedAt <= 0}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" className="findings__nav findings__nav--next"
              aria-label="Next flagged items" onClick={() => stepFlagged(1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </>
        )}
        <div className="findings__track" ref={flaggedRef}>
          {ordered.length > 0 ? ordered.map((s, i) => {
            const dragProps = rowDragProps('signal', s.id);
            const isDragging = rowDrag && rowDrag.kind === 'signal' && rowDrag.fromId === s.id;
            const isDropTarget = rowDropTarget && rowDropTarget.kind === 'signal' && rowDropTarget.toId === s.id;
            return (
              <div key={s.id} className={'finding-wrap' + (isDragging ? ' finding-wrap--dragging' : '') + (isDropTarget ? ' finding-wrap--target' : '')} {...dragProps}>
                {editing && (
                  <div className="finding-wrap__chrome">
                    <span className="finding-wrap__grip" title="Drag to reorder">
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                        <circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/>
                        <circle cx="3" cy="7" r="1.4"/><circle cx="9" cy="7" r="1.4"/>
                        <circle cx="3" cy="11" r="1.4"/><circle cx="9" cy="11" r="1.4"/>
                      </svg>
                    </span>
                    <button type="button" className="finding-wrap__hide" onClick={(e) => { e.stopPropagation(); hideSignal(s.id); }} title="Hide this card">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
                    </button>
                  </div>
                )}
                <Finding
                  num={toRoman(i + 1)}
                  kicker={s.rule}
                  cite={{ source: s.source, lead: '—' }}
                  onDismiss={editing ? null : () => onSnooze && onSnooze(s.id)}
                  onExpand={editing ? null : () => openSignal(s)}
                  note={notes[s.id]}
                  onNoteChange={editing ? null : (text) => onSetNote && onSetNote(s.id, text)}
                  sharedNote={sharedNotes && sharedNotes[s.id]}
                  onPostSharedNote={editing ? null : (text) => onPostSharedNote && onPostSharedNote(s.id, text)}
                  otherUserName={U.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'}
                  currentUserId={U.id}
                  unreadShared={unreadSharedIds && unreadSharedIds.has(s.id)}
                >
                  <strong>{s.label}.</strong> {s.detail} {s.kind === 'bad' && <em>Recommend review at the next committee.</em>}
                </Finding>
              </div>
            );
          }) : (
            <Finding num="i" kicker="All clear" cite={{ source: 'Signal engine', lead: 'No rules tripped' }}>
              No flagged items this week. The data is within normal bands across every system.
            </Finding>
          )}
        </div>
      </div>
    </Section>
    );
  };

  const renderDepartments = (visibleNum) => (
    <Section
      num={visibleNum}
      title="Departments"
      aside="YTD spend against approved budgets, ordered by absolute variance."
    >
      <div className="block">
        <table className={'tbl' + (editing ? ' tbl--editing' : '')}>
          <thead>
            <tr>
              {editing && <th style={{ width: 22 }} aria-label="Drag" />}
              <th style={{ width: 36 }}>№</th>
              <th>Department</th>
              <th>Lead</th>
              <th style={{ width: 110 }}>Shape</th>
              <th style={{ textAlign: 'right' }}>YTD</th>
              <th style={{ textAlign: 'right' }}>Budget</th>
              <th style={{ textAlign: 'right' }}>Variance</th>
              {editing && <th style={{ width: 28 }} aria-label="Hide" />}
            </tr>
          </thead>
          <tbody>
            {deptsVisible.map((d, i) => {
              const col = d.variance > 0.10 ? 'var(--red)' : d.variance < -0.10 ? 'var(--warn)' : 'var(--ink-4)';
              const dragProps = rowDragProps('dept', d.id);
              const isDragging = rowDrag && rowDrag.kind === 'dept' && rowDrag.fromId === d.id;
              const isDropTarget = rowDropTarget && rowDropTarget.kind === 'dept' && rowDropTarget.toId === d.id;
              const rowCls = (isDragging ? 'tr--dragging ' : '') + (isDropTarget ? 'tr--target-' + rowDropTarget.edge : '');
              return (
                <tr key={d.id} className={rowCls.trim() || undefined} {...dragProps} onClick={editing ? undefined : () => onDrill({ kind: 'department', deptId: d.id })}>
                  {editing && (
                    <td className="tbl__grip" title="Drag to reorder">
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                        <circle cx="2.5" cy="3" r="1.1"/><circle cx="7.5" cy="3" r="1.1"/>
                        <circle cx="2.5" cy="7" r="1.1"/><circle cx="7.5" cy="7" r="1.1"/>
                        <circle cx="2.5" cy="11" r="1.1"/><circle cx="7.5" cy="11" r="1.1"/>
                      </svg>
                    </td>
                  )}
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
                  {editing && (
                    <td className="tbl__hide">
                      <button type="button" onClick={(e) => { e.stopPropagation(); hideDept(d.id); }} title="Hide this row">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );

  const renderChart = (visibleNum) => (
    <Section
      num={visibleNum}
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
  );

  const renderGifts = (visibleNum) => (
    <Section
      num={visibleNum}
      title="Recent gifts"
      aside="Last ten · all sources · anonymous donors counted but unattributed."
    >
      <div className="block">
        <table className={'tbl' + (editing ? ' tbl--editing' : '')}>
          <thead>
            <tr>
              {editing && <th style={{ width: 22 }} aria-label="Drag" />}
              <th style={{ width: 36 }}>№</th>
              <th style={{ width: 80 }}>Date</th>
              <th>Donor</th>
              <th>Fund</th>
              <th>Officer</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              {editing && <th style={{ width: 28 }} aria-label="Hide" />}
            </tr>
          </thead>
          <tbody>
            {giftsVisible.map((g, i) => {
              const dragProps = rowDragProps('gift', g.idx);
              const isDragging = rowDrag && rowDrag.kind === 'gift' && rowDrag.fromId === g.idx;
              const isDropTarget = rowDropTarget && rowDropTarget.kind === 'gift' && rowDropTarget.toId === g.idx;
              const rowCls = (isDragging ? 'tr--dragging ' : '') + (isDropTarget ? 'tr--target-' + rowDropTarget.edge : '');
              return (
                <tr key={g.idx} className={rowCls.trim() || undefined} {...dragProps} onClick={editing ? undefined : () => openGift(g)} style={{ cursor: editing ? 'default' : 'pointer' }}>
                  {editing && (
                    <td className="tbl__grip" title="Drag to reorder">
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                        <circle cx="2.5" cy="3" r="1.1"/><circle cx="7.5" cy="3" r="1.1"/>
                        <circle cx="2.5" cy="7" r="1.1"/><circle cx="7.5" cy="7" r="1.1"/>
                        <circle cx="2.5" cy="11" r="1.1"/><circle cx="7.5" cy="11" r="1.1"/>
                      </svg>
                    </td>
                  )}
                  <td className="tbl__idx">{String(i + 1).padStart(2, '0')}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{g.date}</td>
                  <td className="label">{g.donor}</td>
                  <td className="muted">{g.fund}</td>
                  <td className="muted">{g.fundraiser}</td>
                  <td className="num">${g.amount.toLocaleString()}</td>
                  {editing && (
                    <td className="tbl__hide">
                      <button type="button" onClick={(e) => { e.stopPropagation(); hideGift(g.idx); }} title="Hide this row">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );

  const sectionRenderers = {
    kpis: renderKpiBand,
    flagged: renderFlagged,
    depts: renderDepartments,
    chart: renderChart,
    gifts: renderGifts,
  };

  // ── Agenda block ───────────────────────────────────
  const agendaKicker = `Today · ${todayWeekday.charAt(0) + todayWeekday.slice(1).toLowerCase()} ${todayDay} ${todayMonth.charAt(0) + todayMonth.slice(1).toLowerCase()} · ${U.short}`;
  const agendaBlock = (modifierClass = '') => (
    <div className={'hero-today' + (modifierClass ? ' ' + modifierClass : '')}>
      <AgendaPosControl editing={editing} value={safeLayout.agendaPos} onChange={setAgendaPos} />
      <div className="hero-today__kicker">{agendaKicker}</div>
      <div className="hero-today__list">
        {U.agenda.map((it, i) => (
          <div key={i} className={'hero-today__row' + (editing ? '' : ' hero-today__row--click')}
            onClick={editing ? undefined : () => openAgenda(it)}
            role={editing ? undefined : 'button'} tabIndex={editing ? undefined : 0}>
            <div className="hero-today__time">{it.time}</div>
            <div className="hero-today__text">
              <strong>{it.label}</strong>
              <span>{it.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Edit-mode sticky bar (only renders when editing) */}
      {editing && (
        <CustomizeBar
          editing={true}
          onToggle={() => setEditing && setEditing(false)}
          onReset={resetLayout}
          isCustomized={isCustomized}
          editStyle={editStyle}
          userName={U.short}
        />
      )}

      {/* Workspace header — their home */}
      <div className="pagehead-row">
        <PageHead
          mark={<><span className="pagehead__mark-day">{todayDay}</span><span className="pagehead__mark-sub">{todayMonth}</span><span className="pagehead__mark-sub">{todayWeekday}</span></>}
          eyebrow={<><strong>{greeting}, {U.short}.</strong> &nbsp;·&nbsp; Today, {todayLong} · figures refreshed overnight.</>}
          title="Overview"
          meta={[
            { label: 'As of', value: todayShort },
            { label: 'Last refresh', value: 'Today, 04:12 GMT' },
            { label: 'Sources', value: "Financial Edge, Raiser's Edge, Paycor, Populi" },
          ]}
        />
        <CustomizeSlot
          editing={editing}
          isCustomized={isCustomized}
          onToggle={() => setEditing && setEditing(true)}
        />
      </div>

      {/* Agenda on top */}
      {safeLayout.agendaPos === 'top' && agendaBlock('hero-today--top')}

      {/* Hero row */}
      <div className={'hero-row' + (safeLayout.agendaPos !== 'left' ? ' hero-row--no-agenda' : '')}>
        {safeLayout.agendaPos === 'left' && agendaBlock()}
        <div style={{ position: 'relative' }}>
          <HeroPicker editing={editing} current={safeLayout.heroId} library={heroLib} onPick={setHero} />
          <Hero {...heroDef.props} onClick={editing ? undefined : () => onDrill(heroDef.drill)} />
        </div>
        <HeroSummary
          title="Needs your attention"
          rows={attention.map(s => ({
            id: s.id,
            tone: s.kind === 'bad' ? 'bad' : s.kind === 'good' ? 'good' : 'neutral',
            val: s.val,
            label: s.label,
            detail: s.detail,
            signal: s,
            unreadShared: unreadSharedIds && unreadSharedIds.has(s.id),
            sharedNoteAuthor: sharedNotes && sharedNotes[s.id]?.author,
          }))}
          onDismiss={editing ? null : onSnooze}
          onRowClick={editing ? null : (row) => openSignal(row.signal)}
          emptyText="All clear — nothing to flag this week."
        />
      </div>

      {/* Numbered sections — rendered in layout order */}
      {visibleSections.map((sec, i) => {
        const renderer = sectionRenderers[sec.id];
        if (!renderer) return null;
        const sectionEl = renderer(i + 1);
        const isDragging = draggingSecId === sec.id;
        const isDropTarget = dropTarget && dropTarget.id === sec.id;
        const dragProps = editing ? {
          draggable: true,
          onDragStart: onSectionDragStart(sec.id),
          onDragOver: onSectionDragOver(sec.id),
          onDragLeave: onSectionDragLeave,
          onDrop: onSectionDrop(sec.id),
          onDragEnd: onSectionDragEnd,
        } : null;
        return (
          <SectionFrame
            key={sec.id}
            id={sec.id}
            editing={editing}
            dragProps={dragProps}
            isDragging={isDragging}
            dropIndicator={isDropTarget ? dropTarget.edge : null}
            onHide={hideSection}
          >
            {sectionEl}
          </SectionFrame>
        );
      })}

      {/* Side palette in edit mode */}
      <ModulePalette
        editing={editing}
        hiddenSections={hiddenSections}
        hiddenKpis={hiddenKpis}
        kpiBandFull={visibleKpiIds.length >= 6}
        agendaHidden={safeLayout.agendaPos === 'hidden'}
        hiddenDepts={deptsHiddenList}
        hiddenGifts={giftsHiddenList}
        hiddenSignals={signals.filter(s => (safeLayout.signalHidden || []).includes(s.id))}
        onShowSection={showSection}
        onAddKpi={addKpi}
        onShowAgenda={() => setAgendaPos('left')}
        onShowDept={showDept}
        onShowGift={showGift}
        onShowSignal={showSignal}
        editStyle={editStyle}
      />
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

Object.assign(window, { OverviewView, COLOR_TOKENS, sumLast });
