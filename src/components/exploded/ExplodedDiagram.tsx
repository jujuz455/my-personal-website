'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PanelSpec, PathSeg, SceneSpec, Vec3 } from './types';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeFaceTexture, makeGlowTexture, makeInkMask, readFonts } from './plaqueTexture';

const LOOP = 7.5;                 // seconds; camera breath + secondary motions
const IVORY = 0xede4cf;
const ROD = 0xcfc6ae;
const INK = 0x1a1714;
const CINNABAR = 0x9b2d20;
const CINNABAR_HOT = 0xe8623f;
const BG = 0x1b1922;
const WARM_WHITE = 0xffe9c4;
/** Objects on this layer are skipped by the depth pass (transparent cases, glow sprites). */
const NO_DEPTH_LAYER = 1;

/** BokehPass whose depth pre-pass ignores the NO_DEPTH_LAYER objects. */
class DiagramBokehPass extends BokehPass {
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    const cam = this.camera as THREE.Camera;
    cam.layers.disable(NO_DEPTH_LAYER);
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    cam.layers.enable(NO_DEPTH_LAYER);
  }
}

const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const Y_AXIS = new THREE.Vector3(0, 1, 0);

interface PanelRT {
  spec: PanelSpec;
  obj: THREE.Object3D;
  base: THREE.Vector3;
  world: THREE.Vector3;
  glow: THREE.MeshStandardMaterial[];
  /** face material carrying the ink emissive mask (power-on flicker) */
  face?: THREE.MeshStandardMaterial;
  radius: number;
  critical: boolean;
  needle?: THREE.Object3D;
  needleRest: number;
  skeleton?: THREE.Object3D;
  phase: number;
}

interface Polyline { pts: THREE.Vector3[]; cum: number[]; len: number }
interface StageRT { start: number; dur: number; lines: Polyline[]; end?: 'fade' | 'spread' | 'flash' }

interface PulseRT {
  group: THREE.Group;
  streak: THREE.Mesh;
  core: THREE.Mesh;
  sprite: THREE.Sprite;
  light: THREE.PointLight;
  streakMat: THREE.MeshBasicMaterial;
  coreMat: THREE.MeshBasicMaterial;
  spriteMat: THREE.SpriteMaterial;
  pos: THREE.Vector3;
  active: boolean;
}

function polylineOf(pts: THREE.Vector3[]): Polyline {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, len: cum[cum.length - 1] || 1e-6 };
}

function samplePolyline(pl: Polyline, f: number, out: THREE.Vector3, tan: THREE.Vector3) {
  const d = Math.max(0, Math.min(1, f)) * pl.len;
  let i = 1;
  while (i < pl.cum.length - 1 && pl.cum[i] < d) i++;
  const a = pl.pts[i - 1], b = pl.pts[i];
  const seg = pl.cum[i] - pl.cum[i - 1] || 1e-6;
  const t = (d - pl.cum[i - 1]) / seg;
  out.lerpVectors(a, b, t);
  tan.subVectors(b, a).normalize();
}

function buildSkeleton(h: number): THREE.LineSegments {
  const s = h;
  const P = (x: number, y: number, z = 0) => new THREE.Vector3(x * s, y * s, z * s);
  const pts: THREE.Vector3[] = [];
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a, b);
  // head (octagon)
  const hc = P(0, 0.42); const hr = 0.07 * s;
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
    seg(new THREE.Vector3(hc.x + Math.cos(a1) * hr, hc.y + Math.sin(a1) * hr, 0), new THREE.Vector3(hc.x + Math.cos(a2) * hr, hc.y + Math.sin(a2) * hr, 0));
  }
  seg(P(0, 0.35), P(0, 0.05));                    // spine
  seg(P(-0.17, 0.3), P(0.17, 0.3));               // shoulders
  seg(P(-0.17, 0.3), P(-0.24, 0.08)); seg(P(-0.24, 0.08), P(-0.2, -0.1, 0.1));   // left arm
  seg(P(0.17, 0.3), P(0.26, 0.12)); seg(P(0.26, 0.12), P(0.32, 0.3, -0.1));     // right arm raised
  seg(P(-0.11, 0.05), P(0.11, 0.05));              // hips
  seg(P(-0.11, 0.05), P(-0.13, -0.22)); seg(P(-0.13, -0.22), P(-0.15, -0.45));  // left leg
  seg(P(0.11, 0.05), P(0.16, -0.2, 0.1)); seg(P(0.16, -0.2, 0.1), P(0.1, -0.45, 0.05)); // right leg
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: IVORY, transparent: true, opacity: 0.9 });
  const lines = new THREE.LineSegments(geo, mat);
  // joints
  const jointGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const joints = new THREE.Points(jointGeo, new THREE.PointsMaterial({ color: IVORY, size: 0.035 * s * 4, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  lines.add(joints);
  return lines;
}

function buildRibbon(points: THREE.Vector3[], width: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  const N = 90;
  const samples = curve.getSpacedPoints(N);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = samples[i];
    pos.push(p.x, p.y, p.z - width / 2, p.x, p.y, p.z + width / 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  // etched edge lines
  const edgeMat = new THREE.LineBasicMaterial({ color: INK });
  for (const side of [-1, 1]) {
    const e = samples.map(p => new THREE.Vector3(p.x, p.y + 0.002, p.z + (side * width) / 2));
    mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(e), edgeMat));
  }
  return { mesh, samples };
}

export default function ExplodedDiagram({ spec, label }: { spec: SceneSpec; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = () => {
      if (disposed) return;
      readFonts();
      cleanup = mount(host, spec);
    };
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(start, start);
    } else start();

    return () => { disposed = true; cleanup?.(); };
  }, [spec]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#1B1922', overflow: 'hidden' }}
    />
  );
}

function mount(host: HTMLElement, spec: SceneSpec): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 100);

  // ── lights: soft studio key from above-left, ivory fill from below ──
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x2a2431, 0.85));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xd8cfe8, 0.35);
  fill.position.set(4, -2, 5);
  scene.add(fill);

  // ── shared materials ──
  const ivoryMat = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.96, metalness: 0 });
  const rodMat = new THREE.MeshStandardMaterial({ color: ROD, roughness: 0.9, metalness: 0, emissive: ROD, emissiveIntensity: 0.1 });
  const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.8, metalness: 0, emissive: CINNABAR, emissiveIntensity: 0 });
  const disposables: { dispose(): void }[] = [ivoryMat, rodMat, inkMat];

  const panels = new Map<string, PanelRT>();
  const groups = new Map<string, { obj: THREE.Group; swing: number; period: number }>();
  for (const g of spec.groups ?? []) {
    const obj = new THREE.Group();
    obj.position.copy(v3(g.center));
    scene.add(obj);
    groups.set(g.id, { obj, swing: THREE.MathUtils.degToRad(g.swing) / 2, period: g.period });
  }
  const parentFor = (groupId?: string) => (groupId && groups.get(groupId)?.obj) || scene;
  const toLocal = (world: THREE.Vector3, groupId?: string) => {
    const g = groupId && groups.get(groupId);
    return g ? world.clone().sub(g.obj.position) : world.clone();
  };

  const bounds = new THREE.Box3();

  // ── panels ──
  for (const p of spec.panels) {
    const kind = p.kind ?? 'plaque';
    const w = p.w ?? 1.4, h = p.h ?? 0.8, d = p.d ?? (kind === 'tag' ? 0.03 : 0.06);
    const world = v3(p.pos);
    const parent = parentFor(p.group);
    const local = toLocal(world, p.group);
    const rt: PanelRT = { spec: p, obj: new THREE.Group(), base: local, world, glow: [], needleRest: 0, phase: Math.random() * Math.PI * 2, radius: Math.max(w, h) / 2, critical: false };
    rt.obj.position.copy(local);
    if (p.rotZ) rt.obj.rotation.z = p.rotZ;
    parent.add(rt.obj);

    if (kind === 'case') {
      const caseMat = new THREE.MeshPhysicalMaterial({ color: IVORY, transparent: true, opacity: 0.13, roughness: 0.55, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), caseMat);
      box.renderOrder = 5;
      box.layers.set(NO_DEPTH_LAYER);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: IVORY, transparent: true, opacity: 0.45 }));
      rt.obj.add(box, edges);
      disposables.push(caseMat, box.geometry, edges.geometry, edges.material as THREE.Material);
      if (p.label) addTag(rt, p.label, w * 0.42, 0.24, 0, h / 2 + 0.17, 0);
      if (p.sub) addTag(rt, p.sub, w * 0.5, 0.2, 0, -h / 2 - 0.15, 0);
      bounds.expandByPoint(world.clone().add(new THREE.Vector3(w / 2, h / 2 + 0.3, d / 2)));
      bounds.expandByPoint(world.clone().sub(new THREE.Vector3(w / 2, h / 2 + 0.3, d / 2)));
    } else if (kind === 'glass') {
      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0b12, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.78, depthWrite: false });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
      box.renderOrder = 6;
      box.layers.set(NO_DEPTH_LAYER);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: IVORY, transparent: true, opacity: 0.7 }));
      const grid = new THREE.GridHelper(Math.min(w, d) * 0.9, 6, IVORY, IVORY);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.22;
      grid.position.y = -h / 2 + 0.02;
      rt.obj.add(box, edges, grid);
      disposables.push(glassMat, box.geometry, edges.geometry, edges.material as THREE.Material, grid.geometry, grid.material as THREE.Material);
      if (p.skeleton) {
        const sk = buildSkeleton(h * 0.8);
        sk.position.y = 0.02;
        rt.obj.add(sk);
        rt.skeleton = sk;
        disposables.push(sk.geometry, sk.material as THREE.Material);
      }
      if (p.label) addTag(rt, p.label, w * 0.75, 0.24, 0, h / 2 + 0.17, 0);
      bounds.expandByPoint(world.clone().add(new THREE.Vector3(w / 2, h / 2 + 0.3, d / 2)));
      bounds.expandByPoint(world.clone().sub(new THREE.Vector3(w / 2, h / 2, d / 2)));
    } else if (kind === 'disc' || kind === 'dial') {
      const r = w / 2;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, 64), ivoryMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true; body.receiveShadow = true;
      const tex = makeFaceTexture({ w, h: w, kind, label: p.label, glyph: p.glyph, dial: p.dial });
      const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, emissive: WARM_WHITE, emissiveIntensity: 0 });
      if (kind === 'disc') {
        const mask = makeInkMask(tex);
        faceMat.emissiveMap = mask;
        rt.face = faceMat;
        disposables.push(mask);
      }
      const face = new THREE.Mesh(new THREE.CircleGeometry(r, 64), faceMat);
      face.position.z = d / 2 + 0.002;
      rt.obj.add(body, face);
      disposables.push(body.geometry, tex, faceMat, face.geometry);
      if (kind === 'disc' && p.glyph) {
        // glyph-only face: the texture already drew label+glyph; nothing more
      }
      if (kind === 'dial' && p.dial) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.022, 10, 96), inkMat.clone());
        rim.position.z = d / 2 + 0.01;
        const needleMat = inkMat.clone();
        const needleGeo = new THREE.BoxGeometry(0.022, r * 0.74, 0.02);
        needleGeo.translate(0, r * 0.3, 0);
        const needle = new THREE.Mesh(needleGeo, needleMat);
        needle.position.z = d / 2 + 0.03;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), needleMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.z = d / 2 + 0.035;
        rt.obj.add(rim, needle, hub);
        rt.needle = needle;
        const { min, max, rest } = p.dial;
        rt.needleRest = Math.PI * 1.25 - ((rest - min) / (max - min)) * Math.PI * 1.5 - Math.PI / 2;
        needle.rotation.z = rt.needleRest;
        rt.glow.push(rim.material as THREE.MeshStandardMaterial, needleMat);
        disposables.push(rim.geometry, rim.material as THREE.Material, needleGeo, needleMat, hub.geometry);
      }
      bounds.expandByPoint(world.clone().add(new THREE.Vector3(r, r, d)));
      bounds.expandByPoint(world.clone().sub(new THREE.Vector3(r, r, d)));
    } else {
      // plaque / tag / diamond / tile
      const tex = makeFaceTexture({
        w, h, kind, label: p.label, sub: p.sub, glyph: p.glyph, ghost: p.ghost,
        textRot: kind === 'diamond' ? -Math.PI / 4 : 0,
      });
      const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, emissive: p.glowNearPulse ? CINNABAR : WARM_WHITE, emissiveIntensity: 0, transparent: !!p.ghost, alphaTest: p.ghost ? 0.05 : 0 });
      if (!p.ghost) {
        const mask = makeInkMask(tex);
        faceMat.emissiveMap = mask;
        rt.face = faceMat;
        disposables.push(mask);
      }
      const mats: THREE.Material[] = p.ghost
        ? [faceMat, faceMat, faceMat, faceMat, faceMat, faceMat]
        : [ivoryMat, ivoryMat, ivoryMat, ivoryMat, faceMat, ivoryMat];
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      if (!p.ghost) { box.castShadow = true; box.receiveShadow = true; }
      if (kind === 'diamond') rt.obj.rotation.z = Math.PI / 4;
      rt.obj.add(box);
      disposables.push(tex, faceMat, box.geometry);
      if (p.glowNearPulse || p.heartbeat || kind === 'tile') rt.glow.push(faceMat);
      const ext = kind === 'diamond' ? Math.SQRT1_2 * w : 0;
      bounds.expandByPoint(world.clone().add(new THREE.Vector3(ext || w / 2, ext || h / 2, d / 2)));
      bounds.expandByPoint(world.clone().sub(new THREE.Vector3(ext || w / 2, ext || h / 2, d / 2)));
    }
    panels.set(p.id, rt);
  }

  function addTag(rt: PanelRT, text: string, w: number, h: number, x: number, y: number, z: number) {
    const tex = makeFaceTexture({ w, h, kind: 'tag', label: text });
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), [ivoryMat, ivoryMat, ivoryMat, ivoryMat, mat, ivoryMat]);
    m.position.set(x, y, z + 0.02);
    m.castShadow = true;
    rt.obj.add(m);
    disposables.push(tex, mat, m.geometry);
  }

  const resolve = (ref: string | Vec3): THREE.Vector3 => {
    if (typeof ref === 'string') {
      const p = panels.get(ref);
      if (!p) throw new Error(`ExplodedDiagram: unknown panel "${ref}"`);
      return p.world.clone();
    }
    return v3(ref);
  };
  /** Move a panel-centre endpoint out to the panel's edge (in the panel plane) along the rod direction. */
  const clipToPanel = (ref: string | Vec3, from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 => {
    if (typeof ref !== 'string') return from.clone();
    const p = panels.get(ref)!;
    const kind = p.spec.kind ?? 'plaque';
    const w = p.spec.w ?? 1.4;
    const h = (kind === 'disc' || kind === 'dial') ? w : (p.spec.h ?? 0.8);
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 1e-6) return from.clone();
    dir.divideScalar(len);
    const planar = Math.hypot(dir.x, dir.y);
    let t: number;
    if (planar < 1e-4) {
      t = (p.spec.d ?? 0.06) / 2;
    } else if (kind === 'disc' || kind === 'dial') {
      t = (w / 2) / planar;
    } else if (kind === 'diamond') {
      // rotated square: |x| + |y| <= w/√2
      t = (w * Math.SQRT1_2) / (Math.abs(dir.x) + Math.abs(dir.y));
    } else {
      t = Math.min(
        Math.abs(dir.x) > 1e-6 ? (w / 2) / Math.abs(dir.x) : Infinity,
        Math.abs(dir.y) > 1e-6 ? (h / 2) / Math.abs(dir.y) : Infinity,
      );
    }
    t = Math.min(t, len * 0.45);
    return from.clone().add(dir.multiplyScalar(t));
  };
  const endpoints = (fromRef: string | Vec3, toRef: string | Vec3) => {
    const a0 = resolve(fromRef), b0 = resolve(toRef);
    return { a: clipToPanel(fromRef, a0, b0), b: clipToPanel(toRef, b0, a0) };
  };

  // ── rods ──
  const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 10);
  disposables.push(rodGeo);
  const tickRuns: { a: THREE.Vector3; dir: THREE.Vector3; len: number; q: THREE.Quaternion; count: number }[] = [];
  for (const r of spec.rods) {
    const { a, b } = endpoints(r.from, r.to);
    if (!r.group) {
      const len = a.distanceTo(b);
      if (len > 0.35) {
        const dir = b.clone().sub(a).normalize();
        tickRuns.push({ a, dir, len, q: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir), count: Math.max(1, Math.round(len / 0.7)) });
      }
    }
    const len = a.distanceTo(b);
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.scale.set(1, len, 1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    rod.position.copy(toLocal(mid, r.group));
    rod.quaternion.setFromUnitVectors(Y_AXIS, b.clone().sub(a).normalize());
    rod.castShadow = true;
    parentFor(r.group).add(rod);
  }

  // ── secondary tick particles: slow ivory telegraph marks sliding along every rod ──
  const tickTotal = tickRuns.reduce((n, r) => n + r.count, 0);
  const tickMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.11, 0.018), new THREE.MeshBasicMaterial({ color: IVORY, transparent: true, opacity: 0.55, toneMapped: false }), Math.max(1, tickTotal));
  tickMesh.count = tickTotal;
  tickMesh.frustumCulled = false;
  tickMesh.layers.set(NO_DEPTH_LAYER);
  if (tickTotal) scene.add(tickMesh);
  disposables.push(tickMesh.geometry, tickMesh.material as THREE.Material);
  const tickMat4 = new THREE.Matrix4();
  const tickPos = new THREE.Vector3();
  const tickScale = new THREE.Vector3(1, 1, 1);
  const TICK_SPEED = 0.32;
  const updateTicks = (t: number) => {
    let i = 0;
    for (const run of tickRuns) {
      for (let k = 0; k < run.count; k++) {
        const along = (((k / run.count) * run.len + t * TICK_SPEED) % run.len + run.len) % run.len;
        tickPos.copy(run.a).addScaledVector(run.dir, along);
        tickMat4.compose(tickPos, run.q, tickScale);
        tickMesh.setMatrixAt(i++, tickMat4);
      }
    }
    tickMesh.instanceMatrix.needsUpdate = true;
  };

  // ── ribbon + threshold plane ──
  if (spec.ribbon) {
    const pts = spec.ribbon.points.map(v3);
    const { mesh } = buildRibbon(pts, spec.ribbon.width, new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.95, side: THREE.DoubleSide }));
    scene.add(mesh);
    disposables.push(mesh.geometry, mesh.material as THREE.Material);
    pts.forEach(p => bounds.expandByPoint(p));
    const pl = spec.ribbon.plane;
    const planeMat = new THREE.MeshPhysicalMaterial({ color: IVORY, transparent: true, opacity: 0.2, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(pl.x1 - pl.x0, pl.depth), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((pl.x0 + pl.x1) / 2, pl.y, 0);
    plane.renderOrder = 4;
    const dashed = new THREE.LineSegments(new THREE.EdgesGeometry(plane.geometry), new THREE.LineDashedMaterial({ color: IVORY, dashSize: 0.09, gapSize: 0.06 }));
    dashed.computeLineDistances();
    plane.add(dashed);
    scene.add(plane);
    disposables.push(planeMat, plane.geometry, dashed.geometry, dashed.material as THREE.Material);
    bounds.expandByPoint(new THREE.Vector3(pl.x1, pl.y + 0.2, pl.depth / 2));
  }

  // ── pulse pool ──
  const glowTex = makeGlowTexture();
  disposables.push(glowTex);
  const pulses: PulseRT[] = [];
  const maxParallel = Math.max(1, ...spec.pulse.stages.map(s => s.segs.length));
  for (let i = 0; i < maxParallel; i++) {
    const group = new THREE.Group();
    const streakMat = new THREE.MeshBasicMaterial({ color: CINNABAR_HOT, transparent: true, opacity: 0.85, toneMapped: false });
    const streak = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.3, 4, 10), streakMat);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff1e6, toneMapped: false, transparent: true, opacity: 1 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), coreMat);
    const spriteMat = new THREE.SpriteMaterial({ map: glowTex, color: CINNABAR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.setScalar(0.9);
    const light = new THREE.PointLight(CINNABAR, 9, 7, 2);
    sprite.layers.set(NO_DEPTH_LAYER);
    group.add(streak, core, sprite, light);
    group.visible = false;
    scene.add(group);
    pulses.push({ group, streak, core, sprite, light, streakMat, coreMat, spriteMat, pos: new THREE.Vector3(), active: false });
    disposables.push(streak.geometry, streakMat, core.geometry, coreMat, spriteMat);
  }

  const segToLine = (s: PathSeg): Polyline => {
    if (s.points) {
      const refs = s.points;
      const pts = refs.map(resolve);
      if (pts.length >= 2) {
        pts[0] = clipToPanel(refs[0], pts[0], pts[1]);
        const n = pts.length - 1;
        pts[n] = clipToPanel(refs[n], pts[n], pts[n - 1]);
      }
      return polylineOf(pts);
    }
    const { a, b } = endpoints(s.from!, s.to!);
    return polylineOf([a, b]);
  };
  for (const st of spec.pulse.stages) {
    for (const seg of st.segs) {
      for (const ref of seg.points ?? [seg.from, seg.to]) {
        if (typeof ref === 'string') { const pr = panels.get(ref); if (pr) pr.critical = true; }
      }
    }
  }
  const stages: StageRT[] = [];
  let acc = 0;
  for (const st of spec.pulse.stages) {
    stages.push({ start: acc, dur: st.dur, lines: st.segs.map(segToLine), end: st.end });
    acc += st.dur;
  }
  const period = spec.pulse.period;

  // ── camera fit ──
  if (bounds.isEmpty()) bounds.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(6, 3, 1));
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const pad = spec.camera?.pad ?? 1.15;
  const basePitch = THREE.MathUtils.degToRad(spec.camera?.pitch ?? 9);
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (16 / 9));
  const dist = Math.max((size.x * pad) / (2 * Math.tan(hfov / 2)), (size.y * pad * 1.25) / (2 * Math.tan(vfov / 2))) + size.z * 0.6;
  key.position.copy(center).add(new THREE.Vector3(-size.x * 0.45 - 2, size.y * 0.8 + 4, size.z + 5));
  key.target.position.copy(center);
  const sc = key.shadow.camera;
  sc.left = -size.x * 0.75 - 1; sc.right = size.x * 0.75 + 1;
  sc.top = size.y * 0.9 + 1; sc.bottom = -size.y * 0.9 - 1;
  sc.near = 0.5; sc.far = dist * 3 + 20;
  sc.updateProjectionMatrix();

  // ── backdrop: plain dark-plum plane behind the assembly so the pulse can cast its light wash ──
  const backW = Math.max(size.x, (size.y * 16) / 9) * 4.2;
  const backZ = bounds.min.z - 2.4;
  const backMat = new THREE.MeshStandardMaterial({ color: 0x1a1723, roughness: 1, metalness: 0 });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(backW, (backW * 9) / 16), backMat);
  backdrop.position.set(center.x, center.y, backZ);
  backdrop.receiveShadow = false;
  scene.add(backdrop);
  disposables.push(backMat, backdrop.geometry);

  // ── post: subtle depth of field whose focus follows the pulse ──
  camera.layers.enable(NO_DEPTH_LAYER);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new DiagramBokehPass(scene, camera, { focus: dist, aperture: 0.00011, maxblur: 0.0065 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  let focusDist = dist;
  let lastT = 0;
  const focusTarget = new THREE.Vector3();

  // pointer parallax: the assembly turns a little toward the cursor, eases back when it leaves
  const MAX_YAW = THREE.MathUtils.degToRad(7);
  const MAX_PITCH = THREE.MathUtils.degToRad(4);
  let targetYaw = 0, targetPitch = 0, yaw = 0, pitchOff = 0;
  const onPointerMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    targetYaw = THREE.MathUtils.clamp(nx, -1, 1) * MAX_YAW;
    targetPitch = -THREE.MathUtils.clamp(ny, -1, 1) * MAX_PITCH;
  };
  const onPointerLeave = () => { targetYaw = 0; targetPitch = 0; };
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerleave', onPointerLeave);

  const tmpPos = new THREE.Vector3(), tmpTan = new THREE.Vector3();
  const heartbeat = (phase: number) => {
    if (phase < 0.16) return smooth(phase / 0.16);
    return smooth(1 - (phase - 0.16) / 0.42);
  };

  function update(t: number) {
    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    const k = Math.min(1, dt * 4.5);
    yaw += (targetYaw - yaw) * k;
    pitchOff += (targetPitch - pitchOff) * k;
    const pitch = basePitch + pitchOff;
    camera.position.set(
      center.x + dist * Math.cos(pitch) * Math.sin(yaw),
      center.y + dist * Math.sin(pitch),
      center.z + dist * Math.cos(pitch) * Math.cos(yaw),
    );
    camera.lookAt(center);

    const phase = (t % period) / period;
    const hb = heartbeat(phase);
    updateTicks(t);

    for (const [, g] of groups) g.obj.rotation.y = g.swing * Math.sin((t / g.period) * Math.PI * 2);

    // pulses
    const tp = t % period;
    let activeCount = 0;
    for (const p of pulses) { p.active = false; p.group.visible = false; }
    for (const st of stages) {
      if (tp < st.start || tp >= st.start + st.dur) continue;
      const f = (tp - st.start) / st.dur;
      const ease = smooth(f);
      st.lines.forEach((line, i) => {
        const p = pulses[i];
        if (!p) return;
        samplePolyline(line, ease, tmpPos, tmpTan);
        p.group.position.copy(tmpPos);
        p.pos.copy(tmpPos);
        p.streak.quaternion.setFromUnitVectors(Y_AXIS, tmpTan);
        // trailing streak sits slightly behind the core
        p.streak.position.copy(tmpTan).multiplyScalar(-0.14);
        p.streak.scale.set(1, 1, 1);
        p.sprite.scale.set(0.9, 0.9, 1);
        let alpha = 1;
        let glow = 1;
        if (f < 0.1) alpha = smooth(f / 0.1);
        const tail = st.end === 'spread' ? 0.38 : st.end === 'flash' ? 0.3 : 0.14;
        if (f > 1 - tail) {
          const k = (f - (1 - tail)) / tail;
          if (st.end === 'spread') {
            p.streak.scale.set(1, 1 + k * 7, 0.6);
            p.streak.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3(1, 0, 0));
            p.streak.position.set(0.55 * k, 0, 0);
            p.sprite.scale.set(0.9 + k * 2.2, 0.9 - k * 0.5, 1);
            alpha = 1 - smooth(k);
          } else if (st.end === 'flash') {
            glow = 1 + k * 1.6;
            p.sprite.scale.setScalar(0.9 + k * 0.9);
            alpha = 1 - smooth(Math.max(0, (k - 0.6) / 0.4));
          } else {
            alpha = 1 - smooth(k);
          }
        }
        // dim the wash while the pulse is inside a plaque so its label stays legible
        let inside = 0;
        for (const [, pr] of panels) inside = Math.max(inside, 1 - pr.world.distanceTo(tmpPos) / (pr.radius + 0.15));
        const dim = 1 - 0.75 * smooth(inside);
        p.streakMat.opacity = 0.85 * alpha;
        p.coreMat.opacity = alpha;
        p.spriteMat.opacity = 0.9 * alpha * (0.6 + 0.4 * dim);
        p.light.intensity = 9 * alpha * glow * dim;
        p.group.visible = true;
        p.active = true;
        activeCount++;
      });
    }

    // panels
    for (const [, rt] of panels) {
      const s = rt.spec;
      if (s.jitter) {
        rt.obj.position.set(
          rt.base.x + Math.sin(t * 61 + rt.phase) * 0.012,
          rt.base.y + Math.sin(t * 73 + rt.phase * 2) * 0.01,
          rt.base.z + Math.sin(t * 53 + rt.phase * 3) * 0.008,
        );
        rt.obj.rotation.z = (s.rotZ ?? 0) + Math.sin(t * 67 + rt.phase) * 0.006;
      }
      if (rt.needle) {
        const tremble = Math.sin(t * 9.1 + rt.phase) * 0.02 + Math.sin(t * 2.3 + rt.phase) * 0.03;
        const kick = s.heartbeat ? -hb * 0.16 : 0;
        rt.needle.rotation.z = rt.needleRest + tremble + kick;
      }
      if (rt.skeleton) rt.skeleton.rotation.y = (t / LOOP) * Math.PI * 2;

      // power-on flicker: ink on critical-path panels energises warm white as the pulse passes
      if (rt.face && rt.critical && !s.glowNearPulse) {
        let prox = 0;
        if (activeCount) for (const p of pulses) if (p.active) prox = Math.max(prox, 1 - rt.world.distanceTo(p.pos) / (rt.radius + 0.5));
        const flicker = 0.8 + 0.2 * Math.sin(t * 83 + rt.phase) * Math.sin(t * 47 + rt.phase * 2);
        rt.face.emissiveIntensity = smooth(prox) * 0.42 * flicker;
      }

      if (s.heartbeat) {
        for (const m of rt.glow) m.emissiveIntensity = hb * 1.4;
      } else if (s.glowNearPulse) {
        let best = 0;
        if (activeCount) for (const p of pulses) if (p.active) best = Math.max(best, 1 - rt.world.distanceTo(p.pos) / 0.7);
        for (const m of rt.glow) m.emissiveIntensity = smooth(best) * 1.1;
      } else if ((s.kind ?? 'plaque') === 'tile' && typeof s.seq === 'number') {
        const n = spec.panels.filter(q => q.kind === 'tile').length || 1;
        const tpd = spec.tileSeq?.period ?? 2.4;
        const ph = ((t / tpd) % 1) * n;
        let dd = Math.abs(ph - s.seq); dd = Math.min(dd, n - dd);
        for (const m of rt.glow) m.emissiveIntensity = Math.max(0, 1 - dd / 0.9) * 0.9;
      }
    }

    // rack focus toward the heartbeat, easing back to the assembly centre between beats
    if (activeCount) {
      focusTarget.set(0, 0, 0);
      for (const p of pulses) if (p.active) focusTarget.add(p.pos);
      focusTarget.divideScalar(activeCount);
    } else focusTarget.copy(center);
    const want = camera.position.distanceTo(focusTarget);
    focusDist += (want - focusDist) * Math.min(1, dt * 5);
    (bokeh.uniforms as { focus: { value: number } }).focus.value = focusDist;
  }

  // ── sizing, visibility, loop ──
  const resize = () => {
    const w = host.clientWidth || 640;
    const h = host.clientHeight || Math.round((w * 9) / 16);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let running = false;
  let raf = 0;
  let elapsed = 0;
  let last = 0;
  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;
    update(elapsed);
    composer.render();
    raf = requestAnimationFrame(frame);
  };
  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else cancelAnimationFrame(raf);
  };

  // first frame so the plate is never blank
  update(0.9);
  composer.render();

  const io = new IntersectionObserver(entries => {
    const vis = entries.some(e => e.isIntersecting);
    if (reduced) { if (vis) { update(0.9); composer.render(); } return; }
    setRunning(vis);
  }, { rootMargin: '120px' });
  io.observe(host);

  return () => {
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    for (const d of disposables) d.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
