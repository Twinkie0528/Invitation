"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";

type Props = {
  as?: Tag;
  className?: string;
  /** ms between glyphs (was: between words). */
  stagger?: number;
  /** ms for a single glyph's transition. */
  duration?: number;
  /** ms delay after `trigger` flips true before the first glyph starts. */
  delay?: number;
  /** External gate — reveal plays when this flips true. Supply from the
   *  parent section so it fires when the user scrolls to that scene. */
  trigger?: boolean;
  children: string;
};

// Glyph-by-glyph fade + lift reveal — letters appear one at a time,
// like an elegant handwritten line being drawn across the page.  The
// previous implementation animated whole WORDS per stagger step which
// felt mechanical; staggering per character makes the motion feel
// continuous and human (per user feedback).
//
// PERF NOTE: keeps the original `opacity + translateY` only treatment
// (no filter / no blur) so dozens of glyphs animate on the compositor
// without paint passes.  `willChange` is stripped once the last glyph
// has settled so the GPU layers release and we don't pin RAM.
export function RevealText({
  as: Tag = "p",
  className,
  stagger = 28,
  duration = 480,
  delay = 0,
  trigger = false,
  children,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!trigger || visible) return;
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
    setVisible(true);
  }, [trigger, delay, visible]);

  // Once the last glyph's transition has finished, drop will-change so
  // the compositor can release the per-glyph layers.
  useEffect(() => {
    if (!visible) return;
    // Count printable glyphs (excludes whitespace) so the settle
    // timer matches the actual animated set.
    const glyphCount = Array.from(children).filter((c) => c.trim().length > 0).length;
    const totalMs = delay + stagger * Math.max(1, glyphCount) + duration + 100;
    const t = setTimeout(() => setSettled(true), totalMs);
    return () => clearTimeout(t);
  }, [visible, delay, duration, stagger, children]);

  const lines = children.split("\n");
  let glyphIdx = 0;
  // Smooth, no-overshoot ease — matches the calligraphy-feeling reveal
  // the user requested.
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

  const rendered = lines.map((line, lineIdx) => {
    // Split into words first so we can keep word boundaries unbroken
    // when the line wraps (CSS `word-break: keep-all` / wrapping
    // happens between siblings, so wrapping each word in an
    // inline-block prevents a word from snapping mid-glyph at the end
    // of a line).
    const words = line.split(" ");
    const spans: React.ReactNode[] = [];

    words.forEach((word, wi) => {
      const chars = Array.from(word);
      const charSpans = chars.map((ch, ci) => {
        const idx = glyphIdx++;
        const charDelay = idx * stagger;
        const transition = visible
          ? `opacity ${duration}ms ${ease} ${charDelay}ms, transform ${duration}ms ${ease} ${charDelay}ms`
          : "none";

        return (
          <span
            key={`g-${lineIdx}-${wi}-${ci}`}
            style={{
              display: "inline-block",
              opacity: visible ? 1 : 0,
              transform: visible ? "translate3d(0,0,0)" : "translate3d(0,8px,0)",
              transition,
              // Only hint the compositor while the glyph is actually
              // animating; once the line settles we drop the hint so
              // the GPU layers release.
              willChange: settled ? "auto" : "opacity, transform",
            }}
          >
            {ch}
          </span>
        );
      });

      // Word wrapper keeps glyphs of the same word together when the
      // line breaks — wrapping happens between word wrappers, never
      // mid-word.
      spans.push(
        <span
          key={`w-${lineIdx}-${wi}`}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {charSpans}
        </span>,
      );

      if (wi < words.length - 1) {
        spans.push(<Fragment key={`sp-${lineIdx}-${wi}`}> </Fragment>);
      }
    });

    return (
      <Fragment key={`line-${lineIdx}`}>
        {spans}
        {lineIdx < lines.length - 1 && <br />}
      </Fragment>
    );
  });

  const Component = Tag as React.ElementType;
  return (
    <Component ref={ref as React.Ref<HTMLElement>} className={className}>
      {rendered}
    </Component>
  );
}
