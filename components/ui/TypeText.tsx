"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";

type Props = {
  as?: Tag;
  className?: string;
  /** Inline styles merged on top of the component's own (e.g. minHeight). */
  style?: React.CSSProperties;
  /** ms per character (default 42). */
  speed?: number;
  /** ms delay after `trigger` flips true before typing begins. */
  delay?: number;
  /** External gate — typing starts when this flips true. Supply it from the
   *  parent section so typing fires when the user scrolls to that scene. */
  trigger?: boolean;
  /** show a blinking caret while typing. */
  caret?: boolean;
  children: string;
};

// Scroll-triggered typewriter reveal for headings. Supports `\n` for a
// hard line break. The `trigger` prop is the authoritative gate — if it's
// omitted the component behaves as a plain render so it won't fire on
// mount (since every fixed-position section is in the viewport at load).
export function TypeText({
  as: Tag = "h2",
  className,
  style,
  speed = 42,
  delay = 0,
  trigger = false,
  caret = true,
  children,
}: Props) {
  const elRef = useRef<HTMLElement | null>(null);
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);

  // Launch typing when trigger turns true (one-shot, ignores flips back).
  useEffect(() => {
    if (!trigger || started) return;
    if (delay > 0) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
    setStarted(true);
  }, [trigger, delay, started]);

  // Tick a character at a time.
  useEffect(() => {
    if (!started) return;
    if (count >= children.length) return;
    const id = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(id);
  }, [started, count, children, speed]);

  const done = started && count >= children.length;
  const typed = children.slice(0, count);
  const lines = typed.split("\n");
  const fullLines = children.split("\n");

  const Component = Tag as React.ElementType;

  return (
    <Component
      ref={elRef as React.Ref<HTMLElement>}
      className={className}
      style={{ minHeight: "1.1em", ...style }}
    >
      {/* Invisible placeholder preserves final layout so lines below don't jump. */}
      <span className="relative inline-block">
        <span className="invisible absolute left-0 top-0 w-full whitespace-pre" aria-hidden>
          {fullLines.map((l, i) => (
            <Fragment key={`ph-${i}`}>
              {l}
              {i < fullLines.length - 1 && <br />}
            </Fragment>
          ))}
        </span>
        <span className="relative">
          {lines.map((line, i) => (
            <Fragment key={`line-${i}`}>
              {line}
              {i < lines.length - 1 && <br />}
            </Fragment>
          ))}
          {caret && started && !done && <Caret />}
        </span>
      </span>
      <span className="sr-only">{children}</span>
    </Component>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="inline-block translate-y-[-0.05em] animate-[caret-blink_1s_steps(1)_infinite]"
      style={{
        width: "0.06em",
        height: "0.95em",
        marginLeft: "0.08em",
        background: "currentColor",
        verticalAlign: "middle",
      }}
    />
  );
}
