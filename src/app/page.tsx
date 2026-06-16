'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Cinematic landscape ────────────────────────────────────────────────────
function LandscapeHero() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;

    // ── Offscreen cache canvases ────────────────────────────────────────────
    // bgC  — sky + horizon amber glow          (rebuilt on resize only)
    // mtC  — mountains + fog + hill             (rebuilt when parallax changes)
    // clC  — cloud layer                        (rebuilt at ~6 fps)
    // ovC  — ground fade + vignettes            (rebuilt on resize only)
    const bgC = document.createElement('canvas'); const bgX = bgC.getContext('2d')!;
    const mtC = document.createElement('canvas'); const mtX = mtC.getContext('2d')!;
    const clC = document.createElement('canvas'); const clX = clC.getContext('2d')!;
    const ovC = document.createElement('canvas'); const ovX = ovC.getContext('2d')!;

    let mx = 0.5, tmx = 0.5;
    let lastMoveTime = 0;   // performance.now() of last mousemove
    let lastDrawTs   = 0;   // timestamp of last actual paint
    let lastCloudTs  = 0;   // timestamp of last cloud cache rebuild
    let lastMxn      = 999; // force first mountain draw
    let t = 0;              // animation clock (60fps-equivalent units)

    // ── Stars ──────────────────────────────────────────────────────────────
    const STARS = Array.from({ length: 210 }, () => ({
      x: Math.random(), y: Math.random() * 0.54,
      r: 0.18 + Math.random() * 0.82,
      sp: 0.007 + Math.random() * 0.016,
      ph: Math.random() * Math.PI * 2,
      br: 0.22 + Math.random() * 0.52,
    }));

    // ── Mountain layers ─────────────────────────────────────────────────────
    const LAYERS = [
      { yFrac: 0.54, par: 5,  rgb: [18, 36, 74] as const,  waves: [[0.00138,0,88],[0.003,2.1,40],[0.007,5,13]] as const },
      { yFrac: 0.59, par: 15, rgb: [11, 22, 52] as const,  waves: [[0.00175,1.2,76],[0.004,4.3,34],[0.009,7,10]] as const },
      { yFrac: 0.63, par: 30, rgb: [7,  14, 36] as const,  waves: [[0.0022,3.1,66],[0.005,6.5,28],[0.012,2,8]] as const },
      { yFrac: 0.68, par: 50, rgb: [4,  9,  23] as const,  waves: [[0.0028,5.2,58],[0.007,1.8,22],[0.016,8,6]] as const },
    ];
    const wave = (x: number, ws: readonly (readonly number[])[], ox: number) =>
      ws.reduce((h, [f, p, a]) => h + Math.sin((x + ox) * f + p) * a, 0);

    // ── Clouds ─────────────────────────────────────────────────────────────
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
      const left = Math.random() > 0.5, spd = 0.34 + Math.random() * 0.22, n = 2 + Math.floor(Math.random() * 3);
      flock = {
        x: left ? -55 : W + 55, y: H * (0.09 + Math.random() * 0.22),
        vx: left ? spd : -spd, sz: 6.5 + Math.random() * 5,
        birds: Array.from({ length: n }, (_, i) => ({
          ox: (left ? 1 : -1) * i * (13 + Math.random() * 13),
          oy: (Math.random() - 0.5) * 20, wt: Math.random() * Math.PI * 2,
        })),
        life: 0, max: Math.ceil((W + 110) / spd),
      };
      flockTimer = 1600 + Math.floor(Math.random() * 2200);
    };

    // ── Fireflies ───────────────────────────────────────────────────────────
    type Fp = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
    const fps: Fp[] = [];

    // ── Cache builders (called on resize or when parallax shifts) ───────────
    const buildBg = (W: number, H: number) => {
      bgC.width = W; bgC.height = H;
      const sky = bgX.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#010407'); sky.addColorStop(0.28, '#04091a');
      sky.addColorStop(0.58, '#0a1a32'); sky.addColorStop(0.8, '#122540');
      sky.addColorStop(1, '#1a3250');
      bgX.fillStyle = sky; bgX.fillRect(0, 0, W, H);
      const hg = bgX.createRadialGradient(W*.5, H*.61, 0, W*.5, H*.61, W*.52);
      hg.addColorStop(0, 'rgba(212,168,67,0.088)'); hg.addColorStop(0.32, 'rgba(185,105,28,0.038)');
      hg.addColorStop(0.65, 'rgba(110,52,8,0.012)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      bgX.fillStyle = hg; bgX.fillRect(0, 0, W, H);
    };

    const buildMt = (W: number, H: number, mxn: number) => {
      mtC.width = W; mtC.height = H;
      mtX.clearRect(0, 0, W, H);
      LAYERS.forEach(({ yFrac, par, rgb, waves }) => {
        const ox = -mxn * par * W * 0.013, baseY = H * yFrac, [r, g, b] = rgb;
        mtX.beginPath(); mtX.moveTo(-20, H);
        for (let x = -20; x <= W + 20; x += 2) mtX.lineTo(x, baseY - wave(x, waves, ox));
        mtX.lineTo(W + 20, H); mtX.closePath();
        mtX.fillStyle = `rgb(${r},${g},${b})`; mtX.fill();
      });
      const fogY = H * 0.69;
      const fog = mtX.createLinearGradient(0, fogY - 28, 0, fogY + H * 0.09);
      fog.addColorStop(0, 'rgba(22,48,84,0)'); fog.addColorStop(0.4, 'rgba(16,36,66,0.13)');
      fog.addColorStop(1, 'rgba(8,18,40,0)');
      mtX.fillStyle = fog; mtX.fillRect(0, fogY - 28, W, H * 0.18);
      const fgOx = -mxn * 65 * W * 0.013, fgBase = H * 0.765;
      mtX.beginPath(); mtX.moveTo(-20, H);
      for (let x = -20; x <= W + 20; x += 2) {
        mtX.lineTo(x, fgBase - Math.sin((x+fgOx)*.003+2.5)*50
          - Math.sin((x+fgOx)*.0065+5.2)*25 - Math.sin((x+fgOx)*.014+1.8)*9);
      }
      mtX.lineTo(W + 20, H); mtX.closePath();
      mtX.fillStyle = '#02060e'; mtX.fill();
    };

    const buildClouds = (W: number, H: number, mxn: number) => {
      clC.width = W; clC.height = H;
      clX.clearRect(0, 0, W, H);
      CLOUDS.forEach(c => {
        const cx = (c.x + mxn * 0.008 * c.dep) * W, cy = c.y * H, cw = c.sz * W;
        c.blobs.forEach(b => {
          const bx = cx + b.ox*cw, by = cy + b.oy*cw*.3, br = b.r*cw*.38;
          const cg = clX.createRadialGradient(bx, by, 0, bx, by, br);
          cg.addColorStop(0, `rgba(148,188,218,${c.op})`);
          cg.addColorStop(1, 'rgba(148,188,218,0)');
          clX.beginPath(); clX.arc(bx, by, br, 0, Math.PI*2);
          clX.fillStyle = cg; clX.fill();
        });
      });
    };

    const buildOv = (W: number, H: number) => {
      ovC.width = W; ovC.height = H;
      ovX.clearRect(0, 0, W, H);
      const gnd = ovX.createLinearGradient(0, H*.77, 0, H);
      gnd.addColorStop(0, 'rgba(2,5,12,0)'); gnd.addColorStop(0.55, 'rgba(2,5,12,0.88)');
      gnd.addColorStop(1, '#06101e');
      ovX.fillStyle = gnd; ovX.fillRect(0, H*.77, W, H*.23);
      const topV = ovX.createLinearGradient(0, 0, 0, H*.18);
      topV.addColorStop(0, 'rgba(1,4,8,0.82)'); topV.addColorStop(1, 'rgba(1,4,8,0)');
      ovX.fillStyle = topV; ovX.fillRect(0, 0, W, H*.18);
      const lV = ovX.createLinearGradient(0, 0, W*.09, 0);
      lV.addColorStop(0, 'rgba(1,4,8,0.56)'); lV.addColorStop(1, 'rgba(1,4,8,0)');
      ovX.fillStyle = lV; ovX.fillRect(0, 0, W*.09, H);
      const rV = ovX.createLinearGradient(W, 0, W*.91, 0);
      rV.addColorStop(0, 'rgba(1,4,8,0.56)'); rV.addColorStop(1, 'rgba(1,4,8,0)');
      ovX.fillStyle = rV; ovX.fillRect(W*.91, 0, W*.09, H);
    };

    // ── Resize ──────────────────────────────────────────────────────────────
    const resize = () => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
      const W = canvas.width, H = canvas.height;
      buildBg(W, H); buildMt(W, H, 0); buildClouds(W, H, 0); buildOv(W, H);
      lastMxn = 0;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      tmx = e.clientX / window.innerWidth;
      lastMoveTime = performance.now();
    };
    window.addEventListener('mousemove', onMove);

    let animId: number;

    const draw = (now: number) => {
      animId = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      if (!W || !H) return;

      // ── Frame throttle ───────────────────────────────────────────────────
      const isIdle = now - lastMoveTime > 1500;
      if (now - lastDrawTs < (isIdle ? 55 : 16)) return; // ~18fps idle / 60fps active
      const dt = lastDrawTs ? Math.min(now - lastDrawTs, 100) : 16.67;
      lastDrawTs = now;
      const dtF = dt / 16.67; // normalised to 60fps-equivalent units
      t += dtF;

      // ── Mouse interpolation (freeze when idle) ───────────────────────────
      if (!isIdle) mx += (tmx - mx) * 0.038;
      const mxn = (mx - 0.5) * 2;

      // ── Advance cloud positions (time-normalised) ────────────────────────
      CLOUDS.forEach(c => { c.x += c.spd * dtF; if (c.x > 1.18) c.x = -0.18; });

      // ── Rebuild caches when needed ───────────────────────────────────────
      if (now - lastCloudTs > 167) { buildClouds(W, H, mxn); lastCloudTs = now; } // 6fps
      if (Math.abs(mxn - lastMxn) > 0.002) { buildMt(W, H, mxn); lastMxn = mxn; }

      // ── Composite ───────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bgC, 0, 0); // sky + horizon glow

      // Stars (twinkling — must stay per-frame)
      STARS.forEach(s => {
        const a = s.br * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)) * Math.max(0, 1 - s.y * 1.6);
        ctx.beginPath(); ctx.arc(s.x * W + mxn * 3, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,228,248,${a})`; ctx.fill();
      });

      // Moon glow (moves with mouse — 1 gradient, cheap)
      const moonX = W * 0.76 + mxn * 5;
      const mg = ctx.createRadialGradient(moonX, H*.11, 0, moonX, H*.11, H*.12);
      mg.addColorStop(0, 'rgba(215,235,255,0.07)'); mg.addColorStop(0.4, 'rgba(180,210,240,0.025)');
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H * 0.35);

      ctx.drawImage(clC, 0, 0); // clouds (6fps cache)
      ctx.drawImage(mtC, 0, 0); // mountains + fog + hill (parallax cache)

      // Swaying grass (must stay per-frame for wind animation)
      const wind = t * 0.0054, gBase = H * 0.79;
      ctx.beginPath(); ctx.moveTo(-5, H);
      const steps = Math.ceil(W / 3.5);
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * (W + 10) - 5;
        const sw = Math.sin(x*.021 + wind)*5 + Math.sin(x*.054 + wind*1.4)*2.5;
        ctx.lineTo(x + sw, gBase - 11 - Math.sin(x*.043 + 1.2)*5); ctx.lineTo(x + 3.5, gBase);
      }
      ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fillStyle = '#020810'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, H);
      const steps2 = Math.ceil(W / 6);
      for (let i = 0; i <= steps2; i++) {
        const x = (i / steps2) * (W + 10) - 5;
        const sw = Math.sin(x*.017 + wind*.87 + 1.1)*3.5;
        ctx.lineTo(x + sw, gBase - 3 - Math.sin(x*.037 + 2.6)*3.5); ctx.lineTo(x + 6, gBase);
      }
      ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fillStyle = 'rgba(4,14,34,0.55)'; ctx.fill();

      // Fireflies
      if (fps.length < 24 && Math.random() < dtF / 7) {
        fps.push({ x: Math.random()*W, y: H*.61 + Math.random()*H*.22,
          vx: (Math.random()-.5)*.26, vy: -(Math.random()*.2+.08),
          life: 0, max: 105 + Math.random()*95, r: .85 + Math.random()*.7 });
      }
      for (let i = fps.length - 1; i >= 0; i--) {
        const p = fps[i];
        p.life += dtF; p.x += (p.vx + Math.sin(p.life*.046)*.27)*dtF; p.y += p.vy*dtF;
        const ft = p.life / p.max;
        const a = (ft < .15 ? ft/.15 : ft > .78 ? (1-ft)/.22 : 1) * .5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(212,168,67,${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*4.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(212,168,67,${a*.07})`; ctx.fill();
        if (p.life >= p.max) fps.splice(i, 1);
      }

      // Birds
      flockTimer -= dtF;
      if (flockTimer <= 0 && !flock) spawnFlock(W, H);
      if (flock) {
        flock.x += flock.vx*dtF; flock.life += dtF;
        const ft = flock.life / flock.max;
        const fa = (ft < .05 ? ft/.05 : ft > .92 ? (1-ft)/.08 : 1) * .26;
        flock.birds.forEach(b => {
          b.wt += .031*dtF;
          const bx = flock!.x + b.ox, by = flock!.y + b.oy + Math.sin(flock!.life*.011)*3.5;
          ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = '#9ab4c6';
          ctx.lineWidth = 1.05; ctx.lineCap = 'round'; ctx.beginPath();
          ctx.moveTo(bx - flock!.sz, by + Math.sin(b.wt)*.23*flock!.sz);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + flock!.sz, by + Math.sin(b.wt)*.23*flock!.sz);
          ctx.stroke(); ctx.restore();
        });
        if (flock.life >= flock.max) flock = null;
      }

      ctx.drawImage(ovC, 0, 0); // ground fade + vignettes
    };

    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); window.removeEventListener('mousemove', onMove); };
  }, []);

  return (
    <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
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
