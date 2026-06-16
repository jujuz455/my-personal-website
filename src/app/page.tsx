'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Cinematic landscape ────────────────────────────────────────────────────
function LandscapeHero() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;

    let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('mousemove', (e) => {
      tmx = e.clientX / window.innerWidth;
      tmy = e.clientY / window.innerHeight;
    });

    // ── Stars ──────────────────────────────────────────────────────────────
    const STARS = Array.from({ length: 210 }, () => ({
      x: Math.random(), y: Math.random() * 0.54,
      r: 0.18 + Math.random() * 0.82,
      sp: 0.007 + Math.random() * 0.016,
      ph: Math.random() * Math.PI * 2,
      br: 0.22 + Math.random() * 0.52,
    }));

    // ── Mountain layers (back→front) ────────────────────────────────────────
    const LAYERS = [
      { yFrac: 0.54, par: 5,  rgb: [18, 36, 74] as const,  waves: [[0.00138,0,88],[0.003,2.1,40],[0.007,5,13]] as const },
      { yFrac: 0.59, par: 15, rgb: [11, 22, 52] as const,  waves: [[0.00175,1.2,76],[0.004,4.3,34],[0.009,7,10]] as const },
      { yFrac: 0.63, par: 30, rgb: [7,  14, 36] as const,  waves: [[0.0022,3.1,66],[0.005,6.5,28],[0.012,2,8]] as const },
      { yFrac: 0.68, par: 50, rgb: [4,  9,  23] as const,  waves: [[0.0028,5.2,58],[0.007,1.8,22],[0.016,8,6]] as const },
    ];

    // ── Clouds ──────────────────────────────────────────────────────────────
    const CLOUDS = Array.from({ length: 7 }, () => ({
      x: Math.random(),
      y: 0.06 + Math.random() * 0.26,
      spd: 0.000022 + Math.random() * 0.000028,
      sz:  0.065 + Math.random() * 0.115,
      op:  0.028 + Math.random() * 0.038,
      dep: 0.3 + Math.random() * 0.7,
      blobs: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
        ox: (Math.random() - 0.5) * 0.9,
        oy: (Math.random() - 0.5) * 0.32,
        r:  0.32 + Math.random() * 0.68,
      })),
    }));

    // ── Birds ───────────────────────────────────────────────────────────────
    type BirdUnit = { ox: number; oy: number; wt: number };
    type Flock = { x: number; y: number; vx: number; sz: number; birds: BirdUnit[]; life: number; max: number };
    let flock: Flock | null = null;
    let flockTimer = 700 + Math.floor(Math.random() * 900);

    const spawnFlock = (W: number, H: number) => {
      const left = Math.random() > 0.5;
      const spd  = 0.34 + Math.random() * 0.22;
      const n    = 2 + Math.floor(Math.random() * 3);
      flock = {
        x: left ? -55 : W + 55,
        y: H * (0.09 + Math.random() * 0.22),
        vx: left ? spd : -spd,
        sz: 6.5 + Math.random() * 5,
        birds: Array.from({ length: n }, (_, i) => ({
          ox: (left ? 1 : -1) * i * (13 + Math.random() * 13),
          oy: (Math.random() - 0.5) * 20,
          wt: Math.random() * Math.PI * 2,
        })),
        life: 0,
        max: Math.ceil((W + 110) / spd),
      };
      flockTimer = 1600 + Math.floor(Math.random() * 2200);
    };

    // ── Fireflies ───────────────────────────────────────────────────────────
    type Fp = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
    const fps: Fp[] = [];

    // ── Wave helper ─────────────────────────────────────────────────────────
    const wave = (x: number, ws: readonly (readonly number[])[], ox: number) =>
      ws.reduce((h, [f, p, a]) => h + Math.sin((x + ox) * f + p) * a, 0);

    let t = 0, animId: number;

    const draw = () => {
      t++;
      const W = canvas.width, H = canvas.height;
      if (!W || !H) { animId = requestAnimationFrame(draw); return; }

      mx += (tmx - mx) * 0.038;
      my += (tmy - my) * 0.038;
      const mxn = (mx - 0.5) * 2; // −1 … +1

      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,    '#010407');
      sky.addColorStop(0.28, '#04091a');
      sky.addColorStop(0.58, '#0a1a32');
      sky.addColorStop(0.8,  '#122540');
      sky.addColorStop(1,    '#1a3250');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Stars
      STARS.forEach(s => {
        const a = s.br * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)) * Math.max(0, 1 - s.y * 1.6);
        ctx.beginPath();
        ctx.arc(s.x * W + mxn * 3, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,228,248,${a})`; ctx.fill();
      });

      // Moon glow (soft, upper-right)
      const moonX = W * 0.76 + mxn * 5, moonY = H * 0.11;
      const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, H * 0.12);
      mg.addColorStop(0,   'rgba(215,235,255,0.07)');
      mg.addColorStop(0.4, 'rgba(180,210,240,0.025)');
      mg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H * 0.35);

      // Horizon amber glow
      const hY = H * 0.61;
      const hg = ctx.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.52);
      hg.addColorStop(0,   'rgba(212,168,67,0.088)');
      hg.addColorStop(0.32,'rgba(185,105,28,0.038)');
      hg.addColorStop(0.65,'rgba(110,52,8,0.012)');
      hg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

      // Clouds
      CLOUDS.forEach(c => {
        c.x += c.spd; if (c.x > 1.18) c.x = -0.18;
        const cx = (c.x + mxn * 0.008 * c.dep) * W;
        const cy = c.y * H, cw = c.sz * W;
        c.blobs.forEach(b => {
          const bx = cx + b.ox * cw, by = cy + b.oy * cw * 0.3, br = b.r * cw * 0.38;
          const cg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          cg.addColorStop(0, `rgba(148,188,218,${c.op})`);
          cg.addColorStop(1, 'rgba(148,188,218,0)');
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = cg; ctx.fill();
        });
      });

      // Mountain layers (far → near)
      LAYERS.forEach(({ yFrac, par, rgb, waves }) => {
        const ox = -mxn * par * W * 0.013;
        const baseY = H * yFrac;
        const [r, g, b] = rgb;
        ctx.beginPath(); ctx.moveTo(-20, H);
        for (let x = -20; x <= W + 20; x += 2) ctx.lineTo(x, baseY - wave(x, waves, ox));
        ctx.lineTo(W + 20, H); ctx.closePath();
        ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
      });

      // Atmospheric fog at mountain bases
      const fogY = H * 0.69;
      const fog = ctx.createLinearGradient(0, fogY - 28, 0, fogY + H * 0.09);
      fog.addColorStop(0,   'rgba(22,48,84,0)');
      fog.addColorStop(0.4, 'rgba(16,36,66,0.13)');
      fog.addColorStop(1,   'rgba(8,18,40,0)');
      ctx.fillStyle = fog; ctx.fillRect(0, fogY - 28, W, H * 0.18);

      // Foreground hill
      const fgOx = -mxn * 65 * W * 0.013;
      const fgBase = H * 0.765;
      ctx.beginPath(); ctx.moveTo(-20, H);
      for (let x = -20; x <= W + 20; x += 2) {
        ctx.lineTo(x, fgBase
          - Math.sin((x + fgOx) * 0.003  + 2.5) * 50
          - Math.sin((x + fgOx) * 0.0065 + 5.2) * 25
          - Math.sin((x + fgOx) * 0.014  + 1.8) * 9);
      }
      ctx.lineTo(W + 20, H); ctx.closePath();
      ctx.fillStyle = '#02060e'; ctx.fill();

      // Swaying grass — two layers
      const wind = t * 0.0054;
      const gBase = H * 0.79;
      const steps = Math.ceil(W / 3.5);

      ctx.beginPath(); ctx.moveTo(-5, H);
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * (W + 10) - 5;
        const sw = Math.sin(x * 0.021 + wind) * 5 + Math.sin(x * 0.054 + wind * 1.4) * 2.5;
        const th = 11 + Math.sin(x * 0.043 + 1.2) * 5;
        ctx.lineTo(x + sw, gBase - th); ctx.lineTo(x + 3.5, gBase);
      }
      ctx.lineTo(W + 10, H); ctx.closePath();
      ctx.fillStyle = '#020810'; ctx.fill();

      ctx.beginPath(); ctx.moveTo(-5, H);
      const steps2 = Math.ceil(W / 6);
      for (let i = 0; i <= steps2; i++) {
        const x = (i / steps2) * (W + 10) - 5;
        const sw = Math.sin(x * 0.017 + wind * 0.87 + 1.1) * 3.5;
        const th = 8 + Math.sin(x * 0.037 + 2.6) * 3.5;
        ctx.lineTo(x + sw, gBase - th + 5); ctx.lineTo(x + 6, gBase);
      }
      ctx.lineTo(W + 10, H); ctx.closePath();
      ctx.fillStyle = 'rgba(4,14,34,0.55)'; ctx.fill();

      // Ground fade
      const gnd = ctx.createLinearGradient(0, H * 0.77, 0, H);
      gnd.addColorStop(0,   'rgba(2,5,12,0)');
      gnd.addColorStop(0.55,'rgba(2,5,12,0.88)');
      gnd.addColorStop(1,   '#06101e');
      ctx.fillStyle = gnd; ctx.fillRect(0, H * 0.77, W, H * 0.23);

      // Fireflies
      if (fps.length < 24 && t % 7 === 0) {
        fps.push({
          x: Math.random() * W,
          y: H * 0.61 + Math.random() * H * 0.22,
          vx: (Math.random() - 0.5) * 0.26,
          vy: -(Math.random() * 0.2 + 0.08),
          life: 0, max: 105 + Math.random() * 95,
          r: 0.85 + Math.random() * 0.7,
        });
      }
      for (let i = fps.length - 1; i >= 0; i--) {
        const p = fps[i];
        p.life++; p.x += p.vx + Math.sin(p.life * 0.046) * 0.27; p.y += p.vy;
        const ft = p.life / p.max;
        const a = (ft < 0.15 ? ft / 0.15 : ft > 0.78 ? (1 - ft) / 0.22 : 1) * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,168,67,${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,168,67,${a * 0.07})`; ctx.fill();
        if (p.life >= p.max) fps.splice(i, 1);
      }

      // Birds
      if (--flockTimer <= 0 && !flock) spawnFlock(W, H);
      if (flock) {
        flock.x += flock.vx; flock.life++;
        const ft = flock.life / flock.max;
        const fa = (ft < 0.05 ? ft / 0.05 : ft > 0.92 ? (1 - ft) / 0.08 : 1) * 0.26;
        flock.birds.forEach(b => {
          b.wt += 0.031;
          const bx = flock!.x + b.ox;
          const by = flock!.y + b.oy + Math.sin(flock!.life * 0.011) * 3.5;
          const flap = Math.sin(b.wt) * 0.23 * flock!.sz;
          ctx.save();
          ctx.globalAlpha = fa; ctx.strokeStyle = '#9ab4c6';
          ctx.lineWidth = 1.05; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bx - flock!.sz, by + flap);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + flock!.sz, by + flap);
          ctx.stroke(); ctx.restore();
        });
        if (flock.life >= flock.max) flock = null;
      }

      // Edge vignettes
      [[0, 0, W, H * 0.2, 0, H * 0.2, 0.78, 0, true],
       [0, 0, W * 0.1, 0, W * 0.1, 0, 0.52, false, true],
       [W, 0, W * 0.9, 0, W * 0.9, 0, 0.52, false, true]].forEach(([x0, y0, x1, y1, x2, y2, alpha, isVert]) => {
        const vg = isVert !== false
          ? ctx.createLinearGradient(x0 as number, y0 as number, x1 as number, y1 as number)
          : ctx.createLinearGradient(x0 as number, 0, x1 as number, 0);
        vg.addColorStop(0, `rgba(1,4,8,${alpha})`);
        vg.addColorStop(1, 'rgba(1,4,8,0)');
        ctx.fillStyle = vg;
        if (x2 !== 0 || y2 !== 0) {
          ctx.fillRect(0, 0, W, H * 0.2);
        } else if ((x1 as number) < W * 0.5) {
          ctx.fillRect(0, 0, W * 0.1, H);
        } else {
          ctx.fillRect(W * 0.9, 0, W * 0.1, H);
        }
      });

      // Clean top vignette
      const topV = ctx.createLinearGradient(0, 0, 0, H * 0.18);
      topV.addColorStop(0, 'rgba(1,4,8,0.82)');
      topV.addColorStop(1, 'rgba(1,4,8,0)');
      ctx.fillStyle = topV; ctx.fillRect(0, 0, W, H * 0.18);
      const lV = ctx.createLinearGradient(0, 0, W * 0.09, 0);
      lV.addColorStop(0, 'rgba(1,4,8,0.56)'); lV.addColorStop(1, 'rgba(1,4,8,0)');
      ctx.fillStyle = lV; ctx.fillRect(0, 0, W * 0.09, H);
      const rV = ctx.createLinearGradient(W, 0, W * 0.91, 0);
      rV.addColorStop(0, 'rgba(1,4,8,0.56)'); rV.addColorStop(1, 'rgba(1,4,8,0)');
      ctx.fillStyle = rV; ctx.fillRect(W * 0.91, 0, W * 0.09, H);

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ─── Triforce piece ────────────────────────────────────────────────────────
function Tri({ delay, dx, dy }: { delay: number; dx: number; dy: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      width: 0, height: 0,
      borderLeft: '24px solid transparent',
      borderRight: '24px solid transparent',
      borderBottom: '41px solid #D4A843',
      transform: on ? 'translate(0,0) scale(1)' : `translate(${dx}px,${dy}px) scale(0.1)`,
      opacity: on ? 1 : 0,
      transition: 'transform 0.7s cubic-bezier(0.34,1.5,0.64,1), opacity 0.4s ease',
    }} />
  );
}

// ─── Full-bleed rule ───────────────────────────────────────────────────────
function HRule({ show, delay = 0 }: { show: boolean; delay?: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.9rem',
      opacity: show ? 1 : 0,
      transition: `opacity 0.8s ease ${delay}ms`,
    }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(212,168,67,0.12), rgba(212,168,67,0.42))' }} />
      <span style={{ color: 'rgba(212,168,67,0.55)', fontSize: '9px' }}>◆</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, rgba(212,168,67,0.12), rgba(212,168,67,0.42))' }} />
    </div>
  );
}

const CARDS = [
  { href: '/map',   icon: '◈', label: 'The Atlas',   desc: ['Places I\'ve been to.'],    active: true  },
  { href: '/about', icon: '◉', label: 'Field Notes', desc: ['Who I am.'],       active: true  },
  { href: '/chat',  icon: '✦', label: 'Talk to Me',  desc: ['An AI version of me.','Coming soon♾️.'],         active: true  },
  { href: '#',      icon: '⚙', label: 'Projects',    desc: ['Things I\'ve built.', 'Coming soon♾️.'],          active: false },
];

export default function Home() {
  const NAME = 'Runchen Zhao';
  const [typed, setTyped]       = useState('');
  const [show, setShow]         = useState({ rules: false, triforce: false, sub: false, cards: false });
  const [scanning, setScanning] = useState(false);
  const [glow, setGlow]         = useState({ x: -999, y: -999 });

  useEffect(() => {
    const ts: [number, () => void][] = [
      [120,  () => setScanning(true)],
      [770,  () => { setScanning(false); setShow(s => ({ ...s, rules: true, triforce: true })); }],
      [1200, () => {
        let i = 0;
        const iv = setInterval(() => { i++; setTyped(NAME.slice(0, i)); if (i >= NAME.length) clearInterval(iv); }, 72);
      }],
      [2150, () => setShow(s => ({ ...s, sub: true }))],
      [2450, () => setShow(s => ({ ...s, cards: true }))],
    ];
    const ids = ts.map(([ms, fn]) => setTimeout(fn, ms));
    return () => ids.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => setGlow({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  return (
    <main style={{
      height: '100vh', background: '#06101e',
      display: 'grid', gridTemplateRows: '1fr auto',
      fontFamily: 'var(--font-geist-sans), sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes scan-down {
          from { top: -3px; opacity: 1; }
          to   { top: 100vh; opacity: 0.4; }
        }
        @keyframes tf-flash {
          0%   { filter: drop-shadow(0 0 6px rgba(212,168,67,0.4)); }
          18%  { filter: drop-shadow(0 0 60px rgba(212,168,67,1)); }
          100% { filter: drop-shadow(0 0 6px rgba(212,168,67,0.45)); }
        }
        @keyframes tf-breathe {
          0%,100% { filter: drop-shadow(0 0 6px rgba(212,168,67,0.45)); }
          50%     { filter: drop-shadow(0 0 22px rgba(212,168,67,0.95)); }
        }
        @keyframes cursor-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .zcard {
          padding: 1.6rem 2.2vw 1.8rem;
          background: rgba(4,10,22,0.72);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(212,168,67,0.07);
          transition: background .32s, box-shadow .32s, transform .3s, border-color .32s;
          cursor: pointer;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden; height: 100%; box-sizing: border-box;
        }
        .zcard::before, .zcard::after {
          content: ''; position: absolute; width: 7px; height: 7px;
          border-color: rgba(212,168,67,0.22); border-style: solid;
          transition: width .25s, height .25s, border-color .25s;
        }
        .zcard::before { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
        .zcard::after  { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }
        .zcard:hover::before, .zcard:hover::after { width: 14px; height: 14px; border-color: rgba(212,168,67,0.92); }
        .zcard:hover {
          background: rgba(212,168,67,0.08);
          border-color: rgba(212,168,67,0.32);
          box-shadow: 0 0 26px rgba(212,168,67,0.13), inset 0 0 18px rgba(212,168,67,0.04);
          transform: translateY(-3px);
        }
        .sweep { position: absolute; left: 0; top: -100%; width: 100%; height: 50%; background: linear-gradient(to bottom, transparent, rgba(212,168,67,0.07), transparent); pointer-events: none; }
        .zcard:hover .sweep { animation: sweep .55s ease forwards; }
        @keyframes sweep { from { top: -50%; } to { top: 110%; } }
        .zarrow { display: inline-block; transition: transform .2s; }
        .zcard:hover .zarrow { transform: translateX(5px); }
        .zicon { transition: transform .25s; }
        .zcard:hover .zicon { transform: scale(1.18); }
      `}</style>

      {/* Scan line */}
      {scanning && (
        <div style={{
          position: 'fixed', left: 0, width: '100%', height: '3px', zIndex: 10,
          background: 'linear-gradient(to right, transparent 0%, rgba(212,168,67,0.8) 30%, rgba(255,255,255,0.7) 50%, rgba(212,168,67,0.8) 70%, transparent 100%)',
          boxShadow: '0 0 16px rgba(212,168,67,0.7)',
          pointerEvents: 'none',
          animation: 'scan-down 0.65s ease-in forwards',
        }} />
      )}

      {/* Mouse ambient glow — subtle, above landscape */}
      <div style={{
        position: 'fixed', left: 0, top: 0, zIndex: 3,
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,67,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        transform: `translate(${glow.x - 240}px, ${glow.y - 240}px)`,
        willChange: 'transform',
      }} />

      {/* ── IDENTITY ZONE ─────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Landscape fills the zone */}
        <LandscapeHero />

        {/* Content — stacks above landscape */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative', zIndex: 2,
        }}>
          {/* Corner anchor — right only */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start',
            padding: '2rem 3vw 0',
            opacity: show.rules ? 1 : 0, transition: 'opacity 0.8s ease',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.45)' }}>
                About me · AI & ML
              </span>
              <span style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.25)' }}>
                PROJECTS · EXPLORER
              </span>
            </div>
          </div>

          {/* Top rule */}
          <div style={{ padding: '1.2rem 3vw 0' }}>
            <HRule show={show.rules} />
          </div>

          {/* Center: Triforce + Name */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '2rem', padding: '2.5rem 2rem',
          }}>
            <div style={{
              opacity: show.triforce ? 1 : 0, transition: 'opacity 0.2s',
              animation: show.triforce ? 'tf-flash 1s ease, tf-breathe 3.5s ease-in-out 1s infinite' : 'none',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div><Tri delay={780} dx={0} dy={-65} /></div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <Tri delay={840} dx={-65} dy={65} />
                  <Tri delay={840} dx={65} dy={65} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{
                fontSize: 'clamp(26px, 4.6vw, 52px)', fontWeight: 600,
                fontFamily: 'var(--font-cinzel), serif',
                color: '#D4A843', letterSpacing: '0.14em',
                textShadow: '0 0 48px rgba(212,168,67,0.55), 0 0 12px rgba(212,168,67,0.3), 0 2px 24px rgba(0,0,0,0.8)',
                margin: 0, minHeight: '1.3em', textAlign: 'center',
              }}>
                {typed}
                {typed.length < NAME.length && (
                  <span style={{
                    display: 'inline-block', width: '2px', height: '0.75em',
                    background: '#D4A843', marginLeft: '3px', verticalAlign: 'middle',
                    animation: 'cursor-blink 0.7s step-end infinite',
                  }} />
                )}
              </h1>
              <div style={{ width: '44px', height: '1px', background: 'rgba(212,168,67,0.4)', opacity: show.sub ? 1 : 0, transition: 'opacity 0.6s' }} />
              <p style={{
                fontSize: '10px', color: '#6A90A8', letterSpacing: '0.25em',
                textTransform: 'uppercase', margin: 0,
                opacity: show.sub ? 1 : 0, transition: 'opacity 0.6s ease 0.1s',
                textShadow: '0 1px 8px rgba(0,0,0,0.9)',
              }}>
                About me &nbsp;·&nbsp; AI & ML &nbsp;·&nbsp; Projects
              </p>
            </div>
          </div>

          {/* Bottom rule */}
          <div style={{ padding: '0 3vw' }}>
            <HRule show={show.rules} delay={200} />
          </div>
        </div>
      </div>

      {/* ── NAVIGATION STRIP ──────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(3,8,20,0.75), rgba(6,16,30,0.97))',
        paddingBottom: '1.25rem',
      }}>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {CARDS.map((c, i) => {
            const inner = (
              <div className="zcard" style={!c.active ? { pointerEvents: 'none' } : {}}>
                <div className="sweep" />

                {/* Card index */}
                <span style={{
                  fontSize: '8px', letterSpacing: '0.22em',
                  color: 'rgba(212,168,67,0.24)',
                  fontFamily: 'var(--font-geist-mono)',
                  marginBottom: '0.8rem',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Icon + Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
                  <span className="zicon" style={{ fontSize: '19px', color: '#D4A843', opacity: c.active ? 0.7 : 0.3 }}>{c.icon}</span>
                  <p style={{
                    fontSize: '11px', fontWeight: 600, color: '#D4A843',
                    letterSpacing: '0.13em', textTransform: 'uppercase', margin: 0,
                  }}>
                    {c.label}{c.active && <> <span className="zarrow">→</span></>}
                  </p>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '11px', color: '#6A90A8', lineHeight: 1.75,
                  margin: 0, opacity: 0.82,
                }}>
                  {c.desc[0]}<br />{c.desc[1]}
                </p>
              </div>
            );
            return (
              <div
                key={c.label}
                style={{
                  opacity: show.cards ? (c.active ? 1 : 0.28) : 0,
                  transform: show.cards ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.65s ease ${i * 110}ms, transform 0.65s ease ${i * 110}ms`,
                  borderRight: i < CARDS.length - 1 ? '1px solid rgba(212,168,67,0.09)' : 'none',
                  height: '100%',
                }}
              >
                {c.active
                  ? <Link href={c.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</Link>
                  : inner}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
