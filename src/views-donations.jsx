// views-donations.jsx — Donations deep dive
// Funds, donors, country, fundraisers, recent gifts.

function DonationsView({ rangeId, onDrill }) {
  const D = window.PRTS_DATA;
  const Don = D.donations;
  const months = D.months;
  const [from, to] = rangeSlice(rangeId, months.length);

  const [fundFilter, setFundFilter] = React.useState(null);
  const [countryFilter, setCountryFilter] = React.useState(null);
  const [fundraiserFilter, setFundraiserFilter] = React.useState(null);

  const totalYtd = Don.total.slice(-13, -1).reduce((s, v) => s + v, 0);
  const totalPriorYtd = Don.total.slice(-25, -13).reduce((s, v) => s + v, 0);

  const newDonorsTtm = Don.newDonors.slice(-12).reduce((s, v) => s + v, 0);
  const newConstTtm = Don.newConstituents.slice(-12).reduce((s, v) => s + v, 0);
  const activeNow = Don.donorsActive[Don.donorsActive.length - 1];
  const avgGiftCurr = Don.avgGift[Don.avgGift.length - 1];
  const monthlyDonorsNow = Don.monthlyDonors[Don.monthlyDonors.length - 1];
  const plannedNow = Don.plannedGivers[Don.plannedGivers.length - 1];

  const seriesForChart = fundFilter
    ? Don.funds.find(f => f.id === fundFilter).series
    : Don.total;
  const chartColor = fundFilter
    ? COLOR_TOKENS[Don.funds.find(f => f.id === fundFilter).color]
    : 'var(--oxblood)';

  return (
    <>
      <Brief
        kicker="Section III — Donations"
        date="As of 30 April 2026"
        headline={<>A <em>record</em> twelve months, paced by the Annual Fund.</>}
        dek="Trailing-twelve-month giving lands above $5M across six funds — a strong lift over the prior period. Unrestricted Annual Fund and Endowed Chairs dollars led; international giving has expanded to a growing share of total. December year-end pulse held, and the monthly recurring program crossed 284 donors for the first time."
        sources={[
          { label: 'Source', value: "Raiser's Edge NXT" },
          { label: 'Refresh', value: 'Monthly' },
          { label: 'Lead', value: 'K. Bartlema, VP Adv.' },
        ]}
      />

      {/* ── Stat band ─────────────────────────────────────── */}
      <div className="grid grid--4">
        <KPI
          label="Donations, TTM"
          value={fmt.shortMoney(totalYtd)}
          delta={(totalYtd - totalPriorYtd) / totalPriorYtd}
          deltaLabel="vs. prior 12 mo"
          caption="6 active funds. Highest TTM in five years."
          spark={Don.total.slice(-24)}
          sparkColor="var(--oxblood)"
          status="ok"
          source="Raiser's Edge"
        />
        <KPI
          label="Active donors"
          value={fmt.num(activeNow)}
          delta={0.087}
          deltaLabel="vs. same month '25"
          caption={`${fmt.num(newDonorsTtm)} new donors added this year; ${fmt.num(newConstTtm)} new constituents on file.`}
          spark={Don.donorsActive.slice(-24)}
          sparkColor="var(--navy)"
          status="ok"
        />
        <KPI
          label="Monthly recurring"
          value={fmt.num(monthlyDonorsNow)}
          delta={0.12}
          deltaLabel="vs. same month '25"
          caption="Five-year high. Strongest retention cohort."
          spark={Don.monthlyDonors.slice(-24)}
          sparkColor="var(--moss)"
          status="ok"
        />
        <KPI
          label="Average gift"
          value={'$' + fmt.num(avgGiftCurr)}
          delta={0.069}
          deltaLabel="vs. same month '25"
          caption={`${plannedNow} planned givers on the books. Avg planned gift est. $42k.`}
          spark={Don.avgGift.slice(-24)}
          sparkColor="var(--gold)"
        />
      </div>

      {/* ── Giving trend ─────────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">
              {fundFilter ? <>Filtered: <em>{Don.funds.find(f => f.id === fundFilter).name}</em></> : <>Total giving, monthly</>}
            </h3>
            <div className="card__sub">Five-year monthly series with December year-end pulses visible. Click any fund chip to filter.</div>
          </div>
          {fundFilter && (
            <button className="tag tag--ink" style={{ cursor: 'pointer', border: 0 }} onClick={() => setFundFilter(null)}>
              <i className="tag__dot" /> Clear filter ✕
            </button>
          )}
        </div>

        <LineChart
          variant="area"
          series={[{ name: 'Donations', data: seriesForChart, color: chartColor }]}
          labels={months.map(m => m.label)}
          height={240}
          showLegend={false}
        />

        {/* Fund chips */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Don.funds.map(f => (
            <button
              key={f.id}
              className={'tag ' + (fundFilter === f.id ? `tag--${f.color === 'ink' ? 'ink' : f.color === 'oxblood' ? 'ox' : f.color === 'gold' ? 'gold' : 'ink'}` : 'tag--ink')}
              style={{
                cursor: 'pointer',
                opacity: fundFilter && fundFilter !== f.id ? 0.4 : 1,
                border: '1px solid ' + (fundFilter === f.id ? COLOR_TOKENS[f.color] : 'transparent'),
                padding: '4px 9px',
              }}
              onClick={() => setFundFilter(fundFilter === f.id ? null : f.id)}
            >
              <i className="tag__dot" style={{ background: COLOR_TOKENS[f.color] }} />
              {f.name} <span className="mono" style={{ marginLeft: 6, color: 'var(--ink-4)' }}>{fmt.shortMoney(f.ytd)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Funds + country breakdown ──────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Gifts by fund</h3>
              <div className="card__sub">Trailing twelve months. Grants included as restricted fund inflows.</div>
            </div>
          </div>
          <HorizontalBars
            items={[...Don.funds].sort((a, b) => b.ytd - a.ytd).map(f => ({
              label: f.name,
              value: f.ytd,
              sub: f.id === 'unrestricted' ? 'Largest contributor to operating capacity' :
                   f.id === 'scholarship' ? 'Aid yield: 96% deployed' :
                   f.id === 'building' ? 'Capital campaign · year 2 of 4' :
                   f.id === 'international' ? '13% of total; growing fastest' :
                   f.id === 'chair' ? 'Includes Lilly endowment match' :
                   'Hekman acquisitions program',
              color: COLOR_TOKENS[f.color],
            }))}
            valueKey="value"
            labelKey="label"
            colorKey="color"
            format={fmt.shortMoney}
          />
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">By country</h3>
              <div className="card__sub">{Don.byCountry.length} countries · TTM dollars</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Country</th>
                <th style={{ textAlign: 'right' }}>Donors</th>
                <th style={{ textAlign: 'right' }}>Dollars</th>
              </tr>
            </thead>
            <tbody>
              {Don.byCountry.map(c => (
                <tr key={c.code}
                    onClick={() => setCountryFilter(countryFilter === c.code ? null : c.code)}
                    style={{ cursor: 'pointer', background: countryFilter === c.code ? 'var(--bg)' : undefined }}>
                  <td>
                    <span className="mono" style={{ display: 'inline-block', width: 24, color: 'var(--ink-4)', fontSize: 11 }}>{c.code}</span>
                    <span className="label">{c.country}</span>
                  </td>
                  <td className="num muted" style={{ fontSize: 12 }}>{c.donors}</td>
                  <td className="num">{fmt.shortMoney(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fundraisers + recent gifts ─────────────────── */}
      <div className="grid grid--12">
        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Lead gift officers</h3>
              <div className="card__sub">Attributed TTM dollars · click to filter recent gifts</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Officer</th>
                <th style={{ textAlign: 'right' }}>Gifts</th>
                <th style={{ textAlign: 'right' }}>Raised</th>
                <th style={{ textAlign: 'right' }}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {Don.fundraisers.map((f, i) => (
                <tr key={i}
                    onClick={() => setFundraiserFilter(fundraiserFilter === f.name ? null : f.name)}
                    style={{ cursor: 'pointer', background: fundraiserFilter === f.name ? 'var(--bg)' : undefined }}>
                  <td>
                    <div className="label">{f.name}</div>
                    <span className="tbl__sub">{fmt.pct(f.share, 0)} of total</span>
                  </td>
                  <td className="num muted" style={{ fontSize: 12 }}>{f.gifts}</td>
                  <td className="num">{fmt.shortMoney(f.raised)}</td>
                  <td className="num muted">${fmt.num(f.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Recent gifts</h3>
              <div className="card__sub">
                Last 30 days, filterable.{' '}
                {countryFilter && <span className="tag tag--ink" style={{ marginLeft: 6 }}>Country: {countryFilter} <span style={{ marginLeft: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setCountryFilter(null); }}>✕</span></span>}
                {fundraiserFilter && <span className="tag tag--ink" style={{ marginLeft: 6 }}>FR: {fundraiserFilter} <span style={{ marginLeft: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setFundraiserFilter(null); }}>✕</span></span>}
              </div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Date</th>
                <th>Donor</th>
                <th>Fund</th>
                <th>Officer</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Don.recentGifts.filter(g => !fundraiserFilter || g.fundraiser.includes(fundraiserFilter.split(' ')[0])).map((g, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.date}</td>
                  <td className="label">{g.donor}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{g.fund}</td>
                  <td className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>{g.fundraiser}</td>
                  <td className="num">${(g.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DonationsView });
