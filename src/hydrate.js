// hydrate.js — merge the live snapshot (/api/snapshot) over the mock PRTS_DATA.
// Runs before React renders (app-v6.jsx awaits window.PRTS_HYDRATE). Any failure
// (offline, 502, timeout, no API in local preview) falls back to the seeded mock,
// so the dashboard always renders. `null` values in the snapshot mean "keep mock"
// (e.g. outcomes, which isn't wired live yet).
(function () {
  var TIMEOUT_MS = 4000;

  function mergeLive(target, live) {
    if (!live || typeof live !== 'object') return;
    Object.keys(live).forEach(function (k) {
      var v = live[k];
      if (v === null || v === undefined) return;             // keep mock for this key
      if (Array.isArray(v) || typeof v !== 'object') {
        target[k] = v;                                        // arrays + scalars: live wins
      } else {
        if (typeof target[k] !== 'object' || target[k] === null) target[k] = {};
        mergeLive(target[k], v);                              // nested objects: recurse
      }
    });
  }

  window.PRTS_HYDRATE = async function () {
    var D = window.PRTS_DATA;
    if (!D) return { live: false, reason: 'no PRTS_DATA' };
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
      var res = await fetch('/api/snapshot', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timer);
      if (!res.ok) return { live: false, reason: 'HTTP ' + res.status };
      var snap = await res.json();
      var domains = [];
      if (snap.academic) { mergeLive(D.academic, snap.academic); domains.push('academic'); }
      if (snap.hr) { mergeLive(D.hr, snap.hr); domains.push('hr'); }
      if (snap.meta && snap.meta.sources && D.meta) mergeLive(D.meta.sources, snap.meta.sources);
      D.live = { generatedAt: snap.generatedAt, domains: domains };
      console.info('[PRTS] live snapshot merged:', domains.join(', ') || '(none)', '·', snap.generatedAt);
      return { live: true, domains: domains, generatedAt: snap.generatedAt };
    } catch (e) {
      console.warn('[PRTS] live snapshot unavailable — using mock:', e && e.message);
      return { live: false, reason: e && e.message };
    }
  };
})();
