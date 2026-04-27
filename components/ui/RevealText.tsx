"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";

type Props = {
  as?: Tag;
  className?: string;
  /** ms between words. */
  stagger?: number;
  /** ms for a single word's transition. */
  duration?: number;
  /** ms delay after `trigger` flips true before the first word starts. */
  delay?: number;
  /** External gate — reveal plays when this flips true. Supply from the
   *  parent section so it fires when the user scrolls to that scene. */
  trigger?: boolean;
  children: string;
};

// Word-by-word fade + lift reveal. Gated by `trigger` so scroll can fire
// it at the exact moment the parent section becomes on-screen.
//
// PERF NOTE: This used to drive `filter: blur(8px → 0)` per word as
// well, which looked great on desktop but caused visible stutter on
// mobile because every blur step forces a paint pass (filter is not a
// compositor-only property like opacity/transform).  We now reveal with
// pure `opacity + translateY` — both compositor-only — which keeps the
// motion buttery on phones and lets us animate dozens of words in
// parallel without dropping frames.
//
// We also strip `will-change` once the per-word transition settles so
// the compositor stops holding a layer per word forever (was costing
// ~50 MB of GPU layers across the page on cold load).
export function RevealText({
  as: Tag = "p",
  className,
  stagger = 80,
  duration = 700,
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

  // Once the last word's transition has finished, drop will-change so
  // the compositor can release the per-word layers.
  useEffect(() => {
    if (!visible) return;
    const totalMs = delay + stagger * Math.max(1, children.split(/\s+/).length) + duration + 100;
    const t = setTimeout(() => setSettled(true), totalMs);
    return () => clearTimeout(t);
  }, [visible, delay, duration, stagger, children]);

  const lines = children.split("\n");
  let wordCount = 0;
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

  const rendered = lines.map((line, lineIdx) => {
    const words = line.split(" ");
    const spans: React.ReactNode[] = [];

    words.forEach((word, i) => {
      const idx = wordCount++;
      const wordDelay = idx * stagger;
      const transition = visible
        ? `opacity ${duration}ms ${ease} ${wordDelay}ms, transform ${duration}ms ${ease} ${wordDelay}ms`
        : "none";

      spans.push(
        <span
          key={`w-${lineIdx}-${i}`}
          style={{
            display: "inline-block",
            opacity: visible ? 1 : 0,
            transform: visible ? "translate3d(0,0,0)" : "translate3d(0,14px,0)",
            transition,
            // Only hint the compositor while we're actually animating;
            // once the words settle we drop the hint to free GPU memory.
            willChange: settled ? "auto" : "opacity, transform",
          }}
        >
          {word}
        </span>,
      );

      if (i < words.length - 1) {
        spans.push(<Fragment key={`sp-${lineIdx}-${i}`}> </Fragment>);
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
