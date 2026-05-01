"use client";

import { useMemo } from "react";

type Step = string | number;
// string  → RevealText payload; the step's duration is computed from
//           the word count using `stagger` + `duration` from opts.
// number  → an inline transition's literal duration in ms (used for
//           the hero lockup, hero script flourish, gradient titles,
//           scroll cue, etc. — anything that animates as a single
//           opacity/transform block instead of word-by-word).

type Options = {
  /** ms between consecutive glyphs inside a string step (matches RevealText's `stagger`). */
  stagger?: number;
  /** ms a single glyph's transition takes (matches RevealText's `duration`). */
  duration?: number;
  /** ms of breathing room added between the END of one step and the START of the next. */
  pause?: number;
  /** ms applied to the first step's start time so the chain doesn't begin the instant the trigger flips. */
  initialDelay?: number;
};

// Compute a chain of start delays so a section's reveals play one after
// another instead of in parallel — the next step's first frame lands the
// moment the previous step's last frame settles (plus `pause`).
//
// Math for a string step of G printable glyphs (whitespace excluded):
//   step duration = max(G − 1, 0) × stagger + duration
// (the last glyph starts at (G − 1) × stagger after the step's own
// delay and animates for `duration`).  This now matches RevealText's
// glyph-by-glyph staggering — previously we counted whole words, which
// fired the next step ~5-8 × too early once RevealText switched to
// per-glyph timing.
//
// Math for a number step:
//   step duration = the number itself (caller-supplied, in ms).
//
// The returned array maps 1:1 onto the input — pass index 0 to the
// first reveal, index 1 to the second, etc.
export function useSequentialDelays(
  steps: Step[],
  opts: Options = {},
): number[] {
  const stagger = opts.stagger ?? 34;
  const duration = opts.duration ?? 440;
  const pause = opts.pause ?? 200;
  const initialDelay = opts.initialDelay ?? 0;

  const memoKey = steps
    .map((s) => (typeof s === "number" ? `#${s}` : s))
    .join("|");

  return useMemo(() => {
    let cumulative = initialDelay;
    return steps.map((step) => {
      const start = cumulative;
      let stepDuration: number;
      if (typeof step === "number") {
        stepDuration = step;
      } else {
        const glyphCount = Array.from(step).filter((c) => c.trim().length > 0).length;
        stepDuration = Math.max(glyphCount - 1, 0) * stagger + duration;
      }
      cumulative += stepDuration + pause;
      return start;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoKey, stagger, duration, pause, initialDelay]);
}
