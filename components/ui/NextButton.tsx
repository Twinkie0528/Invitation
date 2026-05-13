"use client";

import { useEffect, useRef, useState } from "react";
import { sceneRef, subscribeScene, getLenis } from "@/hooks/useScrollProgress";
import {
  getLockState,
  isSceneVisited,
  releaseActiveLock,
  subscribeLock,
} from "@/lib/sceneLock";
import {
  getState as getLoadState,
  subscribe as subscribeLoadGate,
} from "@/lib/loadGate";
import { SCENES, type SceneId } from "@/lib/scenes";

// Scenes where the NextButton has no meaningful destination — cold is
// the pre-roll padding before dear, and rsvp is the final beat so
// there's no "next" to advance to.
const HIDDEN_ON: ReadonlySet<SceneId> = new Set<SceneId>(["cold", "rsvp"]);

// Click-driven page transition phases:
//   idle       — button waiting for user
//   fading-out — black overlay 0 -> 1, blocks content during scroll
//   scrolling  — lenis.scrollTo running while overlay is fully black
//   fading-in  — black overlay 1 -> 0, reveals the landed scene
const TRANSITION_FADE_OUT_MS = 480;
const TRANSITION_SCROLL_MS = 700;
const TRANSITION_FADE_IN_MS = 720;

type TransitionPhase = "idle" | "fading-out" | "scrolling" | "fading-in";

// Find the next scene after `current`, preferring its `entry` anchor
// (where reveal copy has fully landed) over the raw scene boundary.
function nextSceneEntry(current: SceneId | null): number | null {
  if (!current) return null;
  const idx = SCENES.findIndex((s) => s.id === current);
  if (idx < 0) return null;
  for (let i = idx + 1; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (s.id === "cold") continue;
    return s.entry ?? s.start;
  }
  return null;
}

// How long before a lock auto-releases the NextButton should surface.
// Hiding the affordance until the final second of the countdown keeps
// guests inside the reveal animations instead of skipping past them,
// while still giving them an explicit exit ramp the moment the page
// is "done" enough to advance.
const REVEAL_BEFORE_UNLOCK_MS = 1000;

// Per-scene scroll-icon palette.  Each scene gets a hue that echoes
// its dominant visual tone so the green outline doesn't feel like a
// branded sticker pasted on top: dear keeps the brand green (matches
// the envelope's interior glow), urtuu rides the section's blue
// gradient accent, gala picks up the lavender of its particle bloom,
// rsvp lands on a warm cream pulled from its cosmic palette.  Each
// entry pairs an opaque outline colour with the matching rgba pulse
// fill (kept at 0.18 alpha so the halo dissolves softly).
const SCROLL_ICON_COLOR: Record<SceneId, string> = {
  cold: "#46C800",
  dear: "#46C800",
  urtuu: "#73A4FF",
  gala: "#C2B8E0",
  rsvp: "#E8E0C0",
};
const SCROLL_ICON_PULSE: Record<SceneId, string> = {
  cold: "rgba(70, 200, 0, 0.18)",
  dear: "rgba(70, 200, 0, 0.18)",
  urtuu: "rgba(115, 164, 255, 0.18)",
  gala: "rgba(194, 184, 224, 0.18)",
  rsvp: "rgba(232, 224, 192, 0.18)",
};

// Whether entering `scene` is expected to fire a lock event.  Dear's
// lock fires once per session (via lockDearAnimation when phase flips
// to "playing"), so it's only "expected" until that first fire has
// been observed — tracked via a ref so subsequent entries to dear
// (e.g. user scrolling back up) don't keep the button hidden after
// the lock has already run its course.  Other scenes lock only on the
// user's very first visit.
function expectsLock(scene: SceneId, dearLockSeen: boolean): boolean {
  if (HIDDEN_ON.has(scene)) return false;
  if (scene === "dear") return !dearLockSeen;
  return !isSceneVisited(scene);
}

// Persistent "advance to next chapter" button.  Minimal music-player
// style pill — one dot per chapter with the active scene's slot
// rendering the green "Next" action.  Clicking triggers a soft black
// fade-out, a fast scrollTo to the next scene's content anchor, then
// a fade back in — gives the page transition a film-cut feel.
export default function NextButton() {
  // Active scene id — drives which slot shows the "Next" caption and
  // the cold/rsvp visibility gate.
  const [active, setActive] = useState<SceneId>(() => sceneRef.current.active);
  // Click transition state — gates the overlay opacity + locks out
  // double-clicks while a fade is in flight.
  const [transition, setTransition] = useState<TransitionPhase>("idle");
  // True while we're still waiting for the active scene's lock to
  // approach its release (or, on a fresh load, while we haven't yet
  // confirmed a lock isn't coming).  Default starts true for any
  // scene that expects a lock so the button stays hidden during the
  // splash / first-paint window before lockDearAnimation fires.
  const [lockHiding, setLockHiding] = useState<boolean>(() =>
    expectsLock(sceneRef.current.active, false),
  );
  // True while the LoadingOverlay splash is still up (loadGate hasn't
  // reported `introDone` yet).  Suppresses the button during the
  // UNITEL wordmark FLIP / fade so it doesn't visibly sit underneath
  // the splash before the scenes have settled.
  const [splashUp, setSplashUp] = useState<boolean>(
    () => !getLoadState().introDone,
  );

  // Session-scoped flag — flips true the first time we observe a lock
  // event for dear, so subsequent revisits to dear (after the lock
  // has run + released) don't keep the button hidden waiting for a
  // lock that won't fire again this session.
  const dearLockSeenRef = useRef(false);

  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lockRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearLockRevealTimer = () => {
      if (lockRevealTimer.current !== null) {
        clearTimeout(lockRevealTimer.current);
        lockRevealTimer.current = null;
      }
    };

    // Single source of truth for `lockHiding`.  Re-evaluated whenever
    // the scene changes or a lock event fires so the button surfaces
    // at the right moment in every flow: hidden during the splash /
    // pre-lock window on dear, hidden through the bulk of any active
    // countdown, visible inside the final REVEAL_BEFORE_UNLOCK_MS, and
    // visible immediately on visited scenes (where no lock will fire).
    const evaluate = (scene: SceneId) => {
      clearLockRevealTimer();
      if (HIDDEN_ON.has(scene)) {
        // Outer wrapper hides via opacity anyway — nothing to wait for.
        setLockHiding(false);
        return;
      }
      const lock = getLockState();
      if (
        lock.locked &&
        lock.lockedScene === scene &&
        lock.lockStartedAt !== null &&
        !HIDDEN_ON.has(lock.lockedScene)
      ) {
        const elapsed = performance.now() - lock.lockStartedAt;
        const remaining = lock.lockDurationMs - elapsed;
        if (remaining <= REVEAL_BEFORE_UNLOCK_MS) {
          setLockHiding(false);
          return;
        }
        setLockHiding(true);
        lockRevealTimer.current = setTimeout(() => {
          lockRevealTimer.current = null;
          setLockHiding(false);
        }, remaining - REVEAL_BEFORE_UNLOCK_MS);
        return;
      }
      // No lock active for this scene right now — decide based on
      // whether one is expected to fire.  Dear's lock is a one-shot
      // (lockDearAnimation runs once when phase flips to "playing"),
      // so after we've observed it, no more locks are coming.  Other
      // scenes lock only on the user's very first visit.
      setLockHiding(expectsLock(scene, dearLockSeenRef.current));
    };

    // Seed from the current scene + lock state so a late-mounting
    // button picks up an in-progress lock or a visited scene.
    evaluate(sceneRef.current.active);

    const unsubLock = subscribeLock((s) => {
      if (s.locked && s.lockedScene === "dear") {
        dearLockSeenRef.current = true;
      }
      evaluate(sceneRef.current.active);
    });

    const unsubScene = subscribeScene(({ active: nextActive }) => {
      setActive(nextActive);
      evaluate(nextActive);
    });

    const unsubLoad = subscribeLoadGate(() => {
      setSplashUp(!getLoadState().introDone);
    });

    return () => {
      clearLockRevealTimer();
      transitionTimers.current.forEach((t) => clearTimeout(t));
      transitionTimers.current = [];
      unsubLock();
      unsubScene();
      unsubLoad();
    };
  }, []);

  const handleClick = () => {
    if (transition !== "idle") return;
    const targetProgress = nextSceneEntry(sceneRef.current.active);
    if (targetProgress === null) return;
    const lenis = getLenis();
    if (!lenis) return;
    const limit = (lenis as unknown as { limit: number }).limit;
    if (typeof limit !== "number" || limit <= 0) return;

    setTransition("fading-out");

    const t1 = setTimeout(() => {
      // Overlay is fully black — safe to release the lock and start
      // the scroll without the user seeing the jump.
      releaseActiveLock();
      const targetPx = targetProgress * limit;
      lenis.scrollTo(targetPx, {
        duration: TRANSITION_SCROLL_MS / 1000,
        force: true,
        lock: true,
      });
      setTransition("scrolling");
    }, TRANSITION_FADE_OUT_MS);
    transitionTimers.current.push(t1);

    const t2 = setTimeout(() => {
      setTransition("fading-in");
    }, TRANSITION_FADE_OUT_MS + TRANSITION_SCROLL_MS);
    transitionTimers.current.push(t2);

    const t3 = setTimeout(() => {
      setTransition("idle");
    }, TRANSITION_FADE_OUT_MS + TRANSITION_SCROLL_MS + TRANSITION_FADE_IN_MS);
    transitionTimers.current.push(t3);
  };

  const hidden = HIDDEN_ON.has(active) || splashUp || lockHiding;

  // Overlay opacity per phase.  `fading-out` and `scrolling` both hold
  // the curtain fully black; `fading-in` ramps back to transparent.
  const overlayOpacity =
    transition === "fading-out" || transition === "scrolling" ? 1 : 0;
  const overlayTransitionMs =
    transition === "fading-out"
      ? TRANSITION_FADE_OUT_MS
      : transition === "fading-in"
      ? TRANSITION_FADE_IN_MS
      : 0;

  const label = "Next";

  return (
    <>
      {/* Click-transition curtain — a frosted-glass layer (deep navy
          tint + heavy backdrop blur) that drapes over the current
          scene while we scrollTo the next one.  Soft cubic-bezier
          easing makes the page appear to defocus rather than cut to
          black, so the swap reads as "the scene blurs out, the new
          one comes into focus" instead of a hard cinema cut. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          backgroundColor: "rgba(4, 6, 14, 0.55)",
          backdropFilter: "blur(20px) saturate(120%)",
          WebkitBackdropFilter: "blur(20px) saturate(120%)",
          opacity: overlayOpacity,
          transition:
            overlayTransitionMs > 0
              ? `opacity ${overlayTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : "none",
        }}
      />

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-[1vh] z-50 flex justify-center sm:bottom-[1.5vh] ${
          hidden ? "opacity-0" : "opacity-100"
        }`}
        style={{ transition: "opacity 400ms ease-out" }}
        aria-hidden={hidden}
      >
        {/* Pulse-ring "Scroll" affordance (Variant B, borderless).
            Vertical stack: a 36px green ring with a downward chevron +
            slow concentric pulse on top, plain "Scroll" caption below.
            A soft radial vignette sits behind the ring so it stays
            legible against scenes with bright spots (e.g. dear's
            envelope green glow).  Clicking runs the existing advance-
            to-next-chapter pipeline. */}
        <button
          type="button"
          onClick={handleClick}
          disabled={hidden || transition !== "idle"}
          aria-label={label}
          className="pointer-events-auto relative inline-flex cursor-pointer flex-col items-center gap-2.5 transition-opacity duration-300 hover:opacity-70 disabled:cursor-default"
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
          }}
        >
          <span className="relative inline-block">
            {/* Soft dark vignette behind the ring — gives the green
                outline a contrast pad so it doesn't dissolve into
                scenes with bright midtones. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-4 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.30) 45%, rgba(0, 0, 0, 0) 80%)",
              }}
            />
            <span
              aria-hidden
              className="scroll-pulse-ring"
              style={
                {
                  "--scroll-icon-color": SCROLL_ICON_COLOR[active],
                  "--scroll-icon-pulse": SCROLL_ICON_PULSE[active],
                } as React.CSSProperties
              }
            />
          </span>
          <span
            className="text-[11px] font-normal leading-none tracking-[0.18em] text-white"
            style={{
              textShadow: "0 0 8px rgba(0, 0, 0, 0.75)",
            }}
          >
            Scroll
          </span>
        </button>
      </div>
    </>
  );
}
