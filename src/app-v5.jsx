// app-v5.jsx — modern dashboard wiring.
// Same App logic as v4, but with the modern ChatNudge styling
// and a quieter footer.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "scarlet",
  "ai": true
}/*EDITMODE-END*/;

const ACCENTS = {
  scarlet:  { label: 'PRTS Red',  swatch: ['#D3313A', '#9A1E27'] },
  navy:     { label: 'Navy',     swatch: ['#1E3A8A', '#152C66'] },
  forest:   { label: 'Forest',   swatch: ['#047857', '#065F46'] },
  ink:      { label: 'Ink only', swatch: ['#0B1220', '#1F2937'] },
};

// ── Cmd+K palette ────────────────────────────────────
function CommandPalette({ open, onClose, onNav, onDrill }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);
  const D = window.PRTS_DATA;

  const items = React.useMemo(() => {
    const a = [
      { sect: 'Pages', kind: 'page', label: 'Overview',  i: '#', action: () => onNav('overview') },
      { sect: 'Pages', kind: 'page', label: 'Financial', i: '#', action: () => onNav('financial') },
      { sect: 'Pages', kind: 'page', label: 'Donations', i: '#', action: () => onNav('donations') },
      { sect: 'Pages', kind: 'page', label: 'Personnel', i: '#', action: () => onNav('hr') },
      { sect: 'Pages', kind: 'page', label: 'Academic',  i: '#', action: () => onNav('academic') },
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

function App() {
  const D = window.PRTS_DATA;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [chapter, setChapter] = React.useState('overview');
  const [rangeId, setRangeId] = React.useState('5y');
  const [drill, setDrill] = React.useState(null);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  React.useEffect(() => {
    const m = { scarlet: '#D3313A', navy: '#1E3A8A', forest: '#047857', ink: '#0B1220' };
    if (m[t.accent]) document.documentElement.style.setProperty('--accent', m[t.accent]);
  }, [t.accent]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => { window.scrollTo(0, 0); }, [chapter]);

  const badges = {
    financial: D.finance.departments.filter(d => Math.abs(d.variance) > 0.10).length || null,
    hr: D.hr.openPositions.filter(p => p.stage.includes('Re-opening')).length || null,
  };

  return (
    <>
      <Masthead chapter={chapter} onNav={setChapter} badges={badges} onCmdK={() => setCmdOpen(true)} />

      <main className="report">
        {chapter === 'overview'  && <OverviewView  rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'financial' && <FinancialView rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'donations' && <DonationsView rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'hr'        && <HRView        rangeId={rangeId} onDrill={setDrill} />}
        {chapter === 'academic'  && <AcademicView  rangeId={rangeId} onDrill={setDrill} />}

        <div className="colophon">
          <div className="colophon__brand">
            <PRTSeal size={32} />
            <div className="colophon__brand-text">
              Puritan Reformed Theological Seminary
              <em>2965 Leonard Street NE · Grand Rapids, Michigan 49525 · prts.edu</em>
            </div>
          </div>
          <span className="colophon__verse">A Lived Theology.</span>
          <span>Briefing Nº 138</span>
        </div>
      </main>

      {drill && <Drilldown payload={drill} onClose={() => setDrill(null)} />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNav={setChapter} onDrill={setDrill} />

      {t.ai && <ChatNudge />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakColor label="Accent" value={ACCENTS[t.accent].swatch}
            options={Object.values(ACCENTS).map(a => a.swatch)}
            onChange={(sw) => {
              const id = Object.entries(ACCENTS).find(([k, v]) => v.swatch.join() === sw.join())?.[0];
              if (id) setTweak('accent', id);
            }} />
        </TweakSection>
        <TweakSection label="Behaviour">
          <TweakToggle label="AI assistant" value={t.ai} onChange={(v) => setTweak('ai', v)} />
          <TweakButton label="Open command palette (⌘K)" onClick={() => setCmdOpen(true)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function ChatNudge() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([
    { from: 'agent', text: 'Good morning. I can summarize any metric on screen or compare across periods.' },
  ]);
  const [input, setInput] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const scrollerRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, pending]);

  const send = async () => {
    if (!input.trim() || pending) return;
    const q = input.trim();
    setMessages(m => [...m, { from: 'user', text: q }]);
    setInput('');
    setPending(true);
    try {
      const D = window.PRTS_DATA;
      const dataSummary = `
PRTS data as of 30 Apr 2026:
- Operating spend TTM: ${fmt.shortMoney(D.finance.operatingSpend.slice(-13, -1).reduce((s,v)=>s+v,0))}
- Departments outside ±10%: ${D.finance.departments.filter(d => Math.abs(d.variance) > 0.10).map(d => `${d.name} (${fmt.signedPct(d.variance)})`).join(', ')}
- Donations TTM: ${fmt.shortMoney(D.donations.total.slice(-13, -1).reduce((s,v)=>s+v,0))}
- Active donors: ${D.donations.donorsActive[D.donations.donorsActive.length-1]}
- Headcount: ${D.hr.headcount[D.hr.headcount.length-1].ft} FT, ${D.hr.headcount[D.hr.headcount.length-1].pt} PT
- Open positions: ${D.hr.openPositions.length}
- Enrolled: ${D.academic.totalStudents} across ${D.academic.programs.length} programs
- Investments: ${fmt.shortMoney(D.finance.investments.total)} at Greenleaf
`;
      const text = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `You are the PRTS briefing assistant. Be brief, calm, professional. 2-4 sentences max. No emoji.\n\n${dataSummary}\n\nQuestion: ${q}`
        }],
      });
      setMessages(m => [...m, { from: 'agent', text }]);
    } catch (e) {
      setMessages(m => [...m, { from: 'agent', text: 'Momentarily offline — please try again.' }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 40,
          width: 44, height: 44,
          border: 0,
          background: 'var(--ink)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 14px 30px -6px rgba(15, 23, 42, 0.32), 0 2px 4px rgba(15, 23, 42, 0.12)',
          cursor: 'pointer',
          borderRadius: '50%',
        }}
        title="Briefing assistant"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 24, bottom: 80, zIndex: 40,
          width: 380, maxHeight: 'calc(100vh - 120px)',
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          boxShadow: '0 24px 60px -16px rgba(15, 23, 42, 0.28), 0 4px 12px rgba(15, 23, 42, 0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>Briefing Assistant</div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, color: 'var(--ink-4)', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1 }} aria-label="Close">✕</button>
          </div>
          <div ref={scrollerRef} style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220, maxHeight: 420, background: 'var(--bg)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%', padding: '9px 12px',
                fontSize: 13.5, lineHeight: 1.5,
                background: m.from === 'user' ? 'var(--ink)' : 'var(--paper)',
                color: m.from === 'user' ? '#fff' : 'var(--ink-2)',
                fontFamily: 'var(--sans)',
                border: m.from === 'agent' ? '1px solid var(--rule)' : 'none',
                borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                textWrap: 'pretty',
              }}>{m.text}</div>
            ))}
            {pending && <div style={{ alignSelf: 'flex-start', padding: '8px 12px', color: 'var(--ink-4)', fontFamily: 'var(--sans)', fontSize: 13 }}>Reading the data…</div>}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--rule)', display: 'flex', gap: 8, background: 'var(--paper)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about any metric…"
              style={{ flex: 1, padding: '8px 11px', border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', borderRadius: 7 }} />
            <button onClick={send} disabled={!input.trim() || pending}
              style={{ padding: '8px 14px', background: 'var(--ink)', color: '#fff', border: 0, fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: !input.trim() || pending ? 0.4 : 1, borderRadius: 7 }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
