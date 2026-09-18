export type Vec3 = [number, number, number];

export type Glyph =
  | 'lens' | 'antenna' | 'channels' | 'signal' | 'bang' | 'ticks' | 'step'
  | 'box' | 'checklist' | 'bell' | 'frame' | 'bbox' | 'skeleton' | 'rows'
  | 'table' | 'crosshair' | 'trace' | 'node';

export type PanelKind = 'plaque' | 'tag' | 'case' | 'diamond' | 'disc' | 'dial' | 'glass' | 'tile';

export interface DialSpec {
  min: number;
  max: number;
  rest: number;
  unit: string;
}

export interface PanelSpec {
  id: string;
  kind?: PanelKind;
  label?: string;
  sub?: string;
  glyph?: Glyph;
  pos: Vec3;
  w?: number;
  h?: number;
  d?: number;
  /** rotation about the z axis, radians (used for fanned cards) */
  rotZ?: number;
  /** vibrate in place (the "congested" cluster) */
  jitter?: boolean;
  /** member of a rotating group */
  group?: string;
  /** emissive cinnabar when a pulse passes close by */
  glowNearPulse?: boolean;
  /** glows on the global heartbeat even with no pulse path (dials) */
  heartbeat?: boolean;
  /** tile sequence index for the mosaic grid */
  seq?: number;
  dial?: DialSpec;
  /** faint dotted outline instead of a solid plaque */
  ghost?: boolean;
  /** render an inner rotating wireframe figure (glass panels) */
  skeleton?: boolean;
}

export interface RodSpec {
  from: string | Vec3;
  to: string | Vec3;
  group?: string;
}

export interface PathSeg {
  from?: string | Vec3;
  to?: string | Vec3;
  /** explicit polyline; overrides from/to */
  points?: (string | Vec3)[];
}

export interface PulseStage {
  /** segments traversed simultaneously in this stage */
  segs: PathSeg[];
  /** seconds */
  dur: number;
  /** how the pulse leaves at the end of the stage */
  end?: 'fade' | 'spread' | 'flash';
}

export interface GroupSpec {
  id: string;
  center: Vec3;
  /** total swing in degrees (oscillates ±swing/2) */
  swing: number;
  period: number;
}

export interface RibbonSpec {
  points: Vec3[];
  width: number;
  plane: { x0: number; x1: number; y: number; depth: number };
}

export interface SceneSpec {
  panels: PanelSpec[];
  rods: RodSpec[];
  pulse: { period: number; stages: PulseStage[] };
  groups?: GroupSpec[];
  ribbon?: RibbonSpec;
  tileSeq?: { period: number };
  camera?: { pad?: number; pitch?: number };
}
