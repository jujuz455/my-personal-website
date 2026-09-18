import * as THREE from 'three';
import type { DialSpec, Glyph, PanelKind } from './types';

export const IVORY_CSS = '#EDE4CF';
export const INK_CSS = '#1A1714';

let serifFamily = 'Georgia, "Times New Roman", serif';
let monoFamily = 'ui-monospace, Menlo, monospace';

/** Pick up the next/font families exposed as CSS variables on <html>. */
export function readFonts() {
  if (typeof window === 'undefined') return;
  const cs = getComputedStyle(document.documentElement);
  const c = cs.getPropertyValue('--font-cinzel').trim();
  const m = cs.getPropertyValue('--font-geist-mono').trim();
  if (c) serifFamily = `${c}, Georgia, serif`;
  if (m) monoFamily = `${m}, Menlo, monospace`;
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

const PX = 300;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

let spacingEm = 0;
let spacingMeasured: boolean | null = null;

/** Does measureText already include ctx.letterSpacing? (Chromium < 121 does not.) */
function measureIncludesSpacing(ctx: Ctx) {
  if (spacingMeasured !== null) return spacingMeasured;
  try {
    ctx.font = '20px sans-serif';
    ctx.letterSpacing = '0px';
    const a = ctx.measureText('ab').width;
    ctx.letterSpacing = '10px';
    const b = ctx.measureText('ab').width;
    ctx.letterSpacing = '0px';
    spacingMeasured = b - a > 5;
  } catch {
    spacingMeasured = true;
  }
  return spacingMeasured;
}

function textWidth(ctx: Ctx, text: string, size: number) {
  const w = ctx.measureText(text).width;
  if (measureIncludesSpacing(ctx)) return w;
  return w + Math.max(0, text.length - 1) * spacingEm * size;
}

function fitFont(ctx: Ctx, text: string, weight: string, family: string, maxW: number, start: number, min: number) {
  let size = Math.round(start);
  while (size > min) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (textWidth(ctx, text, size) <= maxW) break;
    size -= 1;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function paperNoise(ctx: Ctx, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(60,45,30,0.06)';
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
  }
  ctx.restore();
}

function etchedBorder(ctx: Ctx, w: number, h: number, double: boolean) {
  const m = Math.min(w, h);
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = Math.max(1.2, m * 0.012);
  const o = m * 0.05;
  ctx.strokeRect(o, o, w - 2 * o, h - 2 * o);
  if (double) {
    ctx.lineWidth = Math.max(0.8, m * 0.006);
    ctx.globalAlpha = 0.55;
    const i = m * 0.085;
    ctx.strokeRect(i, i, w - 2 * i, h - 2 * i);
    ctx.globalAlpha = 1;
    // corner ticks
    const t = m * 0.05;
    ctx.lineWidth = Math.max(1, m * 0.008);
    for (const [cx, cy, sx, sy] of [[o, o, 1, 1], [w - o, o, -1, 1], [o, h - o, 1, -1], [w - o, h - o, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * t, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * t);
      ctx.stroke();
    }
  }
}

export function drawGlyph(ctx: Ctx, g: Glyph, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK_CSS;
  ctx.fillStyle = INK_CSS;
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const c = s / 2;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s, y2 * s); ctx.stroke();
  };
  const circle = (cx: number, cy: number, r: number) => {
    ctx.beginPath(); ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2); ctx.stroke();
  };
  const poly = (pts: [number, number][], close = false) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)));
    if (close) ctx.closePath();
    ctx.stroke();
  };
  switch (g) {
    case 'lens':
      circle(0.5, 0.5, 0.42); circle(0.5, 0.5, 0.26);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        line(0.5 + Math.cos(a) * 0.26, 0.5 + Math.sin(a) * 0.26, 0.5 + Math.cos(a + 0.9) * 0.42, 0.5 + Math.sin(a + 0.9) * 0.42);
      }
      break;
    case 'antenna':
      line(0.5, 0.35, 0.5, 0.95); line(0.3, 0.95, 0.7, 0.95);
      for (const r of [0.14, 0.26, 0.38]) {
        ctx.beginPath(); ctx.arc(c, 0.35 * s, r * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(c, 0.35 * s, s * 0.04, 0, Math.PI * 2); ctx.fill();
      break;
    case 'channels':
      line(0.1, 0.35, 0.9, 0.35); line(0.1, 0.65, 0.9, 0.65);
      poly([[0.78, 0.27], [0.9, 0.35], [0.78, 0.43]]); poly([[0.78, 0.57], [0.9, 0.65], [0.78, 0.73]]);
      break;
    case 'signal':
      for (let i = 0; i < 4; i++) {
        const bx = 0.15 + i * 0.2; const bh = 0.2 + i * 0.2;
        ctx.strokeRect(bx * s, (0.9 - bh) * s, 0.12 * s, bh * s);
      }
      break;
    case 'bang':
      circle(0.5, 0.5, 0.42);
      line(0.5, 0.25, 0.5, 0.58);
      ctx.beginPath(); ctx.arc(c, 0.72 * s, s * 0.04, 0, Math.PI * 2); ctx.fill();
      break;
    case 'ticks': {
      line(0.05, 0.5, 0.95, 0.5);
      for (const f of [0, 1, 3, 7, 15]) { const tx = 0.08 + (f / 15) * 0.84; line(tx, 0.3, tx, 0.7); }
      break;
    }
    case 'step':
      poly([[0.08, 0.3], [0.32, 0.3], [0.32, 0.72], [0.5, 0.72], [0.5, 0.62], [0.62, 0.62], [0.62, 0.52], [0.76, 0.52], [0.76, 0.42], [0.92, 0.42]]);
      break;
    case 'box':
      poly([[0.18, 0.4], [0.18, 0.88], [0.7, 0.88], [0.7, 0.4]], true);
      poly([[0.18, 0.4], [0.36, 0.2], [0.88, 0.2], [0.7, 0.4]], true);
      poly([[0.7, 0.4], [0.88, 0.2], [0.88, 0.68], [0.7, 0.88]], true);
      break;
    case 'checklist':
      for (let i = 0; i < 3; i++) {
        const yy = 0.25 + i * 0.25;
        ctx.strokeRect(0.1 * s, (yy - 0.07) * s, 0.14 * s, 0.14 * s);
        poly([[0.13, yy], [0.17, yy + 0.04], [0.22, yy - 0.05]]);
        line(0.34, yy, 0.9, yy);
      }
      break;
    case 'bell':
      ctx.beginPath(); ctx.arc(c, 0.45 * s, 0.28 * s, Math.PI, 0); ctx.lineTo(0.78 * s, 0.7 * s); ctx.lineTo(0.22 * s, 0.7 * s); ctx.closePath(); ctx.stroke();
      line(0.1, 0.72, 0.9, 0.72); line(0.5, 0.1, 0.5, 0.17);
      ctx.beginPath(); ctx.arc(c, 0.84 * s, 0.07 * s, 0, Math.PI); ctx.stroke();
      break;
    case 'frame':
      ctx.strokeRect(0.1 * s, 0.2 * s, 0.8 * s, 0.6 * s);
      for (let i = 0; i < 4; i++) { const fx = 0.16 + i * 0.2; ctx.fillRect(fx * s, 0.1 * s, 0.08 * s, 0.05 * s); ctx.fillRect(fx * s, 0.85 * s, 0.08 * s, 0.05 * s); }
      break;
    case 'bbox':
      ctx.setLineDash([s * 0.06, s * 0.05]);
      ctx.strokeRect(0.15 * s, 0.15 * s, 0.7 * s, 0.7 * s);
      ctx.setLineDash([]);
      for (const [cx, cy, sx, sy] of [[0.15, 0.15, 1, 1], [0.85, 0.15, -1, 1], [0.15, 0.85, 1, -1], [0.85, 0.85, -1, -1]] as const) {
        poly([[cx + sx * 0.14, cy], [cx, cy], [cx, cy + sy * 0.14]]);
      }
      break;
    case 'skeleton':
      circle(0.5, 0.16, 0.08);
      line(0.5, 0.24, 0.5, 0.56);
      poly([[0.26, 0.5], [0.34, 0.32], [0.66, 0.32], [0.74, 0.5]]);
      poly([[0.32, 0.9], [0.4, 0.72], [0.5, 0.56], [0.6, 0.72], [0.68, 0.9]]);
      break;
    case 'rows':
      for (let i = 0; i < 3; i++) {
        const yy = 0.22 + i * 0.26;
        ctx.strokeRect(0.1 * s, yy * s, 0.8 * s, 0.16 * s);
        ctx.globalAlpha = i === 0 ? 0.9 : 0.35;
        ctx.fillRect(0.14 * s, (yy + 0.04) * s, (0.5 - i * 0.14) * s, 0.08 * s);
        ctx.globalAlpha = 1;
      }
      break;
    case 'table':
      ctx.strokeRect(0.1 * s, 0.15 * s, 0.8 * s, 0.7 * s);
      line(0.1, 0.38, 0.9, 0.38); line(0.1, 0.62, 0.9, 0.62);
      line(0.37, 0.15, 0.37, 0.85); line(0.63, 0.15, 0.63, 0.85);
      break;
    case 'crosshair':
      circle(0.5, 0.5, 0.4); circle(0.5, 0.5, 0.05);
      line(0.5, 0.05, 0.5, 0.3); line(0.5, 0.7, 0.5, 0.95); line(0.05, 0.5, 0.3, 0.5); line(0.7, 0.5, 0.95, 0.5);
      break;
    case 'trace': {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const tx = 0.05 + (i / 40) * 0.9;
        const ty = 0.5 + Math.sin(i * 1.7) * 0.06 * Math.sin(i * 0.4) + (i > 22 && i < 27 ? -0.25 : 0);
        if (i) ctx.lineTo(tx * s, ty * s); else ctx.moveTo(tx * s, ty * s);
      }
      ctx.stroke();
      break;
    }
    case 'node':
      circle(0.5, 0.5, 0.12); line(0.5, 0.05, 0.5, 0.38); line(0.62, 0.5, 0.95, 0.5); line(0.5, 0.62, 0.5, 0.95);
      break;
  }
  ctx.restore();
}

export interface FaceArt {
  w: number;
  h: number;
  kind: PanelKind;
  label?: string;
  sub?: string;
  glyph?: Glyph;
  dial?: DialSpec;
  ghost?: boolean;
  /** rotate text (radians), used so diamond labels read level */
  textRot?: number;
}

function setSpacing(ctx: Ctx, v: string) {
  spacingEm = parseFloat(v) || 0;
  try { ctx.letterSpacing = v; } catch { /* older browsers */ }
}

/** Split a label at the space that best balances the two halves. */
function splitTwo(label: string): [string, string] {
  const words = label.split(' ');
  let best: [string, string] = [label, ''];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.max(a.length, b.length);
    if (score < bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

/** Seismograph-style trace drawn across a wide strip. */
function drawTraceWide(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = Math.max(1.2, h * 0.06);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const tx = x + (i / N) * w;
    const spike = i > 66 && i < 74 ? -Math.sin(((i - 66) / 8) * Math.PI) * 0.34 : 0;
    const ty = y + h * (0.5 + Math.sin(i * 1.9) * 0.05 * Math.sin(i * 0.37) + spike);
    if (i) ctx.lineTo(tx, ty); else ctx.moveTo(tx, ty);
  }
  ctx.stroke();
  // baseline ticks
  ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) { const tx = x + (i / 12) * w; ctx.beginPath(); ctx.moveTo(tx, y + h * 0.82); ctx.lineTo(tx, y + h * 0.92); ctx.stroke(); }
  ctx.restore();
}

export function makeFaceTexture(a: FaceArt): THREE.CanvasTexture {
  const cw = clamp(Math.round(a.w * PX), 64, 1024);
  const ch = clamp(Math.round(a.h * PX), 48, 1024);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d') as Ctx;

  if (a.kind === 'dial' && a.dial) {
    drawDial(ctx, cw, a.label ?? '', a.dial);
  } else if (a.ghost) {
    ctx.clearRect(0, 0, cw, ch);
    ctx.strokeStyle = 'rgba(237,228,207,0.55)';
    ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
    ctx.strokeRect(6, 6, cw - 12, ch - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(237,228,207,0.7)';
    ctx.font = `500 ${ch * 0.45}px ${serifFamily}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label ?? '…', cw / 2, ch / 2);
  } else {
    ctx.fillStyle = IVORY_CSS;
    ctx.fillRect(0, 0, cw, ch);
    paperNoise(ctx, cw, ch);
    etchedBorder(ctx, cw, ch, a.kind !== 'tag' && a.kind !== 'tile');

    ctx.fillStyle = INK_CSS;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.save();
    if (a.textRot) { ctx.translate(cw / 2, ch / 2); ctx.rotate(a.textRot); ctx.translate(-cw / 2, -ch / 2); }

    const m = Math.min(cw, ch);
    const inset = m * 0.14;
    let textLeft = inset;
    const textRight = cw - inset;
    if (a.glyph && !(a.kind === 'tag' && !a.label)) {
      const gs = Math.min(ch * 0.5, cw * 0.26);
      drawGlyph(ctx, a.glyph, inset * 0.9, ch / 2 - gs / 2, gs);
      textLeft = inset * 0.9 + gs + m * 0.08;
    }
    const cx = (textLeft + textRight) / 2;
    const maxW = textRight - textLeft;

    if (a.kind === 'tag' && a.glyph && !a.label) {
      drawTraceWide(ctx, inset, ch * 0.12, cw - 2 * inset, ch * 0.76);
    } else if (a.kind === 'tag') {
      setSpacing(ctx, '0.14em');
      fitFont(ctx, (a.label ?? '').toUpperCase(), '600', serifFamily, maxW, ch * 0.5, 8);
      ctx.fillText((a.label ?? '').toUpperCase(), cw / 2, ch / 2 + 1);
      setSpacing(ctx, '0em');
    } else if (a.kind === 'tile') {
      if (a.label) {
        setSpacing(ctx, '0.12em');
        fitFont(ctx, a.label, '500', monoFamily, maxW, ch * 0.22, 7);
        ctx.fillText(a.label, cw / 2, ch / 2);
        setSpacing(ctx, '0em');
      }
    } else {
      const label = (a.label ?? '').toUpperCase();
      setSpacing(ctx, '0.16em');
      const start = a.sub ? ch * 0.23 : ch * 0.27;
      let lines = [label];
      let ls = fitFont(ctx, label, '600', serifFamily, maxW, start, 9);
      // wrap long labels onto two lines when a single line would be small
      if (ls < ch * 0.17 && label.includes(' ')) {
        const two = splitTwo(label);
        const s1 = fitFont(ctx, two[0], '600', serifFamily, maxW, start, 9);
        const s2 = fitFont(ctx, two[1], '600', serifFamily, maxW, start, 9);
        const size = Math.min(s1, s2, a.sub ? ch * 0.19 : ch * 0.22);
        if (size > ls * 1.25) { lines = two; ls = size; }
        ctx.font = `600 ${ls}px ${serifFamily}`;
      }
      const lineGap = ls * 1.25;
      if (a.sub) {
        const subSize = Math.max(9, ls * 0.6);
        const block = lines.length * lineGap + subSize * 1.9;
        let y = ch / 2 - block / 2 + lineGap / 2;
        for (const ln of lines) { ctx.fillText(ln, cx, y); y += lineGap; }
        // hairline between label and sub
        ctx.strokeStyle = INK_CSS; ctx.lineWidth = 1; ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(cx - maxW * 0.3, y - lineGap / 2 + subSize * 0.25); ctx.lineTo(cx + maxW * 0.3, y - lineGap / 2 + subSize * 0.25); ctx.stroke();
        ctx.globalAlpha = 1;
        setSpacing(ctx, '0.06em');
        fitFont(ctx, a.sub, '400', monoFamily, maxW, subSize, 7);
        ctx.globalAlpha = 0.78;
        ctx.fillText(a.sub, cx, y - lineGap / 2 + subSize * 1.05);
        ctx.globalAlpha = 1;
      } else {
        let y = ch / 2 - ((lines.length - 1) * lineGap) / 2 + 1;
        for (const ln of lines) { ctx.fillText(ln, cx, y); y += lineGap; }
      }
      setSpacing(ctx, '0em');
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function drawDial(ctx: Ctx, size: number, label: string, d: DialSpec) {
  const c = size / 2;
  const r = size * 0.5;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = IVORY_CSS;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
  paperNoise(ctx, size, size);
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = Math.max(1.5, size * 0.01);
  for (const rr of [0.93, 0.86]) { ctx.beginPath(); ctx.arc(c, c, r * rr, 0, Math.PI * 2); ctx.stroke(); }
  ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(c, c, r * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  // 270° scale from 225° (min) sweeping clockwise to -45° (max)
  const a0 = Math.PI * 1.25;
  const sweep = Math.PI * 1.5;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const a = a0 - (i / steps) * sweep;
    const major = i % 4 === 0;
    const r1 = r * 0.86, r2 = r * (major ? 0.74 : 0.8);
    ctx.lineWidth = major ? Math.max(1.5, size * 0.01) : 1;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r1, c - Math.sin(a) * r1);
    ctx.lineTo(c + Math.cos(a) * r2, c - Math.sin(a) * r2);
    ctx.stroke();
    if (major) {
      const val = d.min + ((d.max - d.min) * i) / steps;
      ctx.fillStyle = INK_CSS;
      ctx.font = `500 ${size * 0.06}px ${monoFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const rt = r * 0.63;
      ctx.fillText(String(Math.round(val)), c + Math.cos(a) * rt, c - Math.sin(a) * rt);
    }
  }
  // label + unit
  ctx.fillStyle = INK_CSS;
  setSpacing(ctx, '0.18em');
  ctx.font = `600 ${size * 0.075}px ${serifFamily}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), c, c + r * 0.3);
  setSpacing(ctx, '0.08em');
  ctx.font = `400 ${size * 0.055}px ${monoFamily}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(d.unit, c, c + r * 0.42);
  ctx.globalAlpha = 1;
  setSpacing(ctx, '0em');
  // pivot
  ctx.beginPath(); ctx.arc(c, c, size * 0.02, 0, Math.PI * 2); ctx.fill();
}

/** Soft radial glow used for the pulse sprite. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Emissive mask: etched ink → white, ivory paper → black, so only linework and labels can glow. */
export function makeInkMask(src: THREE.CanvasTexture): THREE.CanvasTexture {
  const img = src.image as HTMLCanvasElement;
  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    // paper sits around lum≈0.88; push everything lighter than mid-tone to zero
    const ink = Math.max(0, Math.min(1, (0.72 - lum) / 0.55)) * (d[i + 3] / 255);
    const v = Math.round(ink * 255);
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
