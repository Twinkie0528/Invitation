"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  /** ms before the first line starts (typically the body's shared
   *  `d_para_group` delay). */
  delay?: number;
  /** Number of lines that have already been "consumed" by earlier
   *  paragraphs in the same continuous body.  Letting paragraphs
   *  share a single `delay` and offset their line index here makes
   *  N paragraphs read as one uninterrupted top-to-bottom wave —
   *  paragraph 2 line 0 fires the moment paragraph 1's last line
   *  ends, no breath, no per-paragraph delay. */
  lineOffset?: number;
  /** ms between consecutive visual lines.  Every letter in the
   *  same rendered line shares the same opacity-transition delay,
   *  so each line fades in as a unit before the next line begins. */
  lineStagger?: number;
  /** ms duration of each line's opacity fade. */
  duration?: number;
  /** Toggle that arms the animation (typically the section's
   *  `entered` flag).  When false, every letter stays at opacity 0. */
  trigger: boolean;
};

// LINE-BY-LINE fade.  Reuses the line-measurement strategy from the
// glow component but swaps the heavy text-shadow keyframe for a
// plain opacity transition — the only visible effect per letter is
// `opacity 0 → 1`, which is GPU-cheap on mobile (no per-letter
// shadow blur, no concurrent keyframe state).  The scale + blur
// "cosmic dust" feel of the RSVP body fade lives on the parent
// `<p>` element instead, so the paragraph as a whole settles while
// the letters reveal line-by-line through the opacity cascade.
//
// Text is spanized letter-by-letter so the browser still wraps
// words at natural breakpoints; `data-letter` lets us measure
// `offsetTop` and group letters into lines.  Re-measures on
// resize and after fonts load (Manrope can swap in late on slow
// mobile networks, which would otherwise leave the line groups
// stale and the cascade misaligned).
export function LineFade({
  text,
  delay = 0,
  lineOffset = 0,
  lineStagger = 100,
  duration = 4000,
  trigger,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lineIndices, setLineIndices] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const measure = () => {
      if (cancelled) return;
      const node = ref.current;
      if (!node) return;
      const spans = Array.from(
        node.querySelectorAll<HTMLSpanElement>("span[data-letter]"),
      );
      if (spans.length === 0) return;
      const tops: number[] = [];
      const indices = spans.map((s) => {
        const top = s.offsetTop;
        let i = tops.findIndex((t) => Math.abs(t - top) < 4);
        if (i === -1) {
          tops.push(top);
          i = tops.length - 1;
        }
        return i;
      });
      setLineIndices(indices);
    };

    const scheduleMeasure = () => {
      if (cancelled) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!cancelled) measure();
      });
    };

    const fonts =
      typeof document !== "undefined"
        ? (
            document as Document & {
              fonts?: { ready?: Promise<unknown> };
            }
          ).fonts
        : undefined;
    if (fonts && fonts.ready && typeof fonts.ready.then === "function") {
      fonts.ready.then(() => scheduleMeasure());
    }
    scheduleMeasure();

    window.addEventListener("resize", scheduleMeasure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [text]);

  const chars = Array.from(text);
  const ready = lineIndices.length === chars.length;

  return (
    <span ref={ref}>
      {chars.map((char, i) => {
        const lineIdx = (lineIndices[i] ?? 0) + lineOffset;
        const lineDelay = delay + lineIdx * lineStagger;
        return (
          <span
            key={i}
            data-letter
            style={{
              opacity: trigger && ready ? 1 : 0,
              transition: ready
                ? `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${lineDelay}ms`
                : "none",
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

// Estimate how many visual lines a paragraph will wrap to.  Used
// by section files to compute per-paragraph `lineOffset` values so
// adjacent paragraphs in the same body chain into one continuous
// line cascade (no per-paragraph delay, no breath).  Defaults to
// ~55 chars per line (mobile worst case) so the offset slightly
// over-estimates on wider desktop columns — the only consequence
// is a few hundred ms of breathing room between paragraphs there,
// which reads as a natural pause rather than a hard break.
export function estimateLineCount(
  text: string,
  charsPerLine = 55,
): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}
