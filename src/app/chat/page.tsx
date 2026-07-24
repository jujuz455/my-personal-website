'use client';
import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

function useFadeIn(delay = 0) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return vis;
}

function AlternateModel() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;

    // wireframe mesh: tubes of elliptical cross-sections { x, y, z, rx, rz } in model units (height ≈ 1.85)
    type Sec = { x: number; y: number; z: number; rx: number; rz: number };
    type Tube = { secs: Sec[]; step: number; breathe?: boolean };
    const sec = (x: number, y: number, z: number, rx: number, rz = rx): Sec => ({ x, y, z, rx, rz });

    // torso + head: slender shoulders, narrow waist, soft bust, small chin, round skull
    const body: Tube = {
      step: 3, breathe: true,
      secs: [
        sec(0, 0.98, 0, 0.150, 0.105),
        sec(0, 1.05, 0, 0.120, 0.095),
        sec(0, 1.12, 0, 0.095, 0.085),
        sec(0, 1.20, 0, 0.105, 0.090),
        sec(0, 1.28, 0.010, 0.120, 0.105),
        sec(0, 1.34, 0.015, 0.125, 0.110),
        sec(0, 1.40, 0, 0.120, 0.095),
        sec(0, 1.46, 0, 0.145, 0.095),
        sec(0, 1.51, 0, 0.085, 0.075),
        sec(0, 1.55, 0, 0.035, 0.035),
        sec(0, 1.59, 0, 0.033, 0.035),
        sec(0, 1.62, 0, 0.055, 0.065),
        sec(0, 1.67, 0, 0.082, 0.092),
        sec(0, 1.72, 0, 0.092, 0.100),
        sec(0, 1.77, 0, 0.080, 0.088),
        sec(0, 1.81, 0, 0.045, 0.052),
      ],
    };

    // a-line skirt flaring from the hips
    const skirt: Tube = {
      step: 3,
      secs: [
        sec(0, 0.98, 0, 0.150, 0.110),
        sec(0, 0.90, 0, 0.175, 0.130),
        sec(0, 0.80, 0, 0.205, 0.155),
        sec(0, 0.70, 0, 0.235, 0.180),
        sec(0, 0.63, 0, 0.255, 0.195),
      ],
    };

    const limb = (s: number, pts: [number, number, number, number, number?][]): Tube => ({
      step: 6,
      secs: pts.map(([x, y, z, rx, rz]) => sec(s * x, y, z, rx, rz ?? rx)),
    });

    const raw: Tube[] = [body, skirt];
    for (const s of [1, -1]) {
      // legs: slim thigh → knee → calf → ankle → foot extending forward
      raw.push(limb(s, [
        [0.072, 0.62, 0, 0.060],
        [0.074, 0.50, 0, 0.048],
        [0.075, 0.40, 0, 0.052],
        [0.076, 0.26, 0, 0.036],
        [0.077, 0.10, 0, 0.024],
        [0.077, 0.05, 0.030, 0.026, 0.048],
        [0.077, 0.02, 0.050, 0.028, 0.070],
      ]));
      // arms: slender, relaxed A-pose, shoulder → elbow → wrist → hand
      raw.push(limb(s, [
        [0.150, 1.46, 0, 0.032],
        [0.175, 1.39, 0, 0.036],
        [0.195, 1.27, 0, 0.030],
        [0.205, 1.14, 0, 0.026],
        [0.215, 1.00, 0, 0.024],
        [0.222, 0.88, 0, 0.020],
        [0.226, 0.80, 0, 0.019, 0.030],
      ]));
    }

    // subdivide twice + gentle smoothing → dense lattice that reads as a continuous scanned surface
    const refine = (secs: Sec[]): Sec[] => {
      let list = secs;
      for (let k = 0; k < 2; k++) {
        const out: Sec[] = [];
        for (let i = 0; i < list.length - 1; i++) {
          const a = list[i], b = list[i + 1];
          out.push(a);
          out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, rx: (a.rx + b.rx) / 2, rz: (a.rz + b.rz) / 2 });
        }
        out.push(list[list.length - 1]);
        list = out;
      }
      return list.map((c, i) => {
        if (i === 0 || i === list.length - 1) return c;
        const p = list[i - 1], n = list[i + 1];
        return {
          x: c.x * 0.5 + (p.x + n.x) * 0.25,
          y: c.y,
          z: c.z * 0.5 + (p.z + n.z) * 0.25,
          rx: c.rx * 0.5 + (p.rx + n.rx) * 0.25,
          rz: c.rz * 0.5 + (p.rz + n.rz) * 0.25,
        };
      });
    };
    const tubes: Tube[] = raw.map(t => ({ ...t, secs: refine(t.secs) }));

    const N = 48;
    let th = 0;
    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) {
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      th += dt * 0.45;
      ctx.clearRect(0, 0, W, H);
      if (W > 0 && H > 0) {
        const cx = W / 2;
        const scale = Math.min(H / 2.25, W / 0.85);
        const baseY = H * 0.92;
        const persp = 3.4;
        const scanY = (Math.sin(now * 0.00035) * 0.5 + 0.5) * 1.85;
        const breath = 1 + 0.02 * Math.sin(now * 0.0016);

        // base platform
        const pr = 0.38 * scale;
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 6, pr, pr * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,168,67,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 6, pr * 0.68, pr * 0.68 * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,168,67,0.18)';
        ctx.stroke();

        const cos = Math.cos(th), sin = Math.sin(th);
        const proj = (x: number, y: number, z: number): [number, number] => {
          const xr = x * cos - z * sin;
          const zr = x * sin + z * cos;
          const p = persp / (persp + zr);
          return [cx + xr * scale * p, baseY - y * scale * p];
        };

        for (const tube of tubes) {
          const grid = tube.secs.map(c => {
            const b = tube.breathe && c.y > 1.05 && c.y < 1.55 ? breath : 1;
            const pts: [number, number][] = [];
            for (let j = 0; j < N; j++) {
              const a = (j / N) * Math.PI * 2;
              pts.push(proj(c.x + Math.cos(a) * c.rx * b, c.y, c.z + Math.sin(a) * c.rz * b));
            }
            return pts;
          });

          // cross-section rings
          tube.secs.forEach((c, i) => {
            ctx.beginPath();
            grid[i].forEach(([px, py], j) => j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
            ctx.closePath();
            const near = Math.max(0, 1 - Math.abs(c.y - scanY) * 2.4);
            ctx.strokeStyle = `rgba(212,168,67,${0.17 + near * 0.45})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          });

          // meridian wires connecting the rings lengthwise
          for (let j = 0; j < N; j += tube.step) {
            ctx.beginPath();
            grid.forEach((pts, i) => i === 0 ? ctx.moveTo(pts[j][0], pts[j][1]) : ctx.lineTo(pts[j][0], pts[j][1]));
            ctx.strokeStyle = 'rgba(212,168,67,0.26)';
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function KleinBottle({ agitated, pulseKey }: { agitated: boolean; pulseKey: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ agitated, pulseKey });
  state.current = { agitated, pulseKey };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;

    const TAU = Math.PI * 2;
    const U = 56, V = 24, MSTEP = 3;

    // classic klein-bottle immersion, normalized to ~[-1,1]; t/energy drive the topological breathing
    const surf = (u: number, v: number, t: number, energy: number): [number, number, number] => {
      const flow = 1
        + 0.07 * Math.sin(u * 3 - t * (0.9 + energy * 1.8))
        + 0.045 * Math.sin(t * 0.6 + u);
      const r = 4 * (1 - Math.cos(u) / 2) * flow;
      let x: number, y: number;
      if (u < Math.PI) {
        x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(u) * Math.cos(v);
        y = 16 * Math.sin(u) + r * Math.sin(u) * Math.cos(v);
      } else {
        x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(v + Math.PI);
        y = 16 * Math.sin(u);
      }
      return [x / 20, (y - 2) / 20, (r * Math.sin(v)) / 20];
    };

    // words flung into the bottle: fly in from the chat edge, then spiral the surface and dissolve
    type Stream = {
      phase: 'fly' | 'spiral';
      p: number; life: number; delay: number;
      ex: number; ey: number;
      u: number; v: number; spin: number;
    };
    const streams: Stream[] = [];
    let seenPulse = state.current.pulseKey;

    let th = 0, energy = 0, raf = 0, last = performance.now();

    const draw = (now: number) => {
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) {
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      energy += ((state.current.agitated ? 1 : 0) - energy) * Math.min(1, dt * 2.5);
      // no cheap uniform spin: drifting tumble whose speed itself wanders
      th += dt * (0.12 + 0.08 * Math.sin(t * 0.23)) * (1 + energy * 1.5);
      const tilt = 0.5 + 0.22 * Math.sin(t * 0.17);

      if (state.current.pulseKey !== seenPulse) {
        seenPulse = state.current.pulseKey;
        for (let k = 0; k < 22; k++) {
          streams.push({
            phase: 'fly', p: 0, life: 0, delay: k * 0.05,
            ex: -8, ey: 0,
            u: 0, v: Math.random() * TAU, spin: 4 + Math.random() * 5,
          });
        }
      }

      ctx.clearRect(0, 0, W, H);
      if (W > 0 && H > 0) {
        const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.52;
        const cosY = Math.cos(th), sinY = Math.sin(th);
        const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
        const persp = 3.6;
        const proj = (P: [number, number, number]): [number, number, number] => {
          const [x, y, z] = P;
          const xr = x * cosY - z * sinY;
          let zr = x * sinY + z * cosY;
          const yr = y * cosX - zr * sinX;
          zr = y * sinX + zr * cosX;
          const s = persp / (persp + zr);
          return [cx + xr * R * s, cy - yr * R * s, zr];
        };

        // gold at rest; a cold blue-green creeps in while it thinks
        const col = (a: number) =>
          `rgba(${Math.round(212 - 92 * energy)},${Math.round(168 + 42 * energy)},${Math.round(67 + 112 * energy)},${a})`;

        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
        glow.addColorStop(0, col(0.08 + 0.06 * energy));
        glow.addColorStop(1, col(0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        const grid: [number, number, number][][] = [];
        for (let i = 0; i <= U; i++) {
          const u = (i / U) * TAU;
          const row: [number, number, number][] = [];
          for (let j = 0; j <= V; j++) {
            row.push(proj(surf(u, (j / V) * TAU, t, energy)));
          }
          grid.push(row);
        }

        // rings; the self-intersection band shimmers
        for (let i = 0; i <= U; i++) {
          const u = (i / U) * TAU;
          ctx.beginPath();
          grid[i].forEach(([px, py], j) => j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
          const band = Math.max(0, 1 - Math.abs(u - 1.3 * Math.PI) / (0.25 * Math.PI));
          const flick = band * (0.5 + 0.5 * Math.sin(t * 6 + u * 9));
          ctx.strokeStyle = col(0.17 + 0.34 * flick);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        // meridians
        for (let j = 0; j < V; j += MSTEP) {
          ctx.beginPath();
          grid.forEach((row, i) => i === 0 ? ctx.moveTo(row[j][0], row[j][1]) : ctx.lineTo(row[j][0], row[j][1]));
          ctx.strokeStyle = col(0.22);
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }

        // light streams
        const [mx, my] = proj(surf(1.8 * Math.PI, Math.PI / 2, t, energy));
        for (let k = streams.length - 1; k >= 0; k--) {
          const st = streams[k];
          if (st.delay > 0) { st.delay -= dt; continue; }
          if (st.phase === 'fly') {
            if (st.ey === 0) st.ey = cy + (Math.random() - 0.5) * H * 0.3;
            st.p += dt * 1.1;
            if (st.p >= 1) {
              st.phase = 'spiral'; st.u = 1.8 * Math.PI; st.life = 0;
            } else {
              const q = 1 - st.p;
              const cpx = (st.ex + mx) / 2;
              const cpy = Math.min(st.ey, my) - H * 0.12;
              const px = q * q * st.ex + 2 * q * st.p * cpx + st.p * st.p * mx;
              const py = q * q * st.ey + 2 * q * st.p * cpy + st.p * st.p * my;
              ctx.beginPath();
              ctx.arc(px, py, 1.1, 0, TAU);
              ctx.fillStyle = `rgba(240,214,140,${0.35 + 0.5 * st.p})`;
              ctx.fill();
            }
          }
          if (st.phase === 'spiral') {
            st.life += dt;
            st.u -= dt * 1.6;
            st.v += dt * st.spin;
            const uu = ((st.u % TAU) + TAU) % TAU;
            const [px, py] = proj(surf(uu, st.v, t, energy));
            const a = Math.max(0, 0.8 - st.life * 0.36);
            if (a <= 0) { streams.splice(k, 1); continue; }
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, TAU);
            ctx.fillStyle = `rgba(240,214,140,${a})`;
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'submitted' || status === 'streaming';

  const nav   = useFadeIn(80);
  const panel = useFadeIn(300);
  const popup = useFadeIn(1400);
  const [moodStable, setMoodStable] = useState(true);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setMoodStable(m => {
        const next = !m;
        id = setTimeout(tick, next ? 6000 : 1000);
        return next;
      });
    };
    id = setTimeout(tick, 6000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <main style={{
      height: '100dvh',
      background: '#080C14',
      color: '#C8D6E0',
      fontFamily: 'var(--font-geist-sans), sans-serif',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>

      <style>{`
        @keyframes chatpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .alt-aside { display: none; }
        @media (min-width: 1180px) { .alt-aside { display: flex; } }
      `}</style>

      {/* background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage:
          'linear-gradient(rgba(212,168,67,0.022) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(212,168,67,0.022) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* top nav */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '2.2rem 8vw 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        opacity: nav ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        <Link href="/" style={{
          fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.5)', textDecoration: 'none',
        }}>
          ← Home
        </Link>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>TRANSMISSION LOG</p>
          <p style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.35)', margin: 0 }}>THE ALTERNATE 润辰 · ON AIR</p>
        </div>
      </div>

      {/* heading */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '2.6rem 8vw 0',
        opacity: nav ? 1 : 0,
        transform: nav ? 'translateY(0)' : 'translateY(18px)',
        transition: 'opacity 1s ease 0.15s, transform 1s ease 0.15s',
      }}>
        <div style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontWeight: 600,
          fontSize: 'clamp(30px, 4.5vw, 56px)',
          lineHeight: 1,
          color: '#D4A843',
          letterSpacing: '-0.01em',
          textShadow: '0 0 80px rgba(212,168,67,0.15)',
          userSelect: 'none',
        }}>
          TALK TO ME
        </div>
        <p style={{
          fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
          color: '#6A90A8', margin: '1.1rem 0 0 2px',
        }}>
          an AI version of me · trained on my ramblings · possibly The Alternate
        </p>
      </div>

      {/* specimen — floats centered in the blank space left of the chat panel */}
      <div className="alt-aside" style={{
        position: 'fixed',
        left: 'calc((100vw - 820px) / 4)',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(340px, calc((100vw - 852px) / 2))',
        height: '68vh',
        flexDirection: 'column',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: panel ? 1 : 0,
        transition: 'opacity 1.2s ease 0.5s',
      }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AlternateModel />
        </div>
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-geist-mono)', fontSize: '9px',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.45)', margin: '0.9rem 0 0',
        }}>
          The Alternate 润辰
        </p>

      </div>

      {/* status popup — floats in the gap between the model and the chat panel */}
      <div className="alt-aside" style={{
        position: 'fixed',
        left: 'calc((100vw - 820px) / 110 + 59px)',
        top: '88%',
        transform: `translateY(-50%) ${popup ? 'translateY(0)' : 'translateY(6px)'}`,
        flexDirection: 'column',
        zIndex: 3,
        pointerEvents: 'none',
        background: 'rgba(4,10,22,0.88)',
        border: '1px solid rgba(111,227,154,0.35)',
        boxShadow: '0 0 30px rgba(111,227,154,0.08)',
        padding: '0.65rem 0.85rem',
        width: 'max-content', maxWidth: '200px',
        fontFamily: 'var(--font-geist-mono)', fontSize: '10px',
        lineHeight: 1.9, letterSpacing: '0.04em',
        color: 'rgba(111,227,154,0.85)',
        opacity: popup ? 1 : 0,
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        <p style={{ margin: 0 }}>&gt; Soul: UNDEFINED</p>
        <p style={{ margin: 0 }}>
          &gt; Mood: <span style={{ color: moodStable ? '#4ADE80' : '#F87171' }}>{moodStable ? 'STABLE' : 'UNSTABLE'}</span>
        </p>
        <p style={{ margin: 0 }}>
          &gt; [WARNING] Destruction protocol: standby
          <span style={{ animation: 'chatpulse 1.1s steps(1) infinite' }}>▍</span>
        </p>
      </div>

      {/* klein bottle — floats centered in the blank space right of the chat panel */}
      <div className="alt-aside" style={{
        position: 'fixed',
        right: 'calc((100vw - 820px) / 4)',
        top: '50%',
        transform: 'translate(50%, -50%)',
        width: 'min(340px, calc((100vw - 852px) / 2))',
        height: '68vh',
        flexDirection: 'column',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: panel ? 1 : 0,
        transition: 'opacity 1.2s ease 0.7s',
      }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <KleinBottle agitated={isLoading} pulseKey={messages.length} />
        </div>
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-geist-mono)', fontSize: '9px',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.45)', margin: '0.9rem 0 0',
        }}>
          {messages.length === 0 ? 'no inside · no outside' : 'recirculating · nothing is kept'}
        </p>
      </div>

      {/* chat panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        maxWidth: '820px', width: '100%',
        margin: '2rem auto 0',
        padding: '0 8vw 2.2rem',
        boxSizing: 'content-box',
        opacity: panel ? 1 : 0,
        transform: panel ? 'translateY(0)' : 'translateY(18px)',
        transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
      }}>

        <p style={{
          fontFamily: 'var(--font-geist-mono)', fontSize: '9px',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'rgba(212,168,67,0.4)', margin: '0 0 0.7rem', textAlign: 'center',
        }}>
          Sub-routine is moody. Inputs evaluated by discretion; complete radio silence is standard behavior
        </p>

        {/* panel frame */}
        <div style={{
          position: 'relative',
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(212,168,67,0.32)',
          background: 'rgba(5,11,24,0.85)',
          boxShadow: '0 0 70px rgba(212,168,67,0.09), 0 28px 70px rgba(0,0,0,0.55)',
        }}>

          {/* corner brackets */}
          {([
            { top: '-1px', left: '-1px', borderWidth: '2px 0 0 2px' },
            { top: '-1px', right: '-1px', borderWidth: '2px 2px 0 0' },
            { bottom: '-1px', left: '-1px', borderWidth: '0 0 2px 2px' },
            { bottom: '-1px', right: '-1px', borderWidth: '0 2px 2px 0' },
          ] as const).map((pos, i) => (
            <span key={i} aria-hidden style={{
              position: 'absolute', width: '14px', height: '14px',
              borderStyle: 'solid', borderColor: 'rgba(212,168,67,0.75)',
              pointerEvents: 'none', zIndex: 2, ...pos,
            }} />
          ))}

          {/* panel header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1.2rem',
            borderBottom: '1px solid rgba(212,168,67,0.22)',
            background: 'rgba(212,168,67,0.05)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <span aria-hidden style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#D4A843', boxShadow: '0 0 10px rgba(212,168,67,0.9)',
                animation: 'chatpulse 2.2s ease-in-out infinite',
              }} />
              <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(212,168,67,0.65)' }}>
                Channel 001 — Live
              </span>
            </span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(200,214,224,0.3)' }}>
              The Alternate 润辰
            </span>
          </div>

          {/* messages */}
          <div ref={scrollRef} style={{
            flex: 1, minHeight: 0,
            overflowY: 'auto',
            padding: '1.8rem 1.6rem',
            display: 'flex', flexDirection: 'column', gap: '1.6rem',
          }}>

          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '1rem',
              userSelect: 'none',
            }}>
              <span style={{ fontSize: '18px', color: 'rgba(212,168,67,0.35)' }}>✦</span>
              <p style={{
                fontFamily: 'var(--font-geist-mono)', fontSize: '10px',
                letterSpacing: '0.24em', textTransform: 'uppercase',
                color: 'rgba(200,214,224,0.25)', margin: 0, textAlign: 'center', lineHeight: 2.2,
              }}>
                channel open — transmit a thought
              </p>
            </div>
          )}

          {messages.map(m => {
            const text = m.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map(p => p.text)
              .join('');
            const isUser = m.role === 'user';
            return (
              <div key={m.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}>
                <p style={{
                  fontFamily: 'var(--font-geist-mono)', fontSize: '8px',
                  letterSpacing: '0.26em', textTransform: 'uppercase',
                  color: isUser ? 'rgba(212,168,67,0.45)' : 'rgba(106,144,168,0.6)',
                  margin: '0 0 0.45rem',
                }}>
                  {isUser ? 'YOU' : 'THE ALTERNATE 润辰'}
                </p>
                <div style={{
                  maxWidth: '82%',
                  padding: '0.85rem 1.1rem',
                  fontSize: '14px', lineHeight: 1.85,
                  whiteSpace: 'pre-wrap',
                  ...(isUser ? {
                    background: 'rgba(212,168,67,0.08)',
                    border: '1px solid rgba(212,168,67,0.3)',
                    color: '#DECFA8',
                  } : {
                    background: 'rgba(200,214,224,0.04)',
                    border: '1px solid rgba(200,214,224,0.14)',
                    color: '#A8BCC8',
                  }),
                }}>
                  {text}
                  {!isUser && isLoading && m.id === messages[messages.length - 1]?.id && (
                    <span style={{ color: 'rgba(212,168,67,0.7)' }}>▍</span>
                  )}
                </div>
              </div>
            );
          })}

          {status === 'submitted' && (
            <p style={{
              fontFamily: 'var(--font-geist-mono)', fontSize: '9px',
              letterSpacing: '0.24em', textTransform: 'uppercase',
              color: 'rgba(106,144,168,0.5)', margin: 0,
            }}>
              The Alternate 润辰 is thinking…
            </p>
          )}
          </div>
        </div>

        {/* input bar */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.7rem', marginTop: '0.9rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="transmit a thought…"
            style={{
              flex: 1,
              background: 'rgba(4,10,22,0.55)',
              border: `1px solid ${focused ? 'rgba(212,168,67,0.5)' : 'rgba(212,168,67,0.18)'}`,
              color: '#C8D6E0',
              caretColor: '#D4A843',
              padding: '0.8rem 1.1rem',
              fontSize: '14px',
              fontFamily: 'var(--font-geist-sans), sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.8rem 1.6rem',
              background: 'transparent',
              border: '1px solid rgba(212,168,67,0.3)',
              color: isLoading ? 'rgba(212,168,67,0.35)' : '#D4A843',
              fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              if (isLoading) return;
              (e.currentTarget as HTMLElement).style.background = 'rgba(212,168,67,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,67,0.55)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,67,0.3)';
            }}
          >
            {isLoading ? '· · ·' : 'Send ✦'}
          </button>
        </form>
      </div>
    </main>
  );
}
