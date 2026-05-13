"use client";

import { useEffect, useRef, useState } from "react";
import { sceneRef, subscribeScene, getLenis } from "@/hooks/useScrollProgress";
import {
  getLockState,
  releaseActiveLock,
  subscribeLock,
} from "@/lib/sceneLock";
import { SCENES, type SceneId } from "@/lib/scenes";

// Scenes where the NextButton has no meaningful destination — cold is
// the pre-roll padding before dear, and rsvp is the final beat so
// there's no "next" to advance to.
const HIDDEN_ON: ReadonlySet<SceneId> = new Set<SceneId>(["cold", "rsvp"]);

// Chapters represented as dots in the pagination pill.  Mirrors the
// master SCENES order but excludes cold (the pre-roll never gets a
// dot).  The active scene's slot renders the "Next" action instead
// of a dot.
const CHAPTER_ORDER: readonly SceneId[] = ["dear", "urtuu", "gala", "rsvp"];

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
  // True while a scene lock is ticking and there's still more than
  // REVEAL_BEFORE_UNLOCK_MS to wait — keeps the button hidden during
  // the bulk of the countdown so guests don't skip past the reveal.
  const [lockHiding, setLockHiding] = useState<boolean>(false);

  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lockRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearLockRevealTimer = () => {
      if (lockRevealTimer.current !== null) {
        clearTimeout(lockRevealTimer.current);
        lockRevealTimer.current = null;
      }
    };

    // Inspect a lock state snapshot and decide whether the button
    // should be hidden right now.  If there's more than the reveal
    // threshold remaining, schedule a timer to flip `lockHiding`
    // back to false once we're inside the last second; if the lock
    // is already inside that window (or not active), show the
    // button immediately.
    const applyLockState = (
      locked: boolean,
      lockedScene: SceneId | null,
      lockStartedAt: number | null,
      lockDurationMs: number,
    ) => {
      clearLockRevealTimer();
      if (
        !locked ||
        !lockedScene ||
        lockStartedAt === null ||
        HIDDEN_ON.has(lockedScene)
      ) {
        setLockHiding(false);
        return;
      }
      const elapsed = performance.now() - lockStartedAt;
      const remaining = lockDurationMs - elapsed;
      if (remaining <= REVEAL_BEFORE_UNLOCK_MS) {
        // Already within the reveal window — keep the button visible.
        setLockHiding(false);
        return;
      }
      setLockHiding(true);
      lockRevealTimer.current = setTimeout(() => {
        lockRevealTimer.current = null;
        setLockHiding(false);
      }, remaining - REVEAL_BEFORE_UNLOCK_MS);
    };

    // Seed from whatever the lock module currently reports so a
    // late-mounting button doesn't miss an in-progress lock.
    const initial = getLockState();
    applyLockState(
      initial.locked,
      initial.lockedScene,
      initial.lockStartedAt,
      initial.lockDurationMs,
    );

    const unsubLock = subscribeLock((s) => {
      applyLockState(s.locked, s.lockedScene, s.lockStartedAt, s.lockDurationMs);
    });

    const unsubScene = subscribeScene(({ active: nextActive }) => {
      setActive(nextActive);
    });

    return () => {
      clearLockRevealTimer();
      transitionTimers.current.forEach((t) => clearTimeout(t));
      transitionTimers.current = [];
      unsubLock();
      unsubScene();
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

  const hidden = HIDDEN_ON.has(active) || lockHiding;

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
        className={`pointer-events-none fixed inset-x-0 bottom-[7vh] z-50 flex justify-center sm:bottom-[3vh] ${
          hidden ? "opacity-0" : "opacity-100"
        }`}
        style={{ transition: "opacity 400ms ease-out" }}
        aria-hidden={hidden}
      >
        {/* Gradient-border wrapper — 1px linear-gradient (dark navy ->
            warm white) ringed around the pill via the standard
            two-background padding-box + border-box trick.  Pairs with
            the button's 5%-white frosted fill so the chapter chip
            reads as a soft glass control. */}
        <div
          className="pointer-events-none relative inline-block rounded-full p-[1px]"
          style={{
            background:
              "linear-gradient(135deg, #1C2439 0%, #1C2439 55%, #B0B6C4 100%)",
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* Minimal music-player style pill — one slot per chapter,
              the current scene's slot renders the green "Next"
              action, others collapse to small grey dots so the
              pagination reads as a single compact control. */}
          <button
            type="button"
            onClick={handleClick}
            disabled={hidden || transition !== "idle"}
            aria-label={label}
            className="group pointer-events-auto relative inline-flex items-center gap-3 whitespace-nowrap rounded-full px-5 py-2.5 backdrop-blur-md transition-colors duration-300 disabled:cursor-default"
            style={{
              fontFamily: "var(--font-manrope), system-ui, sans-serif",
              background: "rgba(217, 217, 217, 0.05)",
            }}
          >
            {CHAPTER_ORDER.map((scene) => {
              if (scene === active) {
                return (
                  <span
                    key={scene}
                    className="text-[13px] font-medium leading-none text-unitel-green"
                  >
                    {label}
                  </span>
                );
              }
              return (
                <span
                  key={scene}
                  aria-hidden
                  className="h-1 w-1 rounded-full bg-[#D9D9D9]"
                />
              );
            })}
          </button>
        </div>
      </div>
    </>
  );
}
