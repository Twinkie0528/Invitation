// Tracks when each load-critical subsystem reports ready. The LoadingOverlay
// fades only after every required key arrives. Also tracks `introDone` —
// the flag the hero lockup reads to know when the LoadingOverlay finished
// its FLIP transition into the hero position so it can fade itself in.
//
// Pure module-scope state — no React, no Zustand. Importable from non-React
// callers (Lenis init, R3F onCreated, raw <img onload>) without a Provider.

// "particles" was retired when the global ParticleField cosmos canvas
// was dropped — keep the literal in the union so any straggling
// `markReady("particles")` call from cached client bundles is still a
// no-op rather than a type error, but stop *waiting* on it.
export type ReadyKey = "canvas" | "particles" | "lenis" | "hero-images";

const REQUIRED: ReadyKey[] = ["canvas", "lenis", "hero-images"];

const completed = new Set<ReadyKey>();
const listeners = new Set<() => void>();

// Cached state snapshots — useSyncExternalStore requires getSnapshot to return
// a stable reference between calls when the state hasn't changed, otherwise
// React throws "The result of getSnapshot should be cached".
type Snapshot = { readonly ready: boolean; readonly introDone: boolean };

const SNAP_PENDING: Snapshot = Object.freeze({ ready: false, introDone: false });
const SNAP_READY: Snapshot = Object.freeze({ ready: true, introDone: false });
const SNAP_READY_INTRO_DONE: Snapshot = Object.freeze({ ready: true, introDone: true });
let snapshot: Snapshot = SNAP_PENDING;
let introDone = false;

function recompute() {
  const ready = REQUIRED.every((k) => completed.has(k));
  let next: Snapshot;
  if (!ready) next = SNAP_PENDING;
  else if (introDone) next = SNAP_READY_INTRO_DONE;
  else next = SNAP_READY;
  if (next !== snapshot) {
    snapshot = next;
    listeners.forEach((fn) => fn());
  }
}

export function markReady(key: ReadyKey) {
  if (completed.has(key)) return;
  completed.add(key);
  recompute();
}

export function markIntroDone() {
  if (introDone) return;
  introDone = true;
  recompute();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getState(): Snapshot {
  return snapshot;
}
