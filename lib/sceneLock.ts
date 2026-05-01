// Progress-based scroll lock for the mobile invitation flow.
//
// First-visit guests are held inside each section while its reveal
// animations play.  Unlike a `lenis.stop()` (which freezes ALL
// scroll), this clamps the user's scroll progress at a hand-picked
// cap value per scene — they can still scroll back UP within the
// current section freely, only forward navigation past the cap is
// blocked.  Caps were chosen against the actual mobile scroll
// layout the user inspected:
//
//   Hero  — cap 0.099 (scroll-cue chevron position)
//   Urtuu — cap 0.350 ("…you to experience it" final paragraph)
//   Gala  — cap 0.550 ("…for invited guests" final paragraph)
//   CEO   — cap 0.800 (signature row settled)
//   RSVP  — cap 1.0   (no cap; final scene)
//
// Each scene also carries a max animation duration; once that timer
// fires the cap releases AND a scroll-cue chevron component
// (`SceneCue`) becomes visible so the user knows they can advance.
// The cue stays visible across the rest of the session.
//
// Visited scene ids are written to `localStorage` so subsequent
// visits to the same scene unlock immediately.

import { SCENES, type SceneId } from "./scenes";

const VISITED_STORAGE_KEY = "unitel_visited_scenes_v1";

// Maximum scroll progress (0..1) the user is allowed to reach
// inside each scene's lock.  Past this, the boundary clamp snaps
// them back.  Values are taken from the user's mobile inspector
// readout — content-meaningful boundaries, not arbitrary scene
// ends.  RSVP intentionally sits at 1.0 (no cap).
const SCENE_CAP_PROGRESS: Record<SceneId, number> = {
  cold: 0,
  hero: 0.099,
  urtuu: 0.35,
  gala: 0.55,
  ceo: 0.8,
  rsvp: 1.0,
};

// Max animation chain duration per scene (ms).  After this elapses
// the cap auto-releases regardless of where the user is scrolled,
// so guests are never stuck behind a stalled lock.  Tuned slightly
// longer than each scene's last reveal so the user sees the closing
// element fully before the chevron unlocks the path forward.
const SCENE_LOCK_MS: Record<SceneId, number> = {
  cold: 0,
  hero: 9500,
  urtuu: 6800,
  gala: 8500,
  ceo: 10500,
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
let cuedScenes: Set<SceneId> = new Set();
let lockState: LockState = {
  locked: false,
  lockedScene: null,
  maxProgress: 1.0,
};
let unlockTimer: ReturnType<typeof setTimeout> | null = null;
const lockListeners = new Set<(s: LockState) => void>();
const cueListeners = new Set<(visibleScenes: ReadonlySet<SceneId>) => void>();

// Lock module is a no-op outside mobile viewports — desktop layouts
// don't share the same scroll mapping the cap values were tuned
// against.  Toggled from `app/providers.tsx` via `setLockEnabled`.
let lockEnabled = false;

export function setLockEnabled(enabled: boolean) {
  lockEnabled = enabled;
  if (!enabled) {
    // Tear down any active lock when disabling (e.g. resize from
    // mobile to desktop).
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

function notifyCueChange() {
  cueListeners.forEach((l) => l(cuedScenes));
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
      // Visited scenes already have their cue burned in — show it
      // immediately so a returning guest sees the chevron without
      // re-watching the timer.
      cuedScenes = new Set(visitedScenes);
    }
  } catch {
    visitedScenes = new Set();
    cuedScenes = new Set();
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

export function isCueVisible(scene: SceneId): boolean {
  return cuedScenes.has(scene);
}

export function subscribeLock(listener: (s: LockState) => void) {
  lockListeners.add(listener);
  listener(lockState);
  return () => lockListeners.delete(listener);
}

export function subscribeCue(
  listener: (visibleScenes: ReadonlySet<SceneId>) => void,
) {
  cueListeners.add(listener);
  listener(cuedScenes);
  return () => cueListeners.delete(listener);
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
  // RSVP has no cap — skip.
  if (SCENE_CAP_PROGRESS[scene] >= 1.0) return;
  if (visitedScenes.has(scene)) return;
  if (lockState.locked && lockState.lockedScene === scene) return;

  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }

  // Make sure the cap doesn't sit ABOVE the scene's actual end —
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
    cuedScenes.add(scene);
    notifyCueChange();
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    unlockTimer = null;
    notifyLockChange();
  }, duration);
}

if (typeof window !== "undefined") {
  // @ts-expect-error attaching debug helper
  window.__unitelResetSceneLocks = () => {
    visitedScenes.clear();
    cuedScenes.clear();
    persistVisited();
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      unlockTimer = null;
    }
    lockState = { locked: false, lockedScene: null, maxProgress: 1.0 };
    notifyCueChange();
    notifyLockChange();
  };
}
