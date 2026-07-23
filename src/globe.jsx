// globe.jsx — Rotatable orthographic globe for the Academic view.
// Pure hand-rolled rendering, no external libraries:
//   • a <canvas> draws a soft "dotted Earth" (light sphere + stippled gray
//     landmasses sampled from simplified continent polygons) + faint graticule
//   • an SVG overlay carries simple round status beacons that pulse as a whole
// The globe sits directly on the page and is the centrepiece — no side list.

// ── Continent outlines [lon, lat] ──────────────────────────────────────────
// Hand-simplified coastlines — enough vertices to read as the real world.
// Edges are densified and the curves follow the sphere, so they look smooth.
const LAND_POLYS = [
  // North America + Central America — Alaska → arctic → E coast → Florida → Gulf
  // → Yucatán → Central American isthmus to Panama → Pacific coast → Baja → Alaska
  [[-166,68],[-160,71],[-156,71],[-148,70],[-141,70],[-128,70],[-117,70],[-105,72],[-95,72],[-85,70],[-81,73],[-75,72],[-68,66],[-64,60],[-60,56],[-56,52],[-61,47],[-67,45],[-70,42],[-74,40],[-75,37],[-76,35],[-81,31],[-80,27],[-80,25],[-82,26],[-83,29],[-84,30],[-88,30],[-90,29],[-94,29],[-97,26],[-97,22],[-95,18],[-92,18],[-90,21],[-87,21],[-88,18],[-88,16],[-87,13],[-83,11],[-82,9],[-79,9],[-77,8],[-80,8.5],[-83,8],[-86,11],[-90,13],[-92,15],[-96,16],[-101,17],[-106,23],[-110,24],[-112,26],[-114,30],[-117,32],[-120,34],[-122,37],[-124,40],[-124,43],[-124,47],[-128,51],[-132,55],[-138,59],[-146,60],[-152,59],[-158,57],[-162,59],[-166,62],[-166,68]],
  // Greenland
  [[-46,60],[-40,64],[-30,68],[-22,70],[-20,73],[-22,76],[-30,80],[-40,83],[-55,83],[-60,80],[-58,76],[-54,71],[-52,66],[-50,62],[-46,60]],
  // South America
  [[-77,8],[-72,11],[-64,11],[-60,9],[-52,5],[-50,0],[-44,-2],[-38,-5],[-35,-8],[-39,-13],[-39,-18],[-42,-23],[-48,-25],[-53,-34],[-58,-35],[-62,-39],[-65,-43],[-68,-46],[-70,-50],[-74,-52],[-75,-49],[-73,-44],[-73,-38],[-72,-30],[-71,-23],[-70,-18],[-71,-14],[-76,-14],[-79,-8],[-81,-5],[-80,0],[-78,5],[-77,8]],
  // Africa
  [[-16,15],[-17,21],[-13,28],[-10,31],[-6,36],[0,36],[10,37],[11,33],[19,31],[25,32],[32,31],[34,28],[35,24],[37,18],[39,15],[43,12],[48,8],[51,11],[48,4],[42,-1],[40,-6],[40,-12],[35,-18],[32,-25],[28,-33],[20,-35],[17,-29],[15,-23],[12,-17],[9,-1],[5,4],[-4,5],[-8,5],[-12,8],[-16,15]],
  // Europe — mainland only (Iberia, France, Low Countries, Scandinavia, down
  // the eastern boundary to the Black Sea, Balkans/Greece, back along the
  // Mediterranean). Italy is a separate polygon below so the coastline reads.
  [[-6,36],[-9,38],[-9,41],[-9,43],[-2,43.5],[-1,46],[-4,48],[-1,49.5],[3,51],[6,53.5],[8,55],[10,57],[8,58],[5,59],[5,61],[7,63],[11,64],[14,67],[18,69],[24,71],[30,70],[40,68],[50,67],[58,64],[61,58],[60,52],[56,48],[50,47],[45,46],[42,46],[38,46],[34,46],[31,46],[29,45],[28,43],[27,42],[26,41],[25,40.8],[24,40.5],[23.7,39.9],[23,39.2],[24,38.5],[24,38],[23.8,38],[24,37.6],[23.1,37.4],[23.2,36.8],[22.5,36.4],[21.9,36.9],[21.6,37.6],[21.3,38.2],[20.9,38.8],[20.7,39.6],[20,40],[19,42],[17,43],[15,44.5],[13.5,45.7],[12,45],[9,44.5],[7,43.5],[4,43],[3,42],[1,41],[-0.5,39],[-2,37],[-5,36.5],[-6,36]],
  // Italy — the boot. Its north edge runs up into the Po plain / Alps (lat ~46)
  // so it OVERLAPS the European mainland coast and merges into one landmass
  // (no ocean sliver). Then down the Adriatic (Gargano spur, heel) → toe
  // (Calabria) → up the Tyrrhenian coast past Naples & Rome to Genoa.
  [[8.8,44.6],[9.6,45.6],[11.2,46.0],[13.0,46.0],[13.9,45.7],[14.8,42.5],[16.0,41.9],[18.4,40.7],[18.4,40.0],[17.3,40.4],[16.6,39.8],[17.1,39.0],[16.0,38.0],[15.7,38.2],[15.0,40.0],[14.0,40.8],[12.8,41.2],[11.8,42.0],[11.0,42.5],[10.2,43.0],[9.9,43.9],[8.8,44.6]],
  // Sicily
  [[12.4,38.0],[15.5,38.2],[15.3,37.0],[12.6,37.6],[12.4,38.0]],
  // Asia
  [[28,42],[33,42],[37,44],[42,43],[47,45],[50,46],[52,42],[49,40],[45,40],[42,37],[36,35],[36,31],[34,29],[35,25],[39,21],[42,16],[44,13],[48,14],[52,16],[55,22],[58,24],[60,25],[63,25],[66,25],[68,24],[71,21],[73,16],[74,12],[77,8],[80,11],[80,15],[83,18],[87,21],[89,22],[91,22],[90,17],[93,18],[95,16],[98,12],[99,8],[101,7],[104,9],[106,11],[108,16],[107,21],[110,21],[113,22],[117,24],[120,28],[122,31],[121,37],[125,40],[129,43],[133,43],[138,46],[142,49],[146,53],[150,59],[155,62],[160,60],[165,62],[170,66],[177,68],[180,71],[170,72],[158,71],[146,72],[135,73],[122,74],[108,77],[92,78],[78,76],[68,73],[60,71],[54,69],[48,69],[43,66],[38,66],[34,67],[33,62],[37,58],[42,53],[41,49],[36,47],[31,46],[28,42]],
  // British Isles
  [[-5,50],[-3,51],[1,51],[1,53],[-1,54],[-3,55],[-5,58],[-6,57],[-6,54],[-3,53],[-5,52],[-5,50]],
  [[-10,52],[-6,52],[-6,55],[-10,54],[-10,52]],
  // Iceland
  [[-24,65],[-18,66],[-14,65],[-18,64],[-22,64],[-24,65]],
  // Japan
  [[130,31],[132,34],[136,35],[140,36],[142,40],[141,43],[143,44],[140,42],[137,37],[133,34],[130,33],[130,31]],
  // Madagascar
  [[43,-25],[45,-25],[49,-18],[50,-15],[48,-13],[44,-16],[43,-22],[43,-25]],
  // Sumatra / Java
  [[95,5],[99,2],[104,-2],[106,-6],[110,-7],[114,-8],[108,-8],[102,-5],[97,1],[95,5]],
  // Borneo
  [[109,2],[114,3],[118,1],[117,-3],[111,-3],[109,0],[109,2]],
  // New Guinea
  [[131,-1],[141,-3],[150,-7],[147,-9],[138,-8],[132,-4],[131,-1]],
  // Australia
  [[114,-22],[114,-26],[116,-31],[119,-34],[123,-34],[128,-32],[132,-32],[136,-35],[138,-35],[140,-38],[144,-38],[148,-38],[150,-37],[153,-32],[153,-28],[152,-25],[149,-21],[146,-18],[142,-11],[138,-12],[136,-12],[137,-16],[135,-15],[130,-12],[126,-14],[123,-17],[121,-20],[116,-21],[114,-22]],
  // New Zealand
  [[173,-41],[174,-37],[178,-38],[177,-41],[174,-41],[173,-41]],
  [[167,-46],[170,-44],[174,-42],[171,-46],[167,-46]],
  // Crete
  [[23.6,35.3],[26.3,35.3],[26.0,34.95],[24.5,35.0],[23.6,35.3]],
  // Hawaii — placed off the south-western US coast (eastern Pacific) the way
  // US maps inset it, rather than far out in the open central Pacific.
  // Kauai, Oahu, Maui-cluster, Big Island (NW→SE down the chain).
  [[-131.0,24.5],[-129.9,25.2],[-130.6,25.2],[-131.0,24.5]],
  [[-129.5,23.8],[-128.2,24.6],[-128.8,24.0],[-129.5,23.8]],
  [[-128.1,23.1],[-126.4,24.0],[-127.6,23.9],[-128.1,23.1]],
  [[-127.1,21.4],[-125.3,22.2],[-126.0,23.3],[-127.3,22.4],[-127.1,21.4]],
  // Antarctica — south-polar ice cap. Drawn as the coastline (W→E) closed by an
  // inner ring hugging the pole, so it fills as a solid cap. (A bare coastline
  // ring leaves a donut hole: the densified 360° closing edge winds the opposite
  // way and cancels the fill at the pole. The antimeridian seam stays radial so
  // no edge jumps a full turn of longitude.)
  [[-179,-78],[-160,-77],[-140,-75],[-120,-74],[-100,-73],[-82,-73],[-72,-72],
   [-63,-66],[-57,-63],[-60,-69],[-52,-73],[-40,-77],[-28,-75],[-12,-71],
   [0,-70],[18,-70],[38,-68],[58,-67],[78,-67],[98,-66],[118,-66],[138,-67],
   [158,-71],[170,-74],[179,-77],
   [179,-89.9],[140,-89.9],[100,-89.9],[60,-89.9],[20,-89.9],[-20,-89.9],[-60,-89.9],
   [-100,-89.9],[-140,-89.9],[-179,-89.9]],
];

// Great Lakes — rendered as ocean-coloured cut-outs in the land so Michigan
// (the lower-peninsula "mitten", where Grand Rapids sits) reads on the map.
const LAKE_POLYS = [
  // Lake Michigan
  [[-87.9,42.3],[-88.0,43.2],[-87.8,44.2],[-87.0,45.2],[-86.2,45.8],[-85.5,45.0],[-86.0,43.8],[-86.4,42.8],[-87.0,42.2],[-87.9,42.3]],
  // Lake Huron
  [[-84.6,43.8],[-84.0,45.2],[-83.2,46.0],[-82.4,45.2],[-82.0,44.2],[-82.6,43.4],[-83.6,43.3],[-84.6,43.8]],
  // Lake Superior
  [[-92.0,46.8],[-90.5,48.2],[-88.0,48.8],[-86.0,48.6],[-84.5,47.6],[-86.5,46.8],[-89.0,46.6],[-92.0,46.8]],
  // Lake Erie
  [[-83.2,41.8],[-81.5,42.6],[-79.8,42.9],[-78.9,42.6],[-80.5,41.6],[-82.5,41.5],[-83.2,41.8]],
  // Lake Ontario
  [[-79.5,43.3],[-78.0,43.9],[-76.5,43.9],[-76.2,43.5],[-77.5,43.2],[-79.0,43.1],[-79.5,43.3]],
];

// Densify polygon edges in lon/lat so the projected coastline curves with the
// sphere (instead of cutting straight chords) and corners read soft.
function densify(poly, maxStep) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    out.push(a);
    const dlon = b[0] - a[0], dlat = b[1] - a[1];
    const segs = Math.max(1, Math.ceil(Math.max(Math.abs(dlon), Math.abs(dlat)) / maxStep));
    for (let s = 1; s < segs; s++) out.push([a[0] + dlon * s / segs, a[1] + dlat * s / segs]);
  }
  return out;
}
let DENSE_POLYS = null;
function densePolys() {
  if (!DENSE_POLYS) DENSE_POLYS = LAND_POLYS.map(p => densify(p, 1.6));
  return DENSE_POLYS;
}
let DENSE_LAKES = null;
function denseLakes() {
  if (!DENSE_LAKES) {
    DENSE_LAKES = LAKE_POLYS.map(p => {
      let sx = 0, sy = 0;
      p.forEach(q => { sx += q[0]; sy += q[1]; });
      return { pts: densify(p, 0.9), cen: [sx / p.length, sy / p.length] };
    });
  }
  return DENSE_LAKES;
}

// ── Status from coverage ────────────────────────────────────────────────
const STATUS = {
  full:    { key: 'full',    label: 'Full coverage', color: '#047857', soft: '#D1FAE5' },
  partial: { key: 'partial', label: 'Partial',       color: '#B58A30', soft: '#FBF1DA' },
  gaps:    { key: 'gaps',    label: 'Coverage gaps', color: '#DA2037', soft: '#FBE2E6' },
};
function coverageOf(campus, catalogLen) {
  // Live data has no core-catalog mapping — color pins by course volume instead so
  // the globe still reads sensibly. Mock data keeps the coverage-of-catalog model.
  if (!campus.offered) {
    const n = campus.courses || 0;
    let status = STATUS.gaps;
    if (n >= 10) status = STATUS.full;
    else if (n >= 4) status = STATUS.partial;
    return { ratio: null, status };
  }
  const ratio = campus.offered.length / catalogLen;
  let status = STATUS.gaps;
  if (ratio >= 0.8) status = STATUS.full;
  else if (ratio >= 0.5) status = STATUS.partial;
  return { ratio, status };
}

// ── Orthographic projection ──────────────────────────────────────────────
// Returns rotated camera-space unit-sphere coords: X east, Y up, Z toward
// viewer (Z >= 0 ⇒ on the near, visible hemisphere).
function rot3(lon, lat, rot) {
  const λ = lon * Math.PI / 180, φ = lat * Math.PI / 180;
  const λ0 = rot.lon * Math.PI / 180, φ0 = rot.lat * Math.PI / 180;
  const Z = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  const X = Math.cos(φ) * Math.sin(λ - λ0);
  const Y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  return { X, Y, Z };
}
function project(lon, lat, rot, R, cx, cy) {
  const v = rot3(lon, lat, rot);
  return { x: cx + R * v.X, y: cy - R * v.Y, depth: v.Z };
}

// Downward rounded teardrop (upside-down drop): rounded tip at (0,0) marking
// the location, round bulb floating above it. Not a sharp pin.
function pinPath(r) {
  const h = 2.05 * r;
  return [
    'M 0 0',
    `C ${-0.32 * r} ${-0.62 * h} ${-r} ${-0.46 * h} ${-r} ${-h}`,
    `A ${r} ${r} 0 1 1 ${r} ${-h}`,
    `C ${r} ${-0.46 * h} ${0.32 * r} ${-0.62 * h} 0 0`,
    'Z',
  ].join(' ');
}

// ── The globe ─────────────────────────────────────────────────────────────
function CampusGlobe({ campuses, catalogLen, selectedId, onSelect }) {
  const wrapRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [size, setSize] = React.useState(440);
  const [, setFrame] = React.useState(0);
  const [hoverId, setHoverId] = React.useState(null);
  // Mirror hover in a ref so the animation loop can read it without listing
  // hoverId as an effect dependency (which would tear down/rebuild the RAF
  // loop on every hover change — a major source of drag stutter).
  const hoverRef = React.useRef(null);
  const setHover = (id) => { hoverRef.current = id; setHoverId(id); };

  const rotRef = React.useRef({ lon: -52, lat: 22 });
  const targetRef = React.useRef(null);
  const dragRef = React.useRef(null);
  // The globe is still by default; it rotates gently ONLY while the pointer is over
  // it — and not while hovering a pin, so pins stay clickable. Set from the SVG's
  // pointer enter/leave. (Idle auto-spin was distracting.)
  const overRef = React.useRef(false);
  const selectedRef = React.useRef(selectedId);
  React.useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  // Responsive square sizing
  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (wrapRef.current) setSize(Math.max(240, wrapRef.current.clientWidth));
    });
    ro.observe(wrapRef.current);
    setSize(Math.max(240, wrapRef.current.clientWidth));
    return () => ro.disconnect();
  }, []);

  // Centre the globe on a campus when it's selected
  React.useEffect(() => {
    if (!selectedId) return;
    const c = campuses.find(x => x.id === selectedId);
    if (c) { targetRef.current = { lon: c.lon, lat: Math.max(-55, Math.min(55, c.lat)) }; }
  }, [selectedId, campuses]);

  // Single animation loop: auto-spin + glide-to-target
  React.useEffect(() => {
    let raf;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const rot = rotRef.current;
      let changed = false;
      if (targetRef.current) {
        const t = targetRef.current;
        let dLon = t.lon - rot.lon;
        while (dLon > 180) dLon -= 360;
        while (dLon < -180) dLon += 360;
        const dLat = t.lat - rot.lat;
        if (Math.abs(dLon) < 0.4 && Math.abs(dLat) < 0.4) {
          rot.lon = t.lon; rot.lat = t.lat; targetRef.current = null;
        } else { rot.lon += dLon * 0.12; rot.lat += dLat * 0.12; }
        changed = true;
      } else if (!reduceMotion && overRef.current && !dragRef.current && !hoverRef.current && !selectedRef.current) {
        // Rotate only while the pointer hovers the globe (and not a pin).
        rot.lon += 0.10; changed = true;
      }
      if (rot.lon > 180) rot.lon -= 360;
      if (rot.lon < -180) rot.lon += 360;
      if (changed) setFrame(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Repaint when the color theme flips — covers the idle/selected case
  // where the spin loop isn't ticking frames.
  React.useEffect(() => {
    const mo = new MutationObserver(() => setFrame(f => (f + 1) % 1e6));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  // Canvas render — soft sphere volume, graticule, solid continents
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = size;
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);

    const cx = S / 2, cy = S / 2, R = S * 0.42;
    const rot = rotRef.current;

    // Theme-aware palette: warm-light sphere with dark land on light mode,
    // a softly-lit dark sphere with warm-light land in dark mode.
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const pal = dark
      ? { g0: '#403B33', g1: '#34302A', g2: '#272420',
          grat: 'rgba(255,255,255,0.06)',
          landSolid: 'rgba(228,224,214,0.34)',
          landOpaque: 'rgb(228,224,214)', landAlpha: 0.34,
          limb: 'rgba(255,255,255,0.14)' }
      : { g0: '#FDFDFE', g1: '#F4F5F7', g2: '#E7E8EC',
          grat: 'rgba(28,28,28,0.045)',
          landSolid: 'rgba(96,98,104,0.34)',
          landOpaque: 'rgb(96,98,104)', landAlpha: 0.34,
          limb: 'rgba(28,28,28,0.13)' };

    // Soft sphere with gentle inset shading for roundness
    const grad = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.34, R * 0.2, cx, cy, R);
    grad.addColorStop(0, pal.g0);
    grad.addColorStop(0.7, pal.g1);
    grad.addColorStop(1, pal.g2);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    // Graticule
    ctx.lineWidth = 1; ctx.strokeStyle = pal.grat;
    const drawArc = (pts) => {
      ctx.beginPath(); let started = false;
      for (const [lon, lat] of pts) {
        const p = project(lon, lat, rot, R, cx, cy);
        if (p.depth >= 0) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }
        else started = false;
      }
      ctx.stroke();
    };
    for (let lon = -150; lon <= 180; lon += 30) { const pts = []; for (let lat = -80; lat <= 80; lat += 3) pts.push([lon, lat]); drawArc(pts); }
    for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let lon = -180; lon <= 180; lon += 3) pts.push([lon, lat]); drawArc(pts); }

    // Solid continents. Each landmass is drawn OPAQUE onto an offscreen layer,
    // so overlapping polygons (Europe↔Asia, Italy, British Isles) union into a
    // single solid mass regardless of each polygon's winding direction — then
    // the whole layer is composited once at low opacity. This avoids both the
    // dark seams of stacked semi-transparent fills AND the sea-holes that a
    // single nonzero-winding fill punches where opposite-wound polys overlap.
    const land = document.createElement('canvas');
    land.width = S * dpr; land.height = S * dpr;
    const lc = land.getContext('2d');
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.fillStyle = pal.landOpaque;
    lc.lineJoin = 'round';

    const projPt = (lonlat) => {
      const v = rot3(lonlat[0], lonlat[1], rot);
      if (v.Z >= 0) return { x: cx + R * v.X, y: cy - R * v.Y, near: v.Z > -0.02 };
      const len = Math.hypot(v.X, v.Y) || 1e-6;
      return { x: cx + R * v.X / len, y: cy - R * v.Y / len, near: v.Z > -0.02 };
    };

    const polys = densePolys();
    for (let pi = 0; pi < polys.length; pi++) {
      const poly = polys[pi];
      let anyNear = false;
      const pts = new Array(poly.length);
      for (let i = 0; i < poly.length; i++) {
        const p = projPt(poly[i]);
        if (p.near) anyNear = true;
        pts[i] = p;
      }
      if (!anyNear) continue;
      lc.beginPath();
      lc.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) lc.lineTo(pts[i].x, pts[i].y);
      lc.closePath();
      lc.fill();
    }

    // Great Lakes — punch holes in the land layer so the sphere (ocean colour)
    // shows through and Michigan's lower peninsula reads.
    lc.globalCompositeOperation = 'destination-out';
    const lakes = denseLakes();
    for (let li = 0; li < lakes.length; li++) {
      const cen = lakes[li].cen;
      const cv = rot3(cen[0], cen[1], rot);
      if (cv.Z < 0.12) continue;                 // on/near the far side — skip
      const pts = lakes[li].pts;
      lc.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        const v = rot3(pts[i][0], pts[i][1], rot);
        if (v.Z < 0) { started = false; continue; }
        const x = cx + R * v.X, y = cy - R * v.Y;
        if (!started) { lc.moveTo(x, y); started = true; } else lc.lineTo(x, y);
      }
      lc.closePath();
      lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';

    // Composite the land layer once, clipped to the disc, at low opacity.
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = pal.landAlpha;
    ctx.drawImage(land, 0, 0, S, S);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Soft limb to seat the sphere on the page
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1; ctx.strokeStyle = pal.limb; ctx.stroke();
  });

  // Pointer rotation
  const onDown = (e) => {
    targetRef.current = null;
    dragRef.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = dragRef.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
    const rot = rotRef.current;
    rot.lon -= dx * 0.45;
    rot.lat = Math.max(-85, Math.min(85, rot.lat + dy * 0.45));
    d.x = e.clientX; d.y = e.clientY;
    setFrame(f => (f + 1) % 1e6);
  };
  // On release: if the press wasn't a drag, treat it as a click and hit-test
  // the pins ourselves. (Pointer capture retargets the native click off the
  // pin, so we can't rely on the pin's own onClick.)
  const onUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved || !e || e.clientX == null) return;
    const svg = e.currentTarget;
    if (!svg || !svg.getBoundingClientRect) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * size;
    const py = (e.clientY - rect.top) / rect.height * size;
    const rot = rotRef.current;
    let best = null, bestDist = Infinity;
    for (const c of campuses) {
      const p = project(c.lon, c.lat, rot, R, cx, cy);
      if (p.depth <= 0.04) continue;                 // far side — not clickable
      const dist = Math.hypot(px - p.x, py - p.y);   // distance to the pin tip
      if (dist < 24 && dist < bestDist) { bestDist = dist; best = c; }
    }
    if (best) onSelect(best.id === selectedId ? null : best.id);
  };
  // Track pointer presence over the globe so it rotates only on hover.
  const onEnter = () => { overRef.current = true; };
  const onLeave = (e) => { overRef.current = false; onUp(e); };

  const cx = size / 2, cy = size / 2, R = size * 0.42;
  const rot = rotRef.current;

  const markers = campuses.map((c, idx) => {
    const p = project(c.lon, c.lat, rot, R, cx, cy);
    const { status } = coverageOf(c, catalogLen);
    const active = c.id === selectedId || c.id === hoverId;
    return { c, p, status, idx, active };
  }).sort((a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0) || a.p.depth - b.p.depth);

  return (
    <div className="globe">
      <div className="globe__stage" ref={wrapRef} style={{ height: size }}>
        <canvas ref={canvasRef} className="globe__canvas" />
        <svg
          className="globe__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerEnter={onEnter} onPointerLeave={onLeave}
          style={{ cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {markers.map(({ c, p, status, idx, active }) => {
            if (p.depth <= 0.04) return null;            // hidden on far side
            const r = active ? 7 : 5.5;
            const bulbY = -2.05 * r;                     // bulb centre, above the tip
            const begin = `${(idx % 6) * 0.3}s`;
            return (
              <g key={c.id} transform={`translate(${p.x},${p.y})`}
                 style={{ cursor: 'pointer' }}
                 onPointerEnter={() => { if (dragRef.current) return; setHover(c.id); }}
                 onPointerLeave={() => { if (dragRef.current) return; setHover(null); }}>
                {/* generous invisible hit target so pins are easy to click */}
                <circle cx="0" cy={-1.1 * r} r={Math.max(15, r * 2.6)} fill="transparent" />
                {/* soft halo that pulses outward from behind the bulb */}
                <circle cx="0" cy={bulbY} r={r} fill={status.color} style={{ pointerEvents: 'none' }}>
                  <animate attributeName="r" values={`${r};${r * 2.6}`} dur="2s" begin={begin} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.36;0" dur="2s" begin={begin} repeatCount="indefinite" />
                </circle>
                {/* rounded teardrop pin — tip marks the location, solid fill */}
                <path d={pinPath(r)} fill={status.color} strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                {active && (() => {
                  const name = instName(c), loc = locality(c), w = labelW(c);
                  const flip = p.x > size * 0.6;              // near right edge → label to the left
                  const boxX = flip ? -(r + 7 + w) : r + 7;
                  const txtX = boxX + 9;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={boxX} y={bulbY - 20} width={w} height="38" rx="3" fill="#1C1C1C" />
                      <text x={txtX} y={bulbY - 2} fontSize="13" fontWeight="700" fill="#fff" fontFamily="var(--sans)">{name}</text>
                      <text x={txtX} y={bulbY + 12} fontSize="10" fill="rgba(255,255,255,0.74)" fontFamily="var(--sans)">{loc}</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
// Hover label helpers: school name large (clipped), "city · country" small.
function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
function instName(c) { return clip(String(c.institution || '').replace(/\s*-\s*Main Campus$/i, ''), 34); }
function locality(c) { return [c.city, c.country].filter(Boolean).join(' · '); }
function labelW(c) { return Math.round(Math.max(instName(c).length * 7.3, locality(c).length * 5.9)) + 20; }

Object.assign(window, { CampusGlobe, coverageOf, STATUS });
