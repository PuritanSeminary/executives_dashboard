// views-help.jsx — "How to read this" reference page.
// A permanent guide for Drs. Neele & Bilkes covering the color logic,
// what's clickable, how the data refreshes, and a glossary.

function HelpView({ user }) {
  // Animated mouse cursor used inside each demo to telegraph the click.
  const CursorMouse = () => (
    <div className="help__demo-mouse">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--blue)" stroke="#fff" strokeWidth="1.5">
        <path d="M3 2 L3 16 L7 13 L9.5 19 L12 17.5 L9.5 11.5 L14 11.5 Z" />
      </svg>
      <span className="help__demo-mouse-ripple" />
    </div>
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const userName = user?.short || 'Dr. Neele';

  return (
    <>
      <PageHead
        mark={<>
          <span className="pagehead__mark-day">?</span>
          <span className="pagehead__mark-sub">READ</span>
          <span className="pagehead__mark-sub">ME</span>
        </>}
        eyebrow={<><strong>{greeting}, {userName}.</strong> &nbsp;·&nbsp; A short guide to reading the dashboard.</>}
        title={<>How to read this dashboard.</>}
        sub={<>Every color, click, and abbreviation explained. Skim it once and you'll know the whole vocabulary.</>}
        meta={[
          { label: 'Audience', value: 'Drs. Neele & Bilkes' },
          { label: 'Read time', value: '~5 minutes' },
        ]}
      />

      {/* 01 — Color logic ─────────────────────────────────────── */}
      <Section
        num={1}
        title="Reading the colors"
        aside="Five colors, five jobs. Nothing is decorative."
      >
        <div className="help__cards">
          <div className="help__color help__color--red">
            <div className="help__color-dot" style={{ background: 'var(--red)' }} />
            <div className="help__color-body">
              <h3>Heritage Crimson</h3>
              <p><strong>Brand anchor + alert.</strong> The logo, section numbers, and any metric that's gone seriously off-plan. If a number is red, treat it as needing attention.</p>
              <div className="help__color-examples">Tuition yield · Findings · Over-budget department names</div>
            </div>
          </div>

          <div className="help__color help__color--gold">
            <div className="help__color-dot" style={{ background: 'var(--gold)' }} />
            <div className="help__color-body">
              <h3>Ochre Yellow</h3>
              <p><strong>Warning.</strong> Items worth watching but not yet alarming.</p>
              <div className="help__color-examples">Warning-tier KPIs · watch-threshold deltas</div>
            </div>
          </div>

          <div className="help__color help__color--green">
            <div className="help__color-dot" style={{ background: 'var(--pos)' }} />
            <div className="help__color-body">
              <h3>Positive Green</h3>
              <p><strong>Positive movement only.</strong> Up-arrow deltas, "above benchmark" pills, on-track flags. If it's green, the number is moving in the direction you'd hope.</p>
              <div className="help__color-examples">Donations trending up · Endowment over benchmark</div>
            </div>
          </div>

          <div className="help__color help__color--blue">
            <div className="help__color-dot" style={{ background: 'var(--blue)' }} />
            <div className="help__color-body">
              <h3>Aero Blue</h3>
              <p><strong>Info / context only.</strong> Neutral chips, the current tab highlight, secondary information. Blue never means action.</p>
              <div className="help__color-examples">"Currently viewing" highlight · Department department tags</div>
            </div>
          </div>

          <div className="help__color help__color--ink">
            <div className="help__color-dot" style={{ background: 'var(--ink)' }} />
            <div className="help__color-body">
              <h3>Inkwell Black</h3>
              <p><strong>Primary structure.</strong> Headlines, body text, buttons that are just utility ("Share"). Black means "this is the content," not "this is special."</p>
              <div className="help__color-examples">All headlines · The Share button · Body text</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 02 — Clickable surfaces ──────────────────────────────── */}
      <Section
        num={2}
        title="What's clickable"
        aside="Most things in the dashboard reveal more detail. Here's the map."
      >
        <div className="help__demos">

          {/* KPI tile → detail panel slides in */}
          <div className="help__demo">
            <div className="help__demo-copy">
              <div className="help__demo-eyebrow">№ i</div>
              <h3>KPI tiles</h3>
              <p>Click any of the six tiles under <em>Performance overview</em>. A panel slides in from the right with the full history and breakdown.</p>
            </div>
            <div className="help__demo-frame" aria-hidden="true">
              <div className="help__demo-stage">
                <div className="help__demo-card help__demo-card--kpi help__demo-trigger">
                  <div className="help__demo-label"><span className="help__demo-dot" />OPERATING · TTM</div>
                  <div className="help__demo-num">$9.00M</div>
                  <div className="help__demo-delta-row">
                    <span className="help__demo-delta help__demo-delta--up">↑ +0.4%</span>
                  </div>
                  <CursorMouse />
                </div>
                <div className="help__demo-result">
                  <div className="help__demo-result-card">
                    <div className="help__demo-result-label">DRILL-DOWN</div>
                    <div className="help__demo-result-h">Operating spend</div>
                    <div className="help__demo-result-sub">12-mo trailing · 9 departments · broken down below.</div>
                    <svg className="help__demo-result-spark" viewBox="0 0 100 24" preserveAspectRatio="none">
                      <polyline points="0,18 12,15 25,17 38,13 50,11 62,12 75,9 88,7 100,8" fill="none" stroke="var(--ink-2)" strokeWidth="1.4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flagged card → detail expands downward */}
          <div className="help__demo">
            <div className="help__demo-copy">
              <div className="help__demo-eyebrow">№ ii</div>
              <h3>Flagged cards</h3>
              <p>Click any finding under <em>Flagged this week</em> to open the detail panel — full data, signal rule explanation, plus space to add notes.</p>
            </div>
            <div className="help__demo-frame" aria-hidden="true">
              <div className="help__demo-card help__demo-card--finding help__demo-trigger">
                <div className="help__demo-finding-chip">№ i</div>
                <div className="help__demo-finding-rule">DEPARTMENT YTD VARIANCE &gt; ±10%</div>
                <div className="help__demo-finding-body">
                  <strong>Projects &amp; Comm spend.</strong> 29% over plan YTD.
                </div>
                <div className="help__demo-finding-expand">
                  <strong>Why flagged</strong>
                  YTD spend $439k vs. budget $340k. SIS migration drove a one-off $87k spike in March.
                </div>
                <CursorMouse />
              </div>
            </div>
          </div>

          {/* Department row → chart above swaps */}
          <div className="help__demo">
            <div className="help__demo-copy">
              <div className="help__demo-eyebrow">№ iii</div>
              <h3>Department rows</h3>
              <p>On the <em>Financial</em> tab, click any row in the <em>Departments vs. budget</em> table. The line graph above swaps to chart just that department.</p>
            </div>
            <div className="help__demo-frame" aria-hidden="true">
              <div style={{ width: '100%', maxWidth: 340 }}>
                <div className="help__demo-chart-pane">
                  <span className="help__demo-chart-label help__demo-chart-label--default">ALL DEPARTMENTS</span>
                  <span className="help__demo-chart-label help__demo-chart-label--dept">INFORMATION TECHNOLOGY</span>
                  <svg className="help__demo-chart-svg" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <polyline className="help__demo-chart-line help__demo-chart-line--default" points="0,18 12,15 25,17 38,13 50,11 62,12 75,9 88,7 100,8" />
                    <polyline className="help__demo-chart-line help__demo-chart-line--dept" points="0,14 12,18 25,10 38,16 50,8 62,5 75,12 88,4 100,3" />
                  </svg>
                </div>
                <div className="help__demo-table">
                  <div className="help__demo-row">
                    <span className="help__demo-row-label">Academics</span>
                    <span className="help__demo-row-bar"><i style={{ width: '94%' }} /></span>
                    <span className="help__demo-row-val">$2.64M</span>
                  </div>
                  <div className="help__demo-row help__demo-pulse-row">
                    <span className="help__demo-row-label">Projects &amp; Comm</span>
                    <span className="help__demo-row-bar"><i style={{ width: '100%', background: 'var(--red)' }} /></span>
                    <span className="help__demo-row-val" style={{ color: 'var(--red)' }}>$439k</span>
                    <CursorMouse />
                  </div>
                  <div className="help__demo-row">
                    <span className="help__demo-row-label">William Perkins Library</span>
                    <span className="help__demo-row-bar"><i style={{ width: '90%', background: 'var(--red)' }} /></span>
                    <span className="help__demo-row-val">$481k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Country bars → gifts list below filters to selected country */}
          <div className="help__demo">
            <div className="help__demo-copy">
              <div className="help__demo-eyebrow">№ iv</div>
              <h3>Bars, officer rows, and recent gifts</h3>
              <p>On the <em>Donations</em> tab, clicking a country bar, a lead officer row, or a recent gift filters the <em>Recent gifts</em> table to match. Click again to clear the filter.</p>
            </div>
            <div className="help__demo-frame" aria-hidden="true">
              <div style={{ width: '100%', maxWidth: 340 }}>
                <div className="help__demo-table" style={{ position: 'relative' }}>
                  <div className="help__demo-row help__demo-pulse-row">
                    <span className="help__demo-row-label">United States</span>
                    <span className="help__demo-row-bar"><i style={{ width: '78%' }} /></span>
                    <span className="help__demo-row-val">$3.91M</span>
                    <CursorMouse />
                  </div>
                  <div className="help__demo-row">
                    <span className="help__demo-row-label">Netherlands</span>
                    <span className="help__demo-row-bar"><i style={{ width: '32%' }} /></span>
                    <span className="help__demo-row-val">$612k</span>
                  </div>
                  <div className="help__demo-row">
                    <span className="help__demo-row-label">Canada</span>
                    <span className="help__demo-row-bar"><i style={{ width: '18%' }} /></span>
                    <span className="help__demo-row-val">$284k</span>
                  </div>
                </div>
                <div className="help__demo-gifts">
                  <div className="help__demo-gifts-hd">
                    <span>RECENT GIFTS</span>
                    <span className="help__demo-filter-chip-inline">Country: US ✕</span>
                  </div>
                  <div className="help__demo-gifts-row"><span>D. Carter</span><span>$5,000</span></div>
                  <div className="help__demo-gifts-row"><span>M. Hoeksema</span><span>$2,500</span></div>
                  <div className="help__demo-gifts-row"><span>J. Beeke</span><span>$1,200</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Agenda → briefing card slides in */}
          <div className="help__demo">
            <div className="help__demo-copy">
              <div className="help__demo-eyebrow">№ v</div>
              <h3>Agenda items</h3>
              <p>The "Today" panel on the <em>Overview</em> shows your meetings. Click any one for the briefing — context, attendees, what to read first.</p>
            </div>
            <div className="help__demo-frame" aria-hidden="true">
              <div className="help__demo-stage">
                <div className="help__demo-agenda help__demo-trigger">
                  <div className="help__demo-agenda-row">
                    <span className="help__demo-time">09:00</span>
                    <div><strong>Senior staff stand-up</strong><span>Weekly</span></div>
                  </div>
                  <div className="help__demo-agenda-row help__demo-pulse-row">
                    <span className="help__demo-time">10:30</span>
                    <div><strong>Faculty council</strong><span>SIS migration</span></div>
                    <CursorMouse />
                  </div>
                </div>
                <div className="help__demo-result">
                  <div className="help__demo-result-card">
                    <div className="help__demo-result-label">10:30 BRIEFING</div>
                    <div className="help__demo-result-h">Faculty council</div>
                    <div className="help__demo-result-sub">8 attendees. Standing item: SIS migration update. Read the IT memo first.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Section>

      {/* 03 — Reading the numbers ─────────────────────────────── */}
      <Section
        num={3}
        title="Reading the numbers"
        aside="A few conventions that show up everywhere."
      >
        <div className="help__conventions">
          <div className="help__conv">
            <div className="help__conv-term">The big number</div>
            <div className="help__conv-meaning">
              The headline figure on a tile (e.g. <code>$9.00M</code>). Defaults to ink black. Turns <span style={{ color: 'var(--red)', fontWeight: 600 }}>red</span> when the status crosses a serious threshold, or <span style={{ color: 'var(--warn)', fontWeight: 600 }}>gold</span> when it crosses a watch threshold.
            </div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">The delta pill</div>
            <div className="help__conv-meaning">
              The small chip below or beside a metric (e.g. <span className="help__chip help__chip--up">↑ +7.5%</span>). <em>Always</em> shows direction-of-change: green up, red down, grey flat. Independent of whether the headline is red.
            </div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">The "Nº" chip</div>
            <div className="help__conv-meaning">
              Roman numerals (<code>i, ii, iii, iv…</code>) on findings indicate ranking by priority — i is the highest. They are not date order.
            </div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Dashed grey line on charts</div>
            <div className="help__conv-meaning">
              A reference threshold (e.g. monthly budget). The solid colored line is what's actually being tracked.
            </div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">"MTD" markers</div>
            <div className="help__conv-meaning">
              The current month is always partial — it shows whatever has posted from source systems so far. When a chart drops on the last data point, that's not a real drop; it's "we're only halfway through the month."
            </div>
          </div>
        </div>
      </Section>

      {/* 04 — Where the data comes from ──────────────────────── */}
      <Section
        num={4}
        title="Where the data comes from"
        aside="Four source systems. Each refreshes on its own schedule."
      >
        <table className="help__sources">
          <thead>
            <tr><th>System</th><th>What it powers</th><th>Refresh</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Financial Edge NXT</strong></td>
              <td>Operating spend, departments vs. budget, investments, grants, tuition</td>
              <td>Nightly</td>
            </tr>
            <tr>
              <td><strong>Raiser's Edge NXT</strong></td>
              <td>Donations, donors, gifts, fundraisers, planned giving</td>
              <td>Nightly</td>
            </tr>
            <tr>
              <td><strong>Paycor</strong></td>
              <td>Headcount, payroll, open positions, tenure</td>
              <td>Weekly</td>
            </tr>
            <tr>
              <td><strong>Populi</strong></td>
              <td>Enrollment, programs, courses, retention, partner seminaries</td>
              <td>Per term</td>
            </tr>
          </tbody>
        </table>
        <p className="help__note">
          The dashboard reads from a cache that gets refreshed in the background — so you'll never wait for an API. The header of the page shows the last refresh time so you always know how current the figures are.
        </p>
      </Section>

      {/* 05 — Layouts ─────────────────────────────────────────── */}
      <Section
        num={5}
        title="Picking a layout"
        aside="Same data, different reading densities. Use the Interface dropdown in the top-right."
      >
        <div className="help__layouts">
          <div className="help__layout"><strong>Editorial</strong> <span>Calm, generous whitespace, serif numbers. Best for reading slowly.</span></div>
          <div className="help__layout"><strong>Editorial Compact</strong> <span>Same look, denser. More on screen without scrolling.</span></div>
          <div className="help__layout"><strong>Brand</strong> <span>Mirrors the new PRTS website — rounded cards, big calm headlines.</span></div>
          <div className="help__layout"><strong>Brand Compact</strong> <span>The website look, tightened up — more on screen for board meetings.</span></div>
        </div>
      </Section>

      <Section
        num={6}
        title="Customizing your overview"
        aside="Make the Overview yours — your arrangement is saved to your account and only you see it."
      >
        <p className="help__note" style={{ marginTop: 0, marginBottom: 18 }}>
          On the <em>Overview</em> tab, click <strong>Customize</strong> in the sidebar to enter edit mode. The page dims and a small control bar appears at the bottom of the screen. {user?.id === 'neele' ? 'Dr. Bilkes' : 'Dr. Neele'} keeps a separate layout, so anything you rearrange is yours alone. Click <strong>Done</strong> when you're finished.
        </p>
        <div className="help__conventions">
          <div className="help__conv">
            <div className="help__conv-term">Reorder the tabs</div>
            <div className="help__conv-meaning">In edit mode the sidebar tabs round off and gently shake. Drag any tab up or down to set the running order you prefer.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Reorder sections</div>
            <div className="help__conv-meaning">Drag a numbered section by its handle to move it. The <code>01</code>–<code>05</code> numbers renumber themselves automatically.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Rearrange the KPI tiles</div>
            <div className="help__conv-meaning">Drag tiles within <em>Performance overview</em> to swap their positions, or remove one with the small ✕ in its corner.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Hide what you don't need</div>
            <div className="help__conv-meaning">Click the eye on a section — or the ✕ on a tile, department row, gift, or finding — to tuck it out of sight.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Change the hero metric</div>
            <div className="help__conv-meaning">Use the <em>Change metric</em> picker on the large headline number to feature a different figure.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Move the agenda</div>
            <div className="help__conv-meaning">The <em>Today</em> panel has a <strong>Left · Top · Hide</strong> control for where your agenda sits.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Bring things back — <span style={{ color: 'var(--ink)', fontWeight: 700 }}>Available</span></div>
            <div className="help__conv-meaning">The <strong>Available</strong> button in the bottom bar opens a menu of everything you've hidden, plus extra KPIs you can add. Click <em>Add</em> or <em>Show</em> to restore any of them.</div>
          </div>
          <div className="help__conv">
            <div className="help__conv-term">Start over — Reset</div>
            <div className="help__conv-meaning"><strong>Reset</strong> in the bottom bar returns the Overview to its original default arrangement.</div>
          </div>
        </div>
      </Section>

      {/* 07 — Glossary ────────────────────────────────────────── */}
      <Section
        num={7}
        title="Glossary"
        aside="Abbreviations that come up across the dashboard."
      >
        <dl className="help__glossary">
          <dt>TTM</dt>
          <dd>Trailing twelve months. The sum / average of the last 12 completed months, rolling.</dd>
          <dt>YTD</dt>
          <dd>Year-to-date. From the start of the fiscal year through today.</dd>
          <dt>MTD</dt>
          <dd>Month-to-date. The current calendar month, partial.</dd>
          <dt>bps</dt>
          <dd>Basis points — one bp = 0.01%. A 12-bp gain means +0.12%.</dd>
          <dt>Pacing budget</dt>
          <dd>What we'd expect to have spent by today if spending were even across the year. Used to flag departments running fast or slow.</dd>
          <dt>Signal</dt>
          <dd>An automated rule that flags a metric for attention (e.g. "department YTD variance > ±10%"). The signal engine runs over all source data; each finding cites the rule that triggered it.</dd>
          <dt>Cohort</dt>
          <dd>A group of donors who started giving in the same period. Used to track retention over time.</dd>
        </dl>
      </Section>

      {/* 08 — Sharing & saving ────────────────────────────────── */}
      <Section
        num={8}
        title="Sharing & saving views"
        aside="Get a finding in front of each other."
      >
        <div className="help__share">
          <div className="help__share-item">
            <div className="help__share-icon">↗</div>
            <div>
              <strong>Share link</strong>
              <p>The <em>Share</em> button in the top-right copies a link to the current view. Paste it in an email or Teams message and the recipient lands on the same tab.</p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

window.HelpView = HelpView;
