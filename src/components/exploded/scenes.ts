import type { SceneSpec } from './types';

/**
 * Eight exploded-assembly scenes. Shared language: ivory plaques, black etched
 * labels, thin rods, deep-plum background, a 10-15° breathing camera, and one
 * cinnabar pulse travelling the system's critical path every 2.5 s.
 */

// 1 ── ROS 2 video streaming node: pulse = pipeline → network ("H.265 stream")
const ros2Video: SceneSpec = {
  panels: [
    { id: 'cam',  label: 'Camera Hardware', glyph: 'lens',      pos: [-4.6, 0.25, -0.7], w: 1.5, h: 0.9 },
    { id: 'pipe', label: 'GStreamer Pipeline', sub: 'capture → x265enc → mux/payload', pos: [-1.7, 0, 0.3], w: 2.5, h: 1.0 },
    { id: 'case', kind: 'case', label: 'ROS 2 Node', sub: 'services  ·  topics', pos: [-1.7, 0.02, 0.3], w: 3.1, h: 1.75, d: 1.0 },
    { id: 'net',  label: 'Network', sub: 'SRT   ·   RTP', glyph: 'channels', pos: [1.6, 0.1, 0.3], w: 1.8, h: 1.0 },
    { id: 'gs',   label: 'Ground Station', sub: 'receiver', glyph: 'antenna', pos: [4.6, 0.35, -0.7], w: 1.7, h: 1.0 },
    { id: 'tagH265', kind: 'tag', label: 'H.265 stream', pos: [0.05, 0.45, 0.34], w: 1.2, h: 0.26, glowNearPulse: true },
  ],
  rods: [
    { from: 'cam', to: 'pipe' },
    { from: 'pipe', to: 'net' },
    { from: 'net', to: 'gs' },
  ],
  pulse: { period: 2.5, stages: [{ segs: [{ from: 'pipe', to: 'net' }], dur: 0.85 }] },
};

// 2 ── Adaptive resilience: pulse runs the whole ring, quickening on the closing rod
const resilience: SceneSpec = {
  panels: [
    { id: 'mon',  label: 'Network Monitor', glyph: 'signal', pos: [0, 2.2, 0.3], w: 1.9, h: 0.8 },
    { id: 'loss', label: 'Loss Event Detected', glyph: 'bang', pos: [3.0, 0.95, -0.2], w: 2.0, h: 0.8 },
    { id: 'ifr',  label: 'I-Frame Request', pos: [3.7, -0.6, 0.55], w: 1.5, h: 0.55, rotZ: -0.1 },
    { id: 'bo',   label: 'Backoff Timer', glyph: 'ticks', pos: [2.45, -1.7, -0.45], w: 1.6, h: 0.55, rotZ: -0.05 },
    { id: 'br',   label: 'Bitrate Controller', glyph: 'step', pos: [0.7, -2.45, 0.55], w: 1.75, h: 0.55 },
    { id: 'enc',  label: 'Encoder', pos: [-1.9, -1.75, 0], w: 1.5, h: 0.85 },
  ],
  rods: [
    { from: 'mon', to: 'loss' },
    { from: 'loss', to: 'ifr' }, { from: 'loss', to: 'bo' }, { from: 'loss', to: 'br' },
    { from: 'ifr', to: 'enc' }, { from: 'bo', to: 'enc' }, { from: 'br', to: 'enc' },
    { from: 'enc', to: [-3.2, 0.35, -0.4] }, { from: [-3.2, 0.35, -0.4], to: 'mon' },
  ],
  pulse: {
    period: 2.5,
    stages: [
      { segs: [{ from: 'mon', to: 'loss' }], dur: 0.55 },
      { segs: [{ from: 'loss', to: 'ifr' }, { from: 'loss', to: 'bo' }, { from: 'loss', to: 'br' }], dur: 0.45 },
      { segs: [{ from: 'ifr', to: 'enc' }, { from: 'bo', to: 'enc' }, { from: 'br', to: 'enc' }], dur: 0.55 },
      { segs: [{ points: ['enc', [-3.2, 0.35, -0.4], 'mon'] }], dur: 0.6, end: 'flash' },
    ],
  },
  camera: { pitch: 14 },
};

// 3 ── GPS RTCM refactor: congested BEFORE cluster jitters; pulse only on the queue hand-off
const rtcm: SceneSpec = {
  panels: [
    { id: 'hBefore', kind: 'tag', label: 'BEFORE', pos: [-2.7, 1.45, 0], w: 1.2, h: 0.3 },
    { id: 'poll',  label: 'Busy-Wait Poll', pos: [-3.95, 0, 0.02], w: 1.18, h: 0.8, jitter: true },
    { id: 'parse0', label: 'Parse RTCM', pos: [-2.7, 0, -0.02], w: 1.18, h: 0.8, jitter: true },
    { id: 'other0', label: 'Other Work', pos: [-1.45, 0, 0.03], w: 1.18, h: 0.8, jitter: true },

    { id: 'hAfter', kind: 'tag', label: 'AFTER', pos: [2.95, 1.75, 0], w: 1.1, h: 0.3 },
    { id: 'hIo',   kind: 'tag', label: 'I/O thread', pos: [1.55, 1.27, 0], w: 1.1, h: 0.24 },
    { id: 'read',  label: 'Blocking Read', pos: [1.55, 0.75, 0], w: 1.25, h: 0.7 },
    { id: 'parse1', label: 'Parse RTCM', pos: [2.95, 0.75, 0], w: 1.25, h: 0.7 },
    { id: 'push',  label: 'Push to Queue', pos: [4.35, 0.75, 0], w: 1.25, h: 0.7 },
    { id: 'hMain', kind: 'tag', label: 'main thread', pos: [1.55, -0.25, 0], w: 1.2, h: 0.24 },
    { id: 'pop',   label: 'Pop from Queue', pos: [4.35, -0.75, 0], w: 1.25, h: 0.7 },
    { id: 'other1', label: 'Other Work', pos: [2.95, -0.75, 0], w: 1.25, h: 0.7 },
    { id: 'tagQ',  kind: 'tag', label: 'thread-safe queue', pos: [5.12, 0, 0.3], w: 1.35, h: 0.24, rotZ: -Math.PI / 2, glowNearPulse: true },
  ],
  rods: [
    { from: 'poll', to: 'parse0' }, { from: 'parse0', to: 'other0' },
    { from: [0, -1.6, 0], to: [0, 2.0, 0] },
    { from: 'read', to: 'parse1' }, { from: 'parse1', to: 'push' },
    { from: 'push', to: 'pop' },
    { from: 'pop', to: 'other1' },
  ],
  pulse: { period: 2.5, stages: [{ segs: [{ from: 'push', to: 'pop' }], dur: 0.75 }] },
};

// 4 ── SRT telemetry: three engraved dials; only Packet Loss glows on the heartbeat
const telemetry: SceneSpec = {
  panels: [
    { id: 'rtt',  kind: 'dial', label: 'RTT', dial: { min: 0, max: 500, rest: 140, unit: 'ms' }, pos: [-2.7, 0, 0.1], w: 1.95, d: 0.08 },
    { id: 'bw',   kind: 'dial', label: 'Bandwidth', dial: { min: 0, max: 50, rest: 32, unit: 'Mbps' }, pos: [0, 0.05, 0.45], w: 2.05, d: 0.08 },
    { id: 'loss', kind: 'dial', label: 'Packet Loss', dial: { min: 0, max: 20, rest: 3.5, unit: '%' }, pos: [2.7, 0, 0.1], w: 1.95, d: 0.08, heartbeat: true },
    { id: 'tr1', kind: 'tag', label: '', glyph: 'trace', pos: [-2.7, -1.4, 0.1], w: 1.5, h: 0.34 },
    { id: 'tr2', kind: 'tag', label: '', glyph: 'trace', pos: [0, -1.45, 0.45], w: 1.55, h: 0.34 },
    { id: 'tr3', kind: 'tag', label: '', glyph: 'trace', pos: [2.7, -1.4, 0.1], w: 1.5, h: 0.34 },
  ],
  rods: [{ from: 'rtt', to: 'bw' }, { from: 'bw', to: 'loss' }],
  pulse: { period: 2.5, stages: [] },
  camera: { pad: 1.3 },
};

// 5 ── Dual output: pulse is born at the fork and runs down both arms at once
const dualOutput: SceneSpec = {
  panels: [
    { id: 'c1', label: 'Camera 1', glyph: 'lens', pos: [-4.6, 1.2, 0], w: 1.15, h: 0.62 },
    { id: 'c2', label: 'Camera 2', glyph: 'lens', pos: [-4.6, 0, 0], w: 1.15, h: 0.62 },
    { id: 'c3', label: 'Camera 3', glyph: 'lens', pos: [-4.6, -1.2, 0], w: 1.15, h: 0.62 },
    { id: 'cN', kind: 'tag', label: '…', ghost: true, pos: [-4.6, -2.1, 0], w: 1.15, h: 0.5 },
    { id: 'cap', label: 'Capture & Encode', sub: 'one pass per camera', pos: [-2.1, 0, 0], w: 2.0, h: 1.0 },
    { id: 'op',  label: 'Operator Stream', sub: 'low latency', pos: [1.5, 1.45, 0], w: 1.75, h: 0.8 },
    { id: 'lens', kind: 'disc', label: '', glyph: 'crosshair', pos: [3.7, 1.7, 0], w: 0.8, d: 0.06 },
    { id: 'mos', label: 'Mosaic Compositor', sub: 'N feeds → grid', pos: [1.5, -1.45, -0.2], w: 1.85, h: 0.8 },
    { id: 'tagRtc', kind: 'tag', label: 'WebRTC', pos: [2.85, -1.95, -0.1], w: 0.9, h: 0.24 },
    { id: 't0', kind: 'tile', label: 'CAM 1', pos: [3.65, -1.15, -0.2], w: 0.56, h: 0.42, seq: 0 },
    { id: 't1', kind: 'tile', label: 'CAM 2', pos: [4.27, -1.15, -0.2], w: 0.56, h: 0.42, seq: 1 },
    { id: 't2', kind: 'tile', label: 'CAM 3', pos: [3.65, -1.63, -0.2], w: 0.56, h: 0.42, seq: 2 },
    { id: 't3', kind: 'tile', label: 'CAM 4', pos: [4.27, -1.63, -0.2], w: 0.56, h: 0.42, seq: 3 },
  ],
  rods: [
    { from: 'c1', to: 'cap' }, { from: 'c2', to: 'cap' }, { from: 'c3', to: 'cap' },
    { from: 'cap', to: [-0.55, 0, 0] },
    { from: [-0.55, 0, 0], to: 'op' }, { from: 'op', to: 'lens' },
    { from: [-0.55, 0, 0], to: 'mos' }, { from: 'mos', to: [3.96, -1.39, -0.2] },
  ],
  pulse: {
    period: 2.5,
    stages: [{ segs: [{ from: [-0.55, 0, 0], to: [0.45, 0.7, 0] }, { from: [-0.55, 0, 0], to: [0.45, -0.7, -0.1] }], dur: 0.8 }],
  },
  tileSeq: { period: 2.6 },
};

// 6 ── Phoenix current control: pulse climbs the current ribbon and is clamped flat at the limit plane
const phoenix: SceneSpec = {
  panels: [
    { id: 'posM', label: 'Position', pos: [-3.6, -0.7, -0.3], w: 1.2, h: 0.55, group: 'modes' },
    { id: 'velM', label: 'Velocity', pos: [-1.8, -0.7, -0.3], w: 1.2, h: 0.55, group: 'modes' },
    { id: 'curM', label: 'Current', sub: 'torque ∝ I', pos: [-2.7, 0.85, 0.35], w: 1.4, h: 0.72, group: 'modes' },
    { id: 'tagLimit', kind: 'tag', label: 'current limit', pos: [3.7, 1.22, 0], w: 1.3, h: 0.26 },
    { id: 'tagTime', kind: 'tag', label: 'time →', pos: [2.8, -1.9, 0], w: 0.9, h: 0.24 },
    { id: 'tagI', kind: 'tag', label: 'current (A)', pos: [0.15, 0.1, 0], w: 1.1, h: 0.24, rotZ: Math.PI / 2 },
  ],
  rods: [
    { from: 'posM', to: 'velM', group: 'modes' }, { from: 'velM', to: 'curM', group: 'modes' }, { from: 'curM', to: 'posM', group: 'modes' },
    { from: [0.5, -1.6, 0], to: [0.5, 1.3, 0] },
    { from: [0.5, -1.6, 0], to: [4.9, -1.6, 0] },
  ],
  groups: [{ id: 'modes', center: [-2.7, 0, 0], swing: 56, period: 7.5 }],
  ribbon: {
    points: [[0.7, -1.4, 0], [1.4, -1.25, 0], [2.1, -0.2, 0], [2.7, 0.5, 0], [3.2, 0.62, 0], [4.7, 0.62, 0]],
    width: 0.4,
    plane: { x0: 2.5, x1: 4.9, y: 0.85, depth: 0.85 },
  },
  pulse: {
    period: 2.5,
    stages: [
      { segs: [{ points: [[0.7, -1.4, 0], [1.4, -1.22, 0], [2.1, -0.17, 0], [2.7, 0.53, 0], [3.1, 0.66, 0]] }], dur: 1.0 },
      { segs: [{ from: [3.1, 0.66, 0], to: [4.4, 0.66, 0] }], dur: 0.9, end: 'spread' },
    ],
  },
};

// 7 ── CI pipeline: pulse runs the whole chain and always exits through Merge/Deploy
const ci: SceneSpec = {
  panels: [
    { id: 'push',  label: 'Git Push / PR', pos: [-5.4, -0.95, 0], w: 1.45, h: 0.72 },
    { id: 'trig',  label: 'Actions Trigger', pos: [-3.6, -0.62, -0.25], w: 1.5, h: 0.72 },
    { id: 'build', label: 'Build Docker Image', glyph: 'box', pos: [-1.7, -0.3, 0.1], w: 1.85, h: 0.78 },
    { id: 'test',  label: 'Run Unit Tests', glyph: 'checklist', pos: [0.35, 0.02, -0.2], w: 1.7, h: 0.78 },
    { id: 'lint',  label: 'Lint / Static Analysis', pos: [2.4, 0.34, 0.1], w: 1.8, h: 0.72 },
    { id: 'pass',  kind: 'diamond', label: 'Pass?', pos: [4.35, 0.6, 0], w: 0.95, h: 0.95 },
    { id: 'merge', label: 'Merge / Deploy', pos: [6.0, 1.75, 0.1], w: 1.55, h: 0.72 },
    { id: 'fail',  label: 'Fail · Notify', glyph: 'bell', pos: [6.0, -0.55, -0.2], w: 1.55, h: 0.72 },
  ],
  rods: [
    { from: 'push', to: 'trig' }, { from: 'trig', to: 'build' }, { from: 'build', to: 'test' },
    { from: 'test', to: 'lint' }, { from: 'lint', to: 'pass' },
    { from: 'pass', to: 'merge' }, { from: 'pass', to: 'fail' },
  ],
  pulse: {
    period: 2.5,
    stages: [{ segs: [{ points: ['push', 'trig', 'build', 'test', 'lint', 'pass', 'merge'] }], dur: 2.3 }],
  },
};

// 8 ── PoseSync 3D: pulse marks the hand-off into the async queue; the viewer is a live inverted window
const posesync: SceneSpec = {
  panels: [
    { id: 'in',    label: 'Video Stream', glyph: 'frame', pos: [-5.3, 0, 0], w: 1.45, h: 0.8 },
    { id: 'flask', label: 'Flask Ingest', pos: [-3.5, 0, -0.2], w: 1.4, h: 0.8 },
    { id: 'yolo',  label: 'YOLOv8', glyph: 'bbox', pos: [-1.75, 0.75, 0.1], w: 1.25, h: 0.6 },
    { id: 'mp',    label: 'MediaPipe', glyph: 'skeleton', pos: [-1.75, -0.75, 0.1], w: 1.25, h: 0.6 },
    { id: 'comb',  label: 'Combined Detections', pos: [0.15, 0, -0.1], w: 1.6, h: 0.8 },
    { id: 'queue', label: 'Async Priority Queue', glyph: 'rows', pos: [2.15, 0, 0.1], w: 1.85, h: 0.9 },
    { id: 'db',    label: 'SQLite3 Spatial Store', glyph: 'table', pos: [4.2, 0, -0.2], w: 1.8, h: 0.8 },
    { id: 'viewer', kind: 'glass', label: 'Three.js 3D Viewer', pos: [5.1, 2.0, 0.4], w: 1.9, h: 1.35, d: 0.7, skeleton: true },
  ],
  rods: [
    { from: 'in', to: 'flask' }, { from: 'flask', to: 'yolo' }, { from: 'flask', to: 'mp' },
    { from: 'yolo', to: 'comb' }, { from: 'mp', to: 'comb' },
    { from: 'comb', to: 'queue' }, { from: 'queue', to: 'db' }, { from: 'db', to: 'viewer' },
  ],
  pulse: { period: 2.5, stages: [{ segs: [{ from: 'comb', to: 'queue' }], dur: 0.85 }] },
};

export const SCENES: SceneSpec[] = [ros2Video, resilience, rtcm, telemetry, dualOutput, phoenix, ci, posesync];
