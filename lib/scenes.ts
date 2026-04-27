// Single source of truth for scroll → scene state.
// Every shader uniform, DOM fade, and audio layer reads from this.

export type SceneId = "cold" | "hero" | "dissolve" | "immersive" | "gala" | "urtuu" | "rsvp";

export type SceneBreakpoint = {
  id: SceneId;
  start: number; // 0..1 scroll progress
  end: number;
  label: string;
};

// Master scroll timeline. Breakpoints match the narrative in the brief.
export const SCENES: SceneBreakpoint[] = [
  { id: "cold", start: -0.01, end: 0.0, label: "Cold start" },
  { id: "hero", start: 0.0, end: 0.15, label: "Hero · Seal breathes" },
  { id: "dissolve", start: 0.15, end: 0.25, label: "Dissolve to field" },
  { id: "immersive", start: 0.25, end: 0.4, label: "Immersive intro" },
  { id: "gala", start: 0.4, end: 0.6, label: "Gala bloom" },
  { id: "urtuu", start: 0.6, end: 0.85, label: "Urtuu journey" },
  { id: "rsvp", start: 0.85, end: 1.01, label: "Convergence · RSVP" },
];

// Sub-scenes inside Urtuu for the 5a/5b/5c beats.
export const URTUU_SUB = {
  horizon: { start: 0.6, end: 0.68 },
  columns: { start: 0.68, end: 0.76 },
  fire: { start: 0.76, end: 0.85 },
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
  return { progress: p, active: "hero", localT: 0 };
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
