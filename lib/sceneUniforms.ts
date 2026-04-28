// Scene → uniform mapping. Every visual parameter the particle field cares
// about is declared per-scene as a "target state". The runtime cross-fades
// linearly between adjacent scenes so scroll drives the whole look.
//
// M3: hardcoded test values. M4–M6 refine them alongside the narrative DOM.

import { SCENES, type SceneId } from "./scenes";

export type Vec3 = [number, number, number];

export type Attractor = {
  pos: Vec3;
  strength: number; // 0 = inactive
};

export type Rgb = [number, number, number];

export type SceneUniforms = {
  attractors: Attractor[]; // up to 4 — shader reads a fixed-size array
  noiseScale: number;
  noiseStrength: number;
  drag: number;
  maxSpeed: number;
  oscAmp: number;
  pointSize: number;
  opacity: number;
  // Linear-RGB tuples (0..1). Authored as hex on SCENE_TARGETS and parsed
  // once at module init so the per-frame path never allocates from strings.
  colorA: Rgb;
  colorB: Rgb;
  velocityToColor: number;
  // Rectangular centre clearance — 1 = particles fully cleared inside
  // the central rectangle (DOM copy has a clean stage), 0 = uniform
  // field. The rectangle is defined by (sideInner..sideOuter) × (sideInnerY..sideOuterY).
  sideOnly: number;
  sideInner: number; // |ndcX| below → dim
  sideOuter: number; // |ndcX| above → full brightness
  sideInnerY: number; // |ndcY| below → dim
  sideOuterY: number; // |ndcY| above → full brightness
};

// Authoring shape — hex strings are easier to read in source than raw rgb.
type AuthoredScene = Omit<SceneUniforms, "colorA" | "colorB"> & {
  colorA: string;
  colorB: string;
};

const EMPTY: Attractor = { pos: [0, 0, 0], strength: 0 };

// Ensure exactly 4 attractors (zero-pad).
function pad(list: Attractor[]): Attractor[] {
  const out = list.slice(0, 4);
  while (out.length < 4) out.push(EMPTY);
  return out;
}

// --- per-scene targets ---

// Calm "cosmic dust" baseline — every scene reads as a gentle drifting
// field rather than a clustering bloom. Attractors only act as soft
// off-screen boundary keepers (~3.5 units out, strength <0.1) so particles
// stay roughly distributed without ever concentrating into bright columns.
// Center clearance for DOM copy is handled via the shader `sideOnly` mask
// instead of a physics repeller, which keeps motion uniform.
const AUTHORED: Record<SceneId, AuthoredScene> = {
  // SCENE 0 — cold start. Quiet uniform field at lowest energy, but
  // with enough curl-noise drift to read as "alive" rather than static.
  // Slight rectangular clearance so the loading hand-off doesn't dump
  // dust on top of the figure once it appears.
  cold: {
    attractors: pad([]),
    noiseScale: 0.7,
    noiseStrength: 0.09,
    drag: 0.987,
    maxSpeed: 0.28,
    oscAmp: 0.028,
    pointSize: 4.2,
    opacity: 0.88,
    colorA: "#cdd5e8",
    colorB: "#ffffff",
    velocityToColor: 0.7,
    sideOnly: 0.7,
    sideInner: 0.55,
    sideOuter: 0.85,
    sideInnerY: 0.55,
    sideOuterY: 0.85,
  },

  // SCENE 1 — hero. Aggressive rectangular clearance so the body copy on
  // the left and the dust figure on the right both sit on a clean stage.
  hero: {
    attractors: pad([
      { pos: [-3.4, 0.0, 0], strength: 0.07 },
      { pos: [3.4, 0.0, 0], strength: 0.07 },
    ]),
    noiseScale: 0.75,
    noiseStrength: 0.10,
    drag: 0.986,
    maxSpeed: 0.32,
    oscAmp: 0.032,
    pointSize: 4.3,
    opacity: 0.9,
    colorA: "#cdd5e8",
    colorB: "#ffffff",
    velocityToColor: 0.8,
    sideOnly: 1.0,
    sideInner: 0.7,
    sideOuter: 0.95,
    sideInnerY: 0.55,
    sideOuterY: 0.9,
  },

  // SCENE 2 — ceo letter.  Calm formal welcome from the CEO; particles
  // settle into a slow drift with wide centre clearance so the letter
  // copy sits on a quiet backdrop.  Tonally between cold and hero —
  // cooler palette, lower energy than hero proper.
  ceo: {
    attractors: pad([
      { pos: [-3.5, 0.0, 0], strength: 0.06 },
      { pos: [3.5, 0.0, 0], strength: 0.06 },
    ]),
    noiseScale: 0.72,
    noiseStrength: 0.09,
    drag: 0.988,
    maxSpeed: 0.28,
    oscAmp: 0.03,
    pointSize: 4.2,
    opacity: 0.88,
    colorA: "#cdd5e8",
    colorB: "#f0f3ff",
    velocityToColor: 0.7,
    sideOnly: 1.0,
    sideInner: 0.7,
    sideOuter: 0.95,
    sideInnerY: 0.55,
    sideOuterY: 0.9,
  },

  // SCENE 3 — gala. Bloom occupies the right half; clearance keeps the
  // particles off the left-side heading without flooding the bloom.
  gala: {
    attractors: pad([
      { pos: [-3.5, 0.0, 0], strength: 0.06 },
      { pos: [3.5, 0.0, 0], strength: 0.06 },
    ]),
    noiseScale: 0.9,
    noiseStrength: 0.12,
    drag: 0.984,
    maxSpeed: 0.36,
    oscAmp: 0.036,
    pointSize: 4.3,
    opacity: 0.88,
    colorA: "#c2b8e0",
    colorB: "#dcd0eb",
    velocityToColor: 0.85,
    sideOnly: 1.0,
    sideInner: 0.65,
    sideOuter: 0.92,
    sideInnerY: 0.5,
    sideOuterY: 0.88,
  },

  // SCENE 3 — urtuu. Background video + centred copy; wide rectangular
  // clearance so dust doesn't ghost across the cinematic frame.
  urtuu: {
    attractors: pad([
      { pos: [-3.5, 0.0, 0], strength: 0.07 },
      { pos: [3.5, 0.0, 0], strength: 0.07 },
    ]),
    noiseScale: 0.85,
    noiseStrength: 0.11,
    drag: 0.985,
    maxSpeed: 0.34,
    oscAmp: 0.034,
    pointSize: 4.3,
    opacity: 0.88,
    colorA: "#9ed4b8",
    colorB: "#d8f0e2",
    velocityToColor: 0.75,
    sideOnly: 1.0,
    sideInner: 0.7,
    sideOuter: 0.95,
    sideInnerY: 0.55,
    sideOuterY: 0.9,
  },

  // SCENE 4 — rsvp. Closing message centred on screen — clear the entire
  // central rectangle so the heading sits on a pure backdrop with only
  // the corners and outer frame breathing with dust.
  rsvp: {
    attractors: pad([
      { pos: [-3.5, 0.0, 0], strength: 0.06 },
      { pos: [3.5, 0.0, 0], strength: 0.06 },
    ]),
    noiseScale: 0.7,
    noiseStrength: 0.08,
    drag: 0.989,
    maxSpeed: 0.26,
    oscAmp: 0.028,
    pointSize: 4.1,
    opacity: 0.88,
    colorA: "#e8e0c0",
    colorB: "#cce0e8",
    velocityToColor: 0.65,
    sideOnly: 1.0,
    sideInner: 0.7,
    sideOuter: 0.95,
    sideInnerY: 0.55,
    sideOuterY: 0.9,
  },
};

// Hex → rgb — we lerp in linear RGB space. Gamma-correct interpolation
// would be nicer but sRGB hex is close enough for this palette.
function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// Pre-parse hex colors once at module load. The per-frame interpolation
// path then operates on number tuples only — no string parsing, no GC.
export const SCENE_TARGETS: Record<SceneId, SceneUniforms> = (() => {
  const out: Partial<Record<SceneId, SceneUniforms>> = {};
  for (const id of Object.keys(AUTHORED) as SceneId[]) {
    const s = AUTHORED[id];
    out[id] = {
      ...s,
      colorA: hexToRgb(s.colorA),
      colorB: hexToRgb(s.colorB),
    };
  }
  return out as Record<SceneId, SceneUniforms>;
})();

// --- interpolation helpers ---
//
// PERF: `computeSceneUniforms` is called on every R3F frame (60 Hz).
// The original implementation allocated a fresh SceneUniforms object,
// 4 fresh Attractor objects, two Rgb tuples, and an array of samples
// every call — ~15 allocations × 60 fps = 900 short-lived objects per
// second.  V8 handles this fine on desktop but it can show up as
// micro-GC pauses on mid-range phones.  We now mutate a single
// pre-allocated scratch object and reuse it across frames.  Callers
// must NOT retain the returned reference beyond the current frame.

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

// Pre-allocated scratch — every field is overwritten each call.
const _scratchAttractors: Attractor[] = [
  { pos: [0, 0, 0], strength: 0 },
  { pos: [0, 0, 0], strength: 0 },
  { pos: [0, 0, 0], strength: 0 },
  { pos: [0, 0, 0], strength: 0 },
];
const _scratchColorA: Rgb = [0, 0, 0];
const _scratchColorB: Rgb = [0, 0, 0];
const _scratch: SceneUniforms = {
  attractors: _scratchAttractors,
  noiseScale: 0,
  noiseStrength: 0,
  drag: 0,
  maxSpeed: 0,
  oscAmp: 0,
  pointSize: 0,
  opacity: 0,
  colorA: _scratchColorA,
  colorB: _scratchColorB,
  velocityToColor: 0,
  sideOnly: 0,
  sideInner: 0,
  sideOuter: 0,
  sideInnerY: 0,
  sideOuterY: 0,
};

// Pre-built sample table: each scene's midpoint along the scroll
// timeline.  Stable for the lifetime of the module so we never
// rebuild it inside the per-frame call.
const SAMPLES = SCENES.map((s) => ({
  id: s.id,
  mid: (s.start + s.end) / 2,
}));

function copyInto(dst: SceneUniforms, src: SceneUniforms) {
  for (let i = 0; i < 4; i++) {
    const a = src.attractors[i];
    const d = dst.attractors[i];
    d.pos[0] = a.pos[0];
    d.pos[1] = a.pos[1];
    d.pos[2] = a.pos[2];
    d.strength = a.strength;
  }
  dst.noiseScale = src.noiseScale;
  dst.noiseStrength = src.noiseStrength;
  dst.drag = src.drag;
  dst.maxSpeed = src.maxSpeed;
  dst.oscAmp = src.oscAmp;
  dst.pointSize = src.pointSize;
  dst.opacity = src.opacity;
  dst.colorA[0] = src.colorA[0];
  dst.colorA[1] = src.colorA[1];
  dst.colorA[2] = src.colorA[2];
  dst.colorB[0] = src.colorB[0];
  dst.colorB[1] = src.colorB[1];
  dst.colorB[2] = src.colorB[2];
  dst.velocityToColor = src.velocityToColor;
  dst.sideOnly = src.sideOnly;
  dst.sideInner = src.sideInner;
  dst.sideOuter = src.sideOuter;
  dst.sideInnerY = src.sideInnerY;
  dst.sideOuterY = src.sideOuterY;
}

function lerpInto(dst: SceneUniforms, a: SceneUniforms, b: SceneUniforms, tRaw: number) {
  const t = smooth(tRaw);
  for (let i = 0; i < 4; i++) {
    const aa = a.attractors[i];
    const bb = b.attractors[i];
    const d = dst.attractors[i];
    d.pos[0] = lerp(aa.pos[0], bb.pos[0], t);
    d.pos[1] = lerp(aa.pos[1], bb.pos[1], t);
    d.pos[2] = lerp(aa.pos[2], bb.pos[2], t);
    d.strength = lerp(aa.strength, bb.strength, t);
  }
  dst.noiseScale = lerp(a.noiseScale, b.noiseScale, t);
  dst.noiseStrength = lerp(a.noiseStrength, b.noiseStrength, t);
  dst.drag = lerp(a.drag, b.drag, t);
  dst.maxSpeed = lerp(a.maxSpeed, b.maxSpeed, t);
  dst.oscAmp = lerp(a.oscAmp, b.oscAmp, t);
  dst.pointSize = lerp(a.pointSize, b.pointSize, t);
  dst.opacity = lerp(a.opacity, b.opacity, t);
  dst.colorA[0] = lerp(a.colorA[0], b.colorA[0], t);
  dst.colorA[1] = lerp(a.colorA[1], b.colorA[1], t);
  dst.colorA[2] = lerp(a.colorA[2], b.colorA[2], t);
  dst.colorB[0] = lerp(a.colorB[0], b.colorB[0], t);
  dst.colorB[1] = lerp(a.colorB[1], b.colorB[1], t);
  dst.colorB[2] = lerp(a.colorB[2], b.colorB[2], t);
  dst.velocityToColor = lerp(a.velocityToColor, b.velocityToColor, t);
  dst.sideOnly = lerp(a.sideOnly, b.sideOnly, t);
  dst.sideInner = lerp(a.sideInner, b.sideInner, t);
  dst.sideOuter = lerp(a.sideOuter, b.sideOuter, t);
  dst.sideInnerY = lerp(a.sideInnerY, b.sideInnerY, t);
  dst.sideOuterY = lerp(a.sideOuterY, b.sideOuterY, t);
}

// Main entry: given scroll progress 0..1, return the interpolated
// uniform set.  Returns a SHARED MUTABLE SINGLETON — copy fields out
// during the same tick if you need to retain anything.
export function computeSceneUniforms(progress: number): SceneUniforms {
  const p = Math.max(0, Math.min(1, progress));

  let lo = SAMPLES[0];
  let hi = SAMPLES[SAMPLES.length - 1];
  for (let i = 0; i < SAMPLES.length - 1; i++) {
    if (p >= SAMPLES[i].mid && p <= SAMPLES[i + 1].mid) {
      lo = SAMPLES[i];
      hi = SAMPLES[i + 1];
      break;
    }
  }
  if (p < SAMPLES[0].mid) {
    lo = SAMPLES[0];
    hi = SAMPLES[0];
  } else if (p > SAMPLES[SAMPLES.length - 1].mid) {
    lo = SAMPLES[SAMPLES.length - 1];
    hi = SAMPLES[SAMPLES.length - 1];
  }

  if (lo.id === hi.id) {
    copyInto(_scratch, SCENE_TARGETS[lo.id]);
    return _scratch;
  }
  const span = hi.mid - lo.mid;
  const t = span === 0 ? 0 : (p - lo.mid) / span;
  lerpInto(_scratch, SCENE_TARGETS[lo.id], SCENE_TARGETS[hi.id], t);
  return _scratch;
}
