// signals.js — Derived attention rules.
//
// Reads window.PRTS_DATA and produces a ranked list of "signals" —
// things the data flagged for the user. Each signal includes:
//   - id, kind ('bad'|'good'|'neutral')
//   - val, label, detail (for the cards)
//   - severity (number — sorts the list; higher = more attention)
//   - rule (human-readable description of WHY it fired)
//   - source (which system the data came from)
//   - drill (payload for onDrill if user clicks)
//
// To add a new rule: write a function that returns 0+ signals,
// add it to the RULES array. The dashboard auto-picks up changes.

(() => {
  const fmt = window.fmt || {
    shortMoney: (n) => '$' + (n / 1e6).toFixed(2) + 'M',
    signedPct: (n) => (n >= 0 ? '+' : '−') + Math.abs(n * 100).toFixed(1) + '%',
  };

  // ── Rules ────────────────────────────────────────────

  // Rule: any department >±10% YTD vs. budget
  function ruleBudgetVariance(D) {
    return D.finance.departments
      .filter(d => Math.abs(d.variance) > 0.10)
      .map(d => {
        const overUnder = d.variance > 0 ? 'over' : 'under';
        const sev = Math.abs(d.variance) * 100; // 10–30 typically
        return {
          id: 'budget-' + d.id,
          kind: d.variance > 0 ? 'bad' : 'neutral',
          val: fmt.signedPct(d.variance, 0),
          label: d.name + ' spend',
          detail: overUnder === 'over'
            ? `${d.head} \u00b7 ${Math.round(d.variance * 100)}% over plan YTD.`
            : `${d.head} \u00b7 ${Math.abs(Math.round(d.variance * 100))}% under plan YTD.`,
          severity: sev,
          rule: 'Department YTD variance > ±10%',
          source: 'Financial Edge NXT',
          drill: { kind: 'department', deptId: d.id },
        };
      });
  }

  // Rule: donations TTM at multi-year high
  function ruleDonationsHigh(D) {
    const total = D.donations.total;
    const ttm = total.slice(-13, -1).reduce((s, v) => s + v, 0);
    // Compute every prior TTM window and check whether current ttm beats them all
    let maxPrior = 0;
    for (let i = 12; i < total.length - 13; i++) {
      const w = total.slice(i, i + 12).reduce((s, v) => s + v, 0);
      if (w > maxPrior) maxPrior = w;
    }
    if (ttm > maxPrior) {
      const yrs = Math.floor((total.length - 13) / 12);
      return [{
        id: 'donations-high',
        kind: 'good',
        val: fmt.shortMoney(ttm),
        label: 'Donations TTM',
        detail: `New ${Math.max(yrs, 5)}-year high.`,
        severity: 18,
        rule: 'Donations TTM exceeds all prior TTM windows in the available history',
        source: "Raiser's Edge NXT",
        drill: { kind: 'donations' },
      }];
    }
    return [];
  }

  // Rule: recurring donors at all-time high
  function ruleRecurringDonors(D) {
    const series = D.donations.monthlyDonors;
    const curr = series[series.length - 1];
    const max = Math.max(...series.slice(0, -1));
    if (curr > max) {
      return [{
        id: 'recurring-high',
        kind: 'good',
        val: String(curr),
        label: 'Recurring donors',
        detail: `All-time high (prior peak: ${max}).`,
        severity: 12,
        rule: 'Monthly recurring donor count exceeds all prior months',
        source: "Raiser's Edge NXT",
        drill: { kind: 'donations' },
      }];
    }
    return [];
  }

  // Rule: program at capacity (>95%) or under-enrolled (<65%)
  function ruleEnrollmentCapacity(D) {
    const out = [];
    D.academic.programs.forEach(p => {
      const ratio = p.students / p.capacity;
      if (ratio >= 0.95) {
        out.push({
          id: 'enroll-cap-' + p.id,
          kind: 'neutral',
          val: Math.round(ratio * 100) + '%',
          label: p.name + ' at capacity',
          detail: `${p.students} of ${p.capacity} seats taken.`,
          severity: 8 + (ratio - 0.95) * 100,
          rule: 'Program enrollment ≥ 95% of capacity',
          source: 'Populi',
          drill: { kind: 'enrollment' },
        });
      } else if (ratio < 0.65 && p.capacity >= 20) {
        out.push({
          id: 'enroll-under-' + p.id,
          kind: 'neutral',
          val: Math.round(ratio * 100) + '%',
          label: p.name + ' under-enrolled',
          detail: `${p.students} of ${p.capacity} seats \u00b7 ${Math.round((1 - ratio) * 100)}% headroom.`,
          severity: (0.65 - ratio) * 30,
          rule: 'Program enrollment < 65% of capacity (and capacity ≥ 20)',
          source: 'Populi',
          drill: { kind: 'enrollment' },
        });
      }
    });
    return out;
  }

  // Rule: stale open positions (re-opening or posted >60d ago)
  function ruleOpenPositions(D) {
    const out = [];
    const today = new Date(2026, 4, 18); // May 18, 2026
    D.hr.openPositions.forEach(p => {
      if (p.stage.toLowerCase().includes('re-opening') || p.stage.toLowerCase().includes('reopening')) {
        out.push({
          id: 'pos-reopen-' + p.title.slice(0, 16),
          kind: 'bad',
          val: '↻',
          label: 'Re-open: ' + p.title,
          detail: `${p.dept} \u00b7 ${p.stage}.`,
          severity: 14,
          rule: 'Position search re-opened (offer declined or candidate withdrew)',
          source: 'Paycor',
          drill: { kind: 'headcount' },
        });
        return;
      }
      const posted = new Date(p.posted);
      const days = Math.floor((today - posted) / (1000 * 60 * 60 * 24));
      if (days > 60) {
        out.push({
          id: 'pos-stale-' + p.title.slice(0, 16),
          kind: 'neutral',
          val: days + 'd',
          label: 'Open: ' + p.title,
          detail: `${p.dept} \u00b7 ${p.stage} \u00b7 ${p.candidates} candidates.`,
          severity: 6 + Math.min(8, (days - 60) / 10),
          rule: 'Open position > 60 days since posting',
          source: 'Paycor',
          drill: { kind: 'headcount' },
        });
      }
    });
    return out;
  }

  // Rule: tuition discount rate up materially YoY
  function ruleTuitionDiscount(D) {
    const r = D.finance.tuition.realization;
    const last = r[r.length - 1];
    const prior = r[r.length - 2];
    const drop = prior.rate - last.rate;
    if (drop > 0.01) {
      return [{
        id: 'tuition-discount',
        kind: 'bad',
        val: '−' + (drop * 100).toFixed(1) + 'pt',
        label: 'Tuition realization',
        detail: `${(last.rate * 100).toFixed(1)}% net of list \u00b7 discount up.`,
        severity: drop * 200,
        rule: 'Tuition realization down > 1 pt YoY',
        source: 'Financial Edge NXT',
        drill: { kind: 'tuition' },
      }];
    }
    return [];
  }

  // Rule: grant spend pace out of step with time elapsed
  function ruleGrantPace(D) {
    const out = [];
    const today = new Date(2026, 4, 18);
    D.finance.grants.forEach(g => {
      const start = new Date(g.start + ' 01');
      const end = new Date(g.end + ' 28');
      const totalMs = end - start;
      const elapsedMs = today - start;
      if (elapsedMs <= 0 || totalMs <= 0) return;
      const timePct = Math.min(1, elapsedMs / totalMs);
      const spendPct = g.spent / g.awarded;
      const drift = Math.abs(timePct - spendPct);
      if (drift > 0.15 && spendPct < 0.92) { // skip nearly-complete grants
        const behind = timePct > spendPct;
        out.push({
          id: 'grant-' + g.id,
          kind: behind ? 'neutral' : 'bad',
          val: behind ? '−' + Math.round(drift * 100) + 'pt' : '+' + Math.round(drift * 100) + 'pt',
          label: g.name.split(' — ')[0].replace(' Endowment', ''),
          detail: behind
            ? `${Math.round(spendPct * 100)}% spent at ${Math.round(timePct * 100)}% elapsed.`
            : `${Math.round(spendPct * 100)}% spent at ${Math.round(timePct * 100)}% elapsed \u2014 ahead of plan.`,
          severity: drift * 50,
          rule: 'Grant spend pace vs. time-elapsed pace deviates > 15pt',
          source: 'Grant register',
          drill: { kind: 'op-spend' },
        });
      }
    });
    return out;
  }

  // ── Aggregator ───────────────────────────────────────

  const RULES = [
    ruleBudgetVariance,
    ruleDonationsHigh,
    ruleRecurringDonors,
    ruleEnrollmentCapacity,
    ruleOpenPositions,
    ruleTuitionDiscount,
    ruleGrantPace,
  ];

  function getSignals(D) {
    const all = [];
    RULES.forEach(rule => {
      try { all.push(...rule(D)); } catch (e) { console.warn('signal rule failed', e); }
    });
    // Sort by severity descending
    all.sort((a, b) => b.severity - a.severity);
    return all;
  }

  window.getSignals = getSignals;
})();
