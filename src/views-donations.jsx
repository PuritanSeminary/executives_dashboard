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

  // Giving trend reads through the data-access layer (PRTS_API), so swapping in
  // the live Raiser's Edge endpoint later needs no change here. Trailing twelve
  // COMPLETE months; the partial current month is excluded.
  const givingPoints = window.PRTS_API.donationsMonthly({ fundId: fundFilter, months: 12 });
  const givingData = givingPoints.map((p) => p.value);
  const givingLabels = givingPoints.map((p) => p.label);
  const givingTotal = givingData.reduce((s, v) => s + v, 0);
  const chartColor = fundFilter ?
  COLOR_TOKENS[Don.funds.find((f) => f.id === fundFilter).color] :
  'var(--navy)';

  return (
    <>
      <Brief
        kicker="Advancement"
        date={"As of " + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        headline="Donations"
        sources={[
        { label: 'Source', value: "Raiser's Edge NXT" }]
        } />
      

      {/* ── Stat band ─────────────────────────────────────── */}
      <div className="grid grid--4">
        <KPI
          label="Donations, TTM"
          value={fmt.shortMoney(totalYtd)}
          delta={(totalYtd - totalPriorYtd) / totalPriorYtd}
          deltaLabel="vs. prior 12 mo"
          caption="6 active funds. Highest TTM in five years."
          spark={window.PRTS_VIEW.complete(Don.total).slice(-24)}
          sparkColor="var(--ink-3)"
          status="ok"
          source="Raiser's Edge" />
        
        <KPI
          label="Active donors"
          value={fmt.num(activeNow)}
          delta={(activeNow - Don.donorsActive[Don.donorsActive.length - 13]) / Don.donorsActive[Don.donorsActive.length - 13]}
          deltaLabel="vs. same month '25"
          caption={`${fmt.num(newDonorsTtm)} new donors added this year; ${fmt.num(newConstTtm)} new constituents on file.`}
          spark={window.PRTS_VIEW.complete(Don.donorsActive).slice(-24)}
          sparkColor="var(--ink-3)"
          status="ok" />
        
        <KPI
          label="Monthly recurring"
          value={fmt.num(monthlyDonorsNow)}
          delta={(monthlyDonorsNow - Don.monthlyDonors[Don.monthlyDonors.length - 13]) / Don.monthlyDonors[Don.monthlyDonors.length - 13]}
          deltaLabel="vs. same month '25"
          caption="Five-year high. Strongest retention cohort."
          spark={window.PRTS_VIEW.complete(Don.monthlyDonors).slice(-24)}
          sparkColor="var(--ink-3)"
          status="ok" />
        
        <KPI
          label="Average gift"
          value={'$' + fmt.num(avgGiftCurr)}
          delta={(avgGiftCurr - Don.avgGift[Don.avgGift.length - 13]) / Don.avgGift[Don.avgGift.length - 13]}
          deltaLabel="vs. same month '25"
          caption={`${plannedNow} planned givers on the books. Avg planned gift est. $42k.`}
          spark={window.PRTS_VIEW.complete(Don.avgGift).slice(-24)}
          sparkColor="var(--ink-3)" />
        
      </div>

      {/* ── Giving trend ─────────────────────────────────── */}
      <div className="card">
        <div className="card__hd">
          <div>
            <h3 className="card__title">
              {fundFilter ? <>Filtered: <span style={{ color: chartColor, fontStyle: 'normal', fontWeight: 600 }}>{Don.funds.find((f) => f.id === fundFilter).name}</span></> : <>Total giving, monthly</>}
              <CardInfo>Trailing twelve months by gift date · {fmt.shortMoney(givingTotal)} total. The current partial month is excluded. Click any fund chip to filter.</CardInfo>
            </h3>
          </div>
          {fundFilter &&
          <button className="tag tag--ink" style={{ cursor: 'pointer', border: 0 }} onClick={() => setFundFilter(null)}>
              <i className="tag__dot" /> Clear filter ✕
            </button>
          }
        </div>

        <LineChart
          variant="bar"
          series={[{ name: 'Donations', data: givingData, color: chartColor }]}
          labels={givingLabels}
          height={240}
          showLegend={false} />
        

        {/* Fund chips */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Don.funds.map((f) =>
          <button
            key={f.id}
            className={'tag ' + (fundFilter === f.id ? `tag--${f.color === 'ink' ? 'ink' : f.color === 'oxblood' ? 'ox' : f.color === 'gold' ? 'gold' : 'ink'}` : 'tag--ink')}
            style={{
              cursor: 'pointer',
              opacity: fundFilter && fundFilter !== f.id ? 0.4 : 1,
              border: '1px solid ' + (fundFilter === f.id ? COLOR_TOKENS[f.color] : 'transparent'),
              padding: '4px 9px'
            }}
            onClick={() => setFundFilter(fundFilter === f.id ? null : f.id)}>
            
              <i className="tag__dot" style={{ background: COLOR_TOKENS[f.color] }} />
              {f.name} <span className="mono" style={{ marginLeft: 6, color: 'var(--ink-4)' }}>{fmt.shortMoney(f.ytd)}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Funds + country breakdown ──────────────────── */}
      <div className="grid grid--12">
        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Gifts by fund<CardInfo>Trailing twelve months. Grants included as restricted fund inflows.</CardInfo></h3>
            </div>
          </div>
          <HorizontalBars
            items={[...Don.funds].sort((a, b) => b.ytd - a.ytd).map((f) => ({
              label: f.name,
              value: f.ytd,
              sub: f.id === 'unrestricted' ? 'Largest contributor to operating capacity' :
              f.id === 'scholarship' ? 'Aid yield: 96% deployed' :
              f.id === 'building' ? 'Capital campaign · year 2 of 4' :
              f.id === 'international' ? '13% of total; growing fastest' :
              f.id === 'chair' ? 'Includes Lilly endowment match' :
              'Perkins acquisitions program',
              color: COLOR_TOKENS[f.color]
            }))}
            valueKey="value"
            labelKey="label"
            colorKey="color"
            format={fmt.shortMoney} />
          
        </div>

        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">By country<CardInfo>{Don.byCountry.length} countries · TTM dollars.</CardInfo></h3>
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
              {Don.byCountry.map((c) =>
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
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fundraisers + recent gifts ─────────────────── */}
      <div className="grid grid--12">
        <div className="card span-5">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Lead gift officers<CardInfo>Attributed TTM dollars · click to filter recent gifts.</CardInfo></h3>
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
              {Don.fundraisers.map((f, i) =>
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
              )}
            </tbody>
          </table>
        </div>

        <div className="card span-7">
          <div className="card__hd">
            <div>
              <h3 className="card__title">Recent gifts<CardInfo>Last 30 days. Filter by clicking a country or gift officer above.</CardInfo></h3>
              {(countryFilter || fundraiserFilter) && (
              <div className="card__sub">
                {countryFilter && <span className="tag tag--ink" style={{ marginLeft: 6 }}>Country: {countryFilter} <span style={{ marginLeft: 6, cursor: 'pointer' }} onClick={(e) => {e.stopPropagation();setCountryFilter(null);}}>✕</span></span>}
                {fundraiserFilter && <span className="tag tag--ink" style={{ marginLeft: 6 }}>FR: {fundraiserFilter} <span style={{ marginLeft: 6, cursor: 'pointer' }} onClick={(e) => {e.stopPropagation();setFundraiserFilter(null);}}>✕</span></span>}
              </div>
              )}
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
              {Don.recentGifts.filter((g) => !fundraiserFilter || g.fundraiser.includes(fundraiserFilter.split(' ')[0])).map((g, i) =>
              <tr key={i}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.date}</td>
                  <td className="label">{g.donor}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{g.fund}</td>
                  <td className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>{g.fundraiser}</td>
                  <td className="num">${g.amount.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>);

}

Object.assign(window, { DonationsView });