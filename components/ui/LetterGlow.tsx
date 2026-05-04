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
   *  same rendered line shares the same animation-delay, so each
   *  line glows as a unit before the next line begins. */
  lineStagger?: number;
  /** ms duration of each letter's glow-pulse. */
  duration?: number;
  /** Toggle that arms the animation (typically the section's
   *  `entered` flag).  When false, every letter stays at opacity 0. */
  trigger: boolean;
};

// LINE-BY-LINE glow.  The text is spanized letter-by-letter so the
// browser still wraps words at natural breakpoints; after mount the
// component measures each span's `offsetTop` and groups letters
// into lines.  Every letter on the same visual line gets the same
// animation-delay, so the glow flows top-to-bottom one line at a
// time rather than rippling per-letter.  Re-measures on resize so
// the line groups stay correct if the viewport changes.
export function LetterGlow({
  text,
  delay = 0,
  lineOffset = 0,
  lineStagger = 100,
  duration = 2500,
  trigger,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lineIndices, setLineIndices] = useState<number[]>([]);

  useEffect(() => {
    const measure = () => {
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
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

  const chars = Array.from(text);
  const ready = lineIndices.length === chars.length;

  return (
    <span ref={ref}>
      {chars.map((char, i) => (
        <span
          key={i}
          data-letter
          style={{
            opacity: 0,
            animation:
              trigger && ready
                ? `letter-glow ${duration}ms ease ${
                    delay + ((lineIndices[i] ?? 0) + lineOffset) * lineStagger
                  }ms both`
                : "none",
          }}
        >
          {char}
        </span>
      ))}
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
