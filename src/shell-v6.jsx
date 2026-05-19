// shell-v6.jsx — Strict Bauhaus dashboard primitives.
// Sidebar + topbar + section + KPI + Hero + B&W portrait.
// Component API matches v4/v5 (Masthead, Section, KPICard, Hero,
// Finding, etc.) so legacy view files keep working.

// ── PRTS official logo (filled scarlet square w/ pulpit+book) ─
function PRTSeal({ size = 40 }) {
  return (
    <img
      src="assets/prts-logo.png"
      width={size} height={size}
      alt="PRTS"
      style={{ display: 'block', width: size, height: size, objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

// ── Icons (small, neutral) ───────────────────────────
const Icon = {
  download: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  search: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
};

const NAV = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'financial', label: 'Financial' },
  { id: 'donations', label: 'Donations' },
  { id: 'hr',        label: 'Personnel' },
  { id: 'academic',  label: 'Academic'  },
];

const CHAPTER_TITLES = {
  overview:  'Overview',
  financial: 'Financial',
  donations: 'Donations',
  hr:        'Personnel',
  academic:  'Academic',
};

// ── Masthead: sidebar + topbar ───────────────────────
function Masthead({ chapter, onNav, badges = {}, onCmdK, layout = 'bauhaus', onLayoutChange, theme = 'light', onThemeChange, user, onUserChange, onExport, onShare }) {
  const [layoutOpen, setLayoutOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
  const layoutRef = React.useRef(null);
  const userRef = React.useRef(null);
  React.useEffect(() => {
    const close = (e) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target)) setLayoutOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const LAYOUTS = [
    { id: 'editorial', label: 'Editorial', note: 'Generous whitespace, larger type' },
    { id: 'compact',   label: 'Compact',   note: 'Dense for analysis' },
    { id: 'bauhaus',   label: 'Bauhaus',   note: 'Structural & color-blocked' },
  ];
  const current = LAYOUTS.find(l => l.id === layout) || LAYOUTS[0];
  const U = user || window.PRTS_USERS.neele;
  const USERS = Object.values(window.PRTS_USERS || {});

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <PRTSeal size={48} />
          <div className="sidebar__brand-text">
            Puritan Reformed
            <em>Theological Seminary</em>
          </div>
        </div>

        <button className="sidebar__cmdk" onClick={onCmdK}>
          <span style={{ display: 'inline-flex' }}>{Icon.search}</span>
          Search & jump
          <kbd>⌘K</kbd>
        </button>

        <div className="sidebar__section-lbl">Workspace</div>
        <nav className="sidebar__nav">
          {NAV.map((n, i) => (
            <button
              key={n.id}
              className="sidebar__item"
              aria-current={chapter === n.id ? 'page' : undefined}
              onClick={() => onNav(n.id)}
            >
              <span className="sidebar__item-num">0{i + 1}</span>
              <span className="sidebar__item-lbl">{n.label}</span>
              {badges[n.id] ? <span className="sidebar__item-badge">{badges[n.id]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        <div className="sidebar__user" ref={userRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setUserOpen(o => !o)}>
          <div className="sidebar__avatar">{U.initials}</div>
          <div className="sidebar__user-text">
            <strong>{U.short}</strong>
            <span>{U.role}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-4)', marginLeft: 'auto' }}>
            <polyline points={userOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
          {userOpen && (
            <div className="layout-picker__menu" style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)', top: 'auto',
              left: 8, right: 8, width: 'auto',
            }}>
              <div className="layout-picker__menu-hd">Switch user</div>
              {USERS.map(u => (
                <button key={u.id} className="layout-picker__opt" aria-selected={u.id === U.id}
                  onClick={(e) => { e.stopPropagation(); onUserChange?.(u.id); setUserOpen(false); }}>
                  <span className="layout-picker__opt-tick">{u.id === U.id ? '●' : '○'}</span>
                  <span className="layout-picker__opt-text">
                    <strong>{u.name}</strong>
                    <em>{u.role}</em>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar__plate">
          <div className="sidebar__plate-square" />
          <div className="sidebar__plate-text">
            A Lived Theology.
            <em>Est. 1995 · Grand Rapids</em>
          </div>
        </div>
      </aside>

      <div className="topbar">
        <div className="topbar__inner">
          <div className="topbar__crumb">
            <span className="sq" />
            PRTS Workspace
            <span className="sep" />
            <strong>{CHAPTER_TITLES[chapter] || chapter}</strong>
          </div>
          <div className="topbar__spacer" />

          {/* Interface picker */}
          <div className="layout-picker" ref={layoutRef}>
            <button className="layout-picker__btn" onClick={() => setLayoutOpen(o => !o)} aria-expanded={layoutOpen}>
              <span className="layout-picker__lbl">Interface</span>
              <strong>{current.label}</strong>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {layoutOpen && (
              <div className="layout-picker__menu" role="listbox">
                <div className="layout-picker__menu-hd">Interface</div>
                {LAYOUTS.map(l => (
                  <button
                    key={l.id}
                    className="layout-picker__opt"
                    aria-selected={l.id === layout}
                    onClick={() => { onLayoutChange?.(l.id); setLayoutOpen(false); }}
                  >
                    <span className="layout-picker__opt-tick">
                      {l.id === layout ? '●' : '○'}
                    </span>
                    <span className="layout-picker__opt-text">
                      <strong>{l.label}</strong>
                      <em>{l.note}</em>
                    </span>
                  </button>
                ))}
                <div className="layout-picker__menu-hd layout-picker__menu-hd--sep">Appearance</div>
                <button
                  className="layout-picker__opt"
                  aria-selected={theme === 'light'}
                  onClick={() => onThemeChange?.('light')}
                >
                  <span className="layout-picker__opt-tick">{theme === 'light' ? '●' : '○'}</span>
                  <span className="layout-picker__opt-text">
                    <strong>Light</strong>
                    <em>Vellum White surfaces</em>
                  </span>
                </button>
                <button
                  className="layout-picker__opt"
                  aria-selected={theme === 'dark'}
                  onClick={() => onThemeChange?.('dark')}
                >
                  <span className="layout-picker__opt-tick">{theme === 'dark' ? '●' : '○'}</span>
                  <span className="layout-picker__opt-text">
                    <strong>Dark</strong>
                    <em>Inkwell Black surfaces</em>
                  </span>
                </button>
              </div>
            )}
          </div>

          <span className="topbar__sync"><i />Synced 04:12 GMT</span>
          <button className="topbar__btn" title="Print to PDF" onClick={onExport}>
            <span style={{ display: 'inline-flex', marginRight: 6, verticalAlign: 'middle' }}>{Icon.download}</span>
            Export
          </button>
          <button className="topbar__btn topbar__btn--primary" title="Copy link to this view" onClick={onShare}>Share</button>
        </div>
      </div>
    </>
  );
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
        {meta.map((m, i) => (
          <div key={i} className="pagehead__meta-row">
            {m.label}
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
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
    </section>
  );
}

// ── Hero (smaller, paired with summary) ──────────────
function Hero({ label, value, delta, deltaLabel, caption, spark, sparkColor = 'var(--red)', tag, onClick }) {
  let dcls = 'hero__delta hero__delta--flat';
  let arrow = '·';
  if (delta != null) {
    if (delta > 0.005) { dcls = 'hero__delta'; arrow = '↑'; }
    else if (delta < -0.005) { dcls = 'hero__delta hero__delta--down'; arrow = '↓'; }
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
      {spark && (
        <div className="hero__chart">
          <Sparkline data={spark} color={sparkColor} height={44} dot={false} fill={false} />
        </div>
      )}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────
function KPICard({ label, value, delta, deltaLabel, caption, spark, sparkColor = 'var(--ink)', accent, onClick }) {
  let dcls = 'kpi__delta kpi__delta--flat';
  let arrow = '·';
  if (delta != null) {
    if (delta > 0.005) { dcls = 'kpi__delta kpi__delta--up'; arrow = '↑'; }
    else if (delta < -0.005) { dcls = 'kpi__delta kpi__delta--down'; arrow = '↓'; }
  }
  const accentCls = accent === 'accent' ? ' kpi--accent'
                  : accent === 'warn'   ? ' kpi--warn'
                  : accent === 'info'   ? ' kpi--info'
                  : accent === 'pos'    ? ' kpi--pos'
                  : '';
  return (
    <div className={'kpi' + accentCls} onClick={onClick}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__num">{value}</div>
      {delta != null && (
        <div className="kpi__delta-block">
          <div className={dcls}>{arrow} {fmt.signedPct(delta)}</div>
          {deltaLabel && <span className="kpi__delta-sub">{deltaLabel}</span>}
        </div>
      )}
      {caption && <div className="kpi__caption">{caption}</div>}
      {spark && (
        <div className="kpi__spark">
          <Sparkline data={spark} color={sparkColor} height={28} dot={false} fill={false} />
        </div>
      )}
    </div>
  );
}

// ── Finding (pull quote with 5pt red stroke + dismiss + note) ─────────
function Finding({ num, kicker, children, cite, onDismiss, onExpand, note, onNoteChange, sharedNote, onPostSharedNote, otherUserName, currentUserId, unreadShared }) {
  const [showNote, setShowNote] = React.useState(!!note);
  const [showShare, setShowShare] = React.useState(false);
  const [draft, setDraft] = React.useState(note || '');
  const [shareDraft, setShareDraft] = React.useState('');
  React.useEffect(() => { setDraft(note || ''); if (note) setShowNote(true); }, [note]);
  const saveNote = () => { if (onNoteChange) onNoteChange(draft.trim()); };
  const clearNote = () => { setDraft(''); if (onNoteChange) onNoteChange(''); setShowNote(false); };
  const postShare = () => {
    if (!shareDraft.trim() || !onPostSharedNote) return;
    onPostSharedNote(shareDraft.trim());
    setShareDraft('');
    setShowShare(false);
  };
  const stop = (e) => e.stopPropagation();
  return (
    <div className={'finding' + (onExpand ? ' finding--click' : '') + (unreadShared ? ' finding--unread' : '')} onClick={onExpand}>
      {unreadShared && (
        <div className="finding__unread-badge" title={`New note from ${sharedNote?.author || 'the other Dr.'}`}>
          <span className="finding__unread-dot" />
          New note
        </div>
      )}
      {onDismiss && (
        <button
          className="finding__dismiss"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss"
          title="Dismiss this signal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
        </button>
      )}
      {onExpand && (
        <button
          className="finding__expand"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          aria-label="Open full view"
          title="Open full view"
        >
          Open
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      )}
      <div className="finding__num">
        <strong>№ {num}</strong>
        {kicker}
      </div>
      <div className="finding__body">{children}</div>
      <div className="finding__cite">
        <strong>{cite.source}</strong>
        <span>{cite.lead}</span>
      </div>

      {/* Existing shared note display (if posted) */}
      {sharedNote && (
        <div className="finding__shared" onClick={stop}>
          <div className="finding__shared-hd">
            <span className="finding__shared-from">{sharedNote.author}</span>
            <span className="finding__shared-time">
              {new Date(sharedNote.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="finding__shared-text">{sharedNote.text}</div>
          {onPostSharedNote && sharedNote.authorId === currentUserId && (
            <div className="finding__shared-actions">
              <button onClick={() => { setShareDraft(sharedNote.text); onPostSharedNote(''); setShowShare(true); }}>Edit</button>
              <button onClick={() => onPostSharedNote('')}>Delete</button>
            </div>
          )}
          {onPostSharedNote && sharedNote.authorId !== currentUserId && (
            <div className="finding__shared-actions">
              <button className="finding__shared-acknowledge" onClick={() => onPostSharedNote('')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Mark as resolved
              </button>
            </div>
          )}
        </div>
      )}

      {/* Composer buttons */}
      {(onNoteChange || onPostSharedNote) && !showNote && !showShare && (
        <div className="finding__compose-row">
          {onNoteChange && <button className="finding__note-add" onClick={(e) => { stop(e); setShowNote(true); }}>+ Add private note</button>}
          {onPostSharedNote && !sharedNote && (
            <button className="finding__share-add" onClick={(e) => { stop(e); setShowShare(true); }}>
              <span className="finding__share-add-dot" />
              + Send a note to {otherUserName || 'team'}
            </button>
          )}
        </div>
      )}

      {/* Private note editor */}
      {showNote && (
        <div className="finding__note" onClick={stop}>
          <div className="finding__note-label">Your note · private</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="Discussed in June committee — reviewing July 1."
            rows={2}
          />
          {note && (
            <div className="finding__note-row">
              <span>Saved · only you see this</span>
              <button onClick={clearNote}>Clear</button>
            </div>
          )}
        </div>
      )}

      {/* Shared note editor */}
      {showShare && (
        <div className="finding__shared-editor" onClick={stop}>
          <div className="finding__shared-label">
            <span className="finding__share-add-dot" />
            Send a note to {otherUserName || 'team'}
          </div>
          <textarea
            value={shareDraft}
            onChange={(e) => setShareDraft(e.target.value)}
            placeholder={'Share your view of this with ' + (otherUserName || 'the team') + '...'}
            rows={3}
            autoFocus
          />
          <div className="finding__shared-editor-actions">
            <button onClick={() => { setShareDraft(''); setShowShare(false); }} className="finding__shared-cancel">Cancel</button>
            <button onClick={postShare} disabled={!shareDraft.trim()} className="finding__shared-post">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HeroSummary (right side of hero row) ─────────────
function HeroSummary({ title, rows, onDismiss, onRowClick, emptyText }) {
  return (
    <div className="hero-summary">
      <div className="hero-summary__title">{title}</div>
      <div className="hero-summary__rows">
        {rows.length === 0 && emptyText && (
          <div className="hero-summary__empty">{emptyText}</div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.id || i}
            className={'hero-summary__row hero-summary__row--' + (r.tone || 'neutral') + (onRowClick ? ' hero-summary__row--click' : '') + (r.unreadShared ? ' hero-summary__row--unread' : '')}
            onClick={() => onRowClick && onRowClick(r)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
          >
            <div className="hero-summary__row-val">{r.val}</div>
            <div className="hero-summary__row-text">
              <strong>{r.label}</strong>
              <span>{r.detail}</span>
              {r.unreadShared && (
                <em className="hero-summary__row-newnote">
                  <span className="hero-summary__row-newnote-dot" />
                  New note from {r.sharedNoteAuthor || 'the other Dr.'}
                </em>
              )}
            </div>
            {onDismiss && r.id && (
              <button
                className="hero-summary__row-dismiss"
                onClick={(e) => { e.stopPropagation(); onDismiss(r.id); }}
                aria-label="Dismiss"
                title="Dismiss this item"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HeroToday (personal agenda for today — replaces portrait) ─
function HeroToday({ kicker, items, onItemClick }) {
  return (
    <div className="hero-today">
      <div className="hero-today__kicker">{kicker}</div>
      <div className="hero-today__list">
        {items.map((it, i) => (
          <div
            key={i}
            className={'hero-today__row' + (onItemClick ? ' hero-today__row--click' : '')}
            onClick={() => onItemClick && onItemClick(it)}
            role={onItemClick ? 'button' : undefined}
            tabIndex={onItemClick ? 0 : undefined}
          >
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
    </div>
  );
}

// ── Range pills ──────────────────────────────────────
const RANGES = [
  { id: '5y',  label: '5Y' },
  { id: '3y',  label: '3Y' },
  { id: '1y',  label: '1Y' },
  { id: 'ytd', label: 'YTD' },
  { id: 'mtd', label: 'MTD' },
];
function Range({ value, onChange }) {
  return (
    <div className="range" role="tablist">
      {RANGES.map(r => (
        <button key={r.id} role="tab" aria-pressed={value === r.id} onClick={() => onChange(r.id)}>{r.label}</button>
      ))}
    </div>
  );
}
function rangeSlice(rangeId, totalMonths) {
  const last = totalMonths;
  switch (rangeId) {
    case 'mtd': return [last - 1, last];
    case 'ytd': return [last - 5, last];
    case '1y':  return [last - 12, last];
    case '3y':  return [last - 36, last];
    case '5y':
    default:    return [0, last];
  }
}

// ── Variance flag ────────────────────────────────────
function VarianceFlag({ variance }) {
  const abs = Math.abs(variance);
  if (abs < 0.05) return <span className="flag flag--ok">{fmt.signedPct(variance, 1)}</span>;
  if (variance > 0) return <span className="flag flag--over">↑ {fmt.signedPct(variance, 1)}</span>;
  return <span className="flag flag--under">↓ {fmt.signedPct(variance, 1)}</span>;
}

// ── Legacy shims (used by financial/donations/hr/academic) ─

function Brief({ kicker, date, headline, dek, sources }) {
  return (
    <div className="pagehead" style={{ marginBottom: 36 }}>
      <div className="pagehead__mark">{kicker || 'BRIEF'}</div>
      <div className="pagehead__body">
        <div className="pagehead__eyebrow">
          {kicker} {date && <><span className="sep" style={{ display: 'inline-block', width: 1, height: 11, background: 'var(--ink-faint)', margin: '0 8px', verticalAlign: 'middle' }} />{date}</>}
        </div>
        {headline && <h1>{headline}</h1>}
        {dek && <div className="pagehead__sub">{dek}</div>}
      </div>
      <div className="pagehead__meta">
        {sources && sources.map((s, i) => (
          <div key={i} className="pagehead__meta-row">
            {s.label}
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
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
    </div>
  );
}

// Legacy KPI alias → modern KPICard
function KPI({ label, value, unit, delta, deltaLabel = 'vs. prior', caption, spark, sparkColor = 'var(--ink)', status, source, cite, onClick }) {
  const accent = status === 'bad' ? 'accent'
              : status === 'warn' ? 'warn'
              : status === 'ok'   ? 'pos'
              : null;
  return (
    <KPICard
      label={label}
      value={value}
      delta={delta}
      deltaLabel={deltaLabel}
      caption={caption}
      spark={spark}
      sparkColor={sparkColor}
      accent={accent}
      onClick={onClick}
    />
  );
}

// ChapterIntro (legacy) → just renders as a PageHead
function ChapterIntro({ num, kicker, title, meta = [] }) {
  return (
    <PageHead
      mark={`CH ${num || '01'}`}
      eyebrow={kicker}
      title={title}
      meta={meta}
    />
  );
}

Object.assign(window, {
  Masthead, PageHead, Section, Hero, HeroSummary, HeroPortrait, HeroToday,
  KPICard, Finding, Range, VarianceFlag, rangeSlice, PRTSeal,
  // legacy
  Brief, SectionHd, KPI, ChapterIntro,
});
