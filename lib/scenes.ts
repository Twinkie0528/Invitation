// Single source of truth for scroll → scene state.
// Every shader uniform, DOM fade, and audio layer reads from this.

export type SceneId = "cold" | "dear" | "gala" | "urtuu" | "rsvp";

export type SceneBreakpoint = {
  id: SceneId;
  start: number; // 0..1 scroll progress
  end: number;
  // Where this scene's primary content is fully revealed.  NextButton
  // uses this so "advance to next" lands the user mid-content (where
  // the headline + body have settled) instead of at the boundary
  // where the reveal cascade is still ramping up.  Defaults to
  // `start` when omitted (e.g. cold / dear, which we never jump to).
  entry?: number;
  label: string;
};

// Master scroll timeline.  Page narrative order:
//   1. Dear — personalised welcome card → INVITATION reveal
//      (absorbs the former Hero scene; stage 3 carries the
//      INVITATION title + body that Hero used to render).
//   2. Urtuu — "The Urtuu" immersive experience
//   3. Gala — "Immersive Gala Dinner"
//   4. RSVP
export const SCENES: SceneBreakpoint[] = [
  { id: "cold", start: -0.01, end: 0.0, label: "Cold start" },
  { id: "dear", start: 0.0, end: 0.24, label: "Dear · Welcome + Invitation" },
  { id: "urtuu", start: 0.24, entry: 0.30, end: 0.50, label: "Urtuu journey" },
  { id: "gala", start: 0.50, entry: 0.56, end: 0.76, label: "Gala bloom" },
  { id: "rsvp", start: 0.76, entry: 0.82, end: 1.01, label: "Convergence · RSVP" },
];

// Sub-scenes inside Urtuu for the 5a/5b/5c beats.  Ranges sit inside
// the parent urtuu window (0.18 → 0.5).
export const URTUU_SUB = {
  horizon: { start: 0.22, end: 0.3 },
  columns: { start: 0.3, end: 0.4 },
  fire: { start: 0.4, end: 0.48 },
};

export type SceneState = {
  // Scroll progress 0..1, updated every frame from Lenis.
  progress: number;
  // Currently-active scene id.
  active: SceneId;
  // 0..1 progress within the active scene.
  localT: number;
};

export function resolveScene(progress: number): SceneState {
  const p = Math.max(0, Math.min(1, progress));
  for (const s of SCENES) {
    if (p >= s.start && p <= s.end) {
      const span = s.end - s.start || 1;
      return { progress: p, active: s.id, localT: (p - s.start) / span };
    }
  }
  return { progress: p, active: "dear", localT: 0 };
}

// Linear remap helper (shader-style). Used everywhere uniforms cross-fade.
export const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  const t = (v - inMin) / (inMax - inMin);
  const clamped = Math.max(0, Math.min(1, t));
  return outMin + (outMax - outMin) * clamped;
};

// Smoothstep — softer cross-fades between scenes.
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
