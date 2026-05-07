// Progress-based scroll lock for the mobile invitation flow.
//
// First-visit guests are clamped at a hand-picked progress cap per
// scene for a few seconds while the section's reveal animations get
// their attention.  Caps target a content-meaningful boundary in
// each scene (signature settled, final paragraph in view, etc.).
// Page narrative is now Dear → CEO → Urtuu → Gala → RSVP (Hero
// scene was absorbed into Dear's stage-3 INVITATION reveal):
//
//   Dear  — cap 0.16 (animation playback boundary)
//   CEO   — cap 0.40 (signature row settled)
//   Urtuu — cap 0.60 ("…you to experience it" final paragraph)
//   Gala  — cap 0.80 ("…for invited guests" final paragraph)
//   RSVP  — cap 1.0   (no cap; final scene)
//
// After the per-scene timer fires the cap releases and the user
// can continue scrolling.  Visited scene ids are written to
// `localStorage` so subsequent visits to the same scene unlock
// immediately.

import { SCENES, type SceneId } from "./scenes";

const VISITED_STORAGE_KEY = "unitel_visited_scenes_v1";

// Maximum scroll progress (0..1) the user is allowed to reach
// inside each scene's lock.  Values come from the user's mobile
// inspector readout — content-meaningful boundaries, not arbitrary
// scene ends.  RSVP intentionally sits at 1.0 (no cap).
const SCENE_CAP_PROGRESS: Record<SceneId, number> = {
  cold: 0,
  dear: 0.16,
  ceo: 0.40,
  urtuu: 0.60,
  gala: 0.80,
  rsvp: 1.0,
};

// Lock duration per scene (ms).  3 s across the body scenes — long
// enough to hold the user's attention without feeling punitive.
// `cold` and `rsvp` are zero.  `dear`'s auto-lock is also zero —
// the lock for dear is triggered MANUALLY by DearSection when the
// stage-2 animation starts (via `lockDearAnimation`) so the timer
// covers the actual 8 s mp4 + invitation cascade rather than
// firing at scene-enter (which may be seconds before the user
// scrolls).
const SCENE_LOCK_MS: Record<SceneId, number> = {
  cold: 0,
  dear: 0,
  urtuu: 3000,
  gala: 3000,
  ceo: 3000,
  rsvp: 0,
};

type LockState = {
  locked: boolean;
  lockedScene: SceneId | null;
  // Maximum scroll progress (0..1) allowed during this lock.
  // 1.0 when no lock is active.
  maxProgress: number;
};

let visitedScenes: Set<SceneId> = new Set();
let lockState: LockState = {
  locked: false,
  lockedScene: null,
  maxProgress: 1.0,
};
let unlockTimer: ReturnType<typeof setTimeout> | null = null;
const lockListeners = new Set<(s: LockState) => void>();

// Lock module is a no-op outside mobile viewports — desktop layouts
// don't share the same scroll mapping the cap values were tuned
// against.  Toggled from `app/providers.tsx` via `setLockEnabled`.
let lockEnabled = false;

export function setLockEnabled(enabled: boolean) {
  lockEnabled = enabled;
  if (!enabled) {
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      unlockTimer = null;
    }
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    notifyLockChange();
  }
}

function notifyLockChange() {
  lockListeners.forEach((l) => l(lockState));
}

export function loadVisitedFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(VISITED_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      visitedScenes = new Set(
        parsed.filter((id): id is SceneId => typeof id === "string"),
      );
    }
  } catch {
    visitedScenes = new Set();
  }
}

function persistVisited() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      VISITED_STORAGE_KEY,
      JSON.stringify([...visitedScenes]),
    );
  } catch {
    /* best-effort */
  }
}

export function isSceneVisited(scene: SceneId): boolean {
  return visitedScenes.has(scene);
}

export function subscribeLock(listener: (s: LockState) => void) {
  lockListeners.add(listener);
  listener(lockState);
  return () => {
    lockListeners.delete(listener);
  };
}

export function getLockState(): LockState {
  return lockState;
}

export function getMaxAllowedProgress(): number {
  return lockState.locked ? lockState.maxProgress : 1.0;
}

export function tryLockScene(scene: SceneId) {
  if (!lockEnabled) return;
  if (scene === "cold") return;
  if (SCENE_CAP_PROGRESS[scene] >= 1.0) return;
  if (visitedScenes.has(scene)) return;
  if (lockState.locked && lockState.lockedScene === scene) return;

  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }

  // Make sure the cap doesn't sit above the scene's actual end —
  // if a future tweak ever raises a cap past the scene boundary
  // we'd accidentally let the user advance into the next scene
  // before the lock releases.
  const sceneDef = SCENES.find((s) => s.id === scene);
  const cap = SCENE_CAP_PROGRESS[scene];
  const boundedCap = sceneDef ? Math.min(cap, sceneDef.end - 0.001) : cap;

  lockState = {
    locked: true,
    lockedScene: scene,
    maxProgress: Math.max(0, boundedCap),
  };
  notifyLockChange();

  const duration = SCENE_LOCK_MS[scene];
  unlockTimer = setTimeout(() => {
    visitedScenes.add(scene);
    persistVisited();
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    unlockTimer = null;
    notifyLockChange();
  }, duration);
}

// Manual lock trigger for the Dear scene's stage-2 animation.
// Bypasses the per-session `visited` check so the lock fires every
// time the user scrolls to start the animation, even on revisits.
// Pins scroll at the dear cap (0.16) for `durationMs` then releases
// automatically.  Caller decides the duration based on the actual
// animation + cascade length.
export function lockDearAnimation(durationMs: number) {
  if (!lockEnabled) return;
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
  const dearCap = SCENE_CAP_PROGRESS["dear"];
  const sceneDef = SCENES.find((s) => s.id === "dear");
  const boundedCap = sceneDef
    ? Math.min(dearCap, sceneDef.end - 0.001)
    : dearCap;
  lockState = {
    locked: true,
    lockedScene: "dear",
    maxProgress: Math.max(0, boundedCap),
  };
  notifyLockChange();
  unlockTimer = setTimeout(() => {
    visitedScenes.add("dear");
    persistVisited();
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    unlockTimer = null;
    notifyLockChange();
  }, durationMs);
}

if (typeof window !== "undefined") {
  // @ts-expect-error attaching debug helper
  window.__unitelResetSceneLocks = () => {
    visitedScenes.clear();
    persistVisited();
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      unlockTimer = null;
    }
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    notifyLockChange();
  };
}
