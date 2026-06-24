// background-motion.jsx — Ambient Bauhaus motion layer.
// A fixed-position SVG backdrop with slow-drifting brand glyphs:
// open books (seminary), Heritage Crimson squares, Aero Blue circles,
// Ochre Yellow triangles, and coins. Low opacity, deliberate, dignified.

(() => {
  const { useMemo, useEffect, useState } = React;

  // Seeded RNG so layout is stable across renders
  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Glyph SVGs (small, brand-colored) ──────────────
  const Book = ({ size = 32, color = '#005596' }) => (
    <svg width={size} height={size * 0.7} viewBox="0 0 40 28" fill="none">
      <path d="M2 4 C6 2.4 12 2 18 3.2 C18.8 3.4 19.2 4 19.2 4.8 L19.2 24 C19.2 24.6 18.6 25 18 24.8 C12.4 23.6 6.6 23.8 2.4 25.2 C1.8 25.4 1 25 1 24.4 L1 5 C1 4.6 1.4 4.2 2 4 Z"
            fill={color} opacity="0.9" />
      <path d="M38 4 C34 2.4 28 2 22 3.2 C21.2 3.4 20.8 4 20.8 4.8 L20.8 24 C20.8 24.6 21.4 25 22 24.8 C27.6 23.6 33.4 23.8 37.6 25.2 C38.2 25.4 39 25 39 24.4 L39 5 C39 4.6 38.6 4.2 38 4 Z"
            fill={color} opacity="0.9" />
      <line x1="20" y1="4" x2="20" y2="25" stroke={color} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );

  const Square = ({ size = 24, color = '#DA2037' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="0" y="0" width="24" height="24" fill={color} />
    </svg>
  );

  const Circle = ({ size = 28, color = '#005596' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11.5" fill={color} />
    </svg>
  );

  const Triangle = ({ size = 26, color = '#E9B44C' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points="12,2 22,21 2,21" fill={color} />
    </svg>
  );

  const Coin = ({ size = 26, color = '#E9B44C' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={color} stroke="#1C1C1C" strokeWidth="0.8" />
      <text x="12" y="16" textAnchor="middle" fontFamily="Libre Franklin, sans-serif" fontSize="11" fontWeight="700" fill="#1C1C1C">$</text>
    </svg>
  );

  const GLYPHS = [
    { kind: 'book',     Comp: Book,     w: 32, h: 22, palette: ['#1C1C1C', '#005596', '#DA2037'] },
    { kind: 'square',   Comp: Square,   w: 22, h: 22, palette: ['#DA2037'] },
    { kind: 'circle',   Comp: Circle,   w: 24, h: 24, palette: ['#005596'] },
    { kind: 'triangle', Comp: Triangle, w: 22, h: 22, palette: ['#E9B44C'] },
    { kind: 'coin',     Comp: Coin,     w: 22, h: 22, palette: ['#E9B44C'] },
    { kind: 'triangle', Comp: Triangle, w: 16, h: 16, palette: ['#E9B44C'] },
    { kind: 'coin',     Comp: Coin,     w: 18, h: 18, palette: ['#E9B44C'] },
    { kind: 'circle',   Comp: Circle,   w: 14, h: 14, palette: ['#E9B44C'] },
    { kind: 'book',     Comp: Book,     w: 28, h: 19, palette: ['#005596', '#1C1C1C', '#E9B44C'] },
    { kind: 'square',   Comp: Square,   w: 14, h: 14, palette: ['#DA2037'] },
    { kind: 'square',   Comp: Square,   w: 12, h: 12, palette: ['#E9B44C'] },
    { kind: 'circle',   Comp: Circle,   w: 16, h: 16, palette: ['#005596'] },
  ];

  function BackgroundMotion({ density = 22, opacity = 0.07 }) {
    const [viewport, setViewport] = useState({ w: 1600, h: 1000 });

    useEffect(() => {
      const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
      onResize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    const items = useMemo(() => {
      const rng = mulberry32(0x5EEDFA11);
      const arr = [];
      for (let i = 0; i < density; i++) {
        const def = GLYPHS[Math.floor(rng() * GLYPHS.length)];
        const color = def.palette[Math.floor(rng() * def.palette.length)];
        const scale = 0.8 + rng() * 1.2;
        // Random start point anywhere in the viewport
        const startX = rng() * 100; // vw%
        const startY = rng() * 100; // vh%
        const duration = 10 + rng() * 14;   // 10–24s — perceptible drift
        const delay = -(rng() * duration);
        const rotateDir = rng() > 0.5 ? 1 : -1;
        // Each glyph drifts along a unique zigzag path — 4 waypoints
        // expressed as offsets (% strip width, vh) from start.
        const amp = 35 + rng() * 35; // % of strip width, larger sway
        const verticalDrift = (rng() - 0.5) * 60; // bigger vertical excursion
        const phaseDir = rng() > 0.5 ? 1 : -1;
        const wpX = [0, amp * phaseDir, -amp * phaseDir * 0.7, amp * phaseDir * 0.4, 0];
        const wpY = [0, verticalDrift * 0.3, verticalDrift * 0.65, verticalDrift * 0.85, verticalDrift];
        arr.push({
          id: i, def, color, scale, startX, startY,
          duration, delay, rotateDir,
          wpX, wpY,
        });
      }
      return arr;
    }, [density]);

    return (
      <>
        {/* Left margin strip — between sidebar and centered report */}
        <div
          aria-hidden="true"
          className="bgmotion bgmotion--left"
          style={{
            position: 'fixed',
            top: 0,
            left: 'var(--sidebar)',
            width: 'max(0px, calc((100vw - var(--sidebar) - var(--col)) / 2))',
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 0,
            opacity,
          }}
        >
          {items.filter((_, i) => i % 2 === 0).map((it) => renderItem(it, 'L'))}
        </div>
        {/* Right margin strip — between report and viewport edge */}
        <div
          aria-hidden="true"
          className="bgmotion bgmotion--right"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 'max(0px, calc((100vw - var(--sidebar) - var(--col)) / 2))',
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 0,
            opacity,
          }}
        >
          {items.filter((_, i) => i % 2 === 1).map((it) => renderItem(it, 'R'))}
        </div>
      </>
    );
  }

  function renderItem(it, suffix) {
    const { id, def, color, scale, startX, startY, duration, delay, rotateDir, wpX, wpY } = it;
    const Comp = def.Comp;
    const animName = `bgmotion-drift-${suffix}-${id}`;
    // Margin strip is narrow — scale waypoint X amplitudes down to keep
    // motion inside the strip (use % of strip width, not viewport).
    return (
      <div
        key={id}
        className="bgmotion__item"
        style={{
          position: 'absolute',
          left: `calc(${startX}% - ${(def.w * scale) / 2}px)`,
          top: `calc(${startY}vh - ${(def.h * scale) / 2}px)`,
          width: def.w * scale,
          height: def.h * scale,
          animation: `${animName} ${duration}s ease-in-out ${delay}s infinite alternate`,
        }}
      >
        <style>{`
          @keyframes ${animName} {
            0%   { transform: translate(${wpX[0]}%, ${wpY[0]}vh) rotate(0deg); }
            25%  { transform: translate(${wpX[1]}%, ${wpY[1]}vh) rotate(${rotateDir * 22}deg); }
            50%  { transform: translate(${wpX[2]}%, ${wpY[2]}vh) rotate(${rotateDir * -18}deg); }
            75%  { transform: translate(${wpX[3]}%, ${wpY[3]}vh) rotate(${rotateDir * 12}deg); }
            100% { transform: translate(${wpX[4]}%, ${wpY[4]}vh) rotate(${rotateDir * 30}deg); }
          }
        `}</style>
        <Comp size={def.w * scale} color={color} />
      </div>
    );
  }

  window.BackgroundMotion = BackgroundMotion;
})();
