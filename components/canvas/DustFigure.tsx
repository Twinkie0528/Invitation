"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";

// Hero exit window — figure stays at rest until scroll passes hold,
// then collapses (slide + scale) into the dissolve scene.
const TRANSITION_START = 0.13;
const TRANSITION_END = 0.2;

// The dust figure is the event mascot (a chess queen carved from
// particles).  It's served as a premium-quality animated WebP
// (truecolor RGBA, 1500 px wide, ~57 frames) generated from the
// source GIF by `scripts/build-anim.mjs`.  Alpha keying happens
// once at build time, so at runtime the browser composites it like
// any transparent image — no SVG filters, no mix-blend-mode, no
// flicker on mobile.
//
// Layer architecture:
//   • Outer wrapper (ref'd) — owns scroll-driven exit transform
//     (slide + scale + rotate) and reveal opacity.  Position layout
//     is `absolute` so it doesn't fork a stacking context away from
//     the WebGL canvas behind it.
//   • Inner `<div className="dust-drift">` — owns the continuous
//     idle animation (slow translate + scale loop).  Splitting these
//     two responsibilities into separate elements means the JS
//     scroll handler's `transform` writes never fight with the CSS
//     keyframe animation: each element animates independently and
//     the browser's compositor multiplies them for free.
//
// Layout per breakpoint:
//   • Mobile (<md): pinned to the TOP 50vh of the viewport, centred —
//     the mascot lives above the copy so it reads as a hero portrait
//     before you scroll into the body text underneath.
//   • md+: anchored to the right side, full height (108vh), classic
//     cinematic overlay treatment beside the left-aligned copy.
export default function DustFigure() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const apply = (p: number) => {
      const el = wrapperRef.current;
      if (!el) return;

      let opacity = 1;
      if (p > TRANSITION_END) opacity = 0;
      else if (p > TRANSITION_START) {
        opacity = 1 - (p - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
      }

      const t = Math.max(0, Math.min(1, (p - TRANSITION_START) / (TRANSITION_END - TRANSITION_START)));
      const eased = t * t * t;

      el.style.opacity = String(opacity);
      el.style.visibility = opacity < 0.02 ? "hidden" : "visible";
      if (t === 0) {
        el.style.transform = "";
      } else {
        const ty = eased * 32;
        const sc = 1 - eased * 0.6;
        const rot = eased * 4;
        el.style.transform = `translate3d(0, ${ty}%, 0) scale(${sc}) rotate(${rot}deg)`;
      }
    };
    apply(sceneRef.current.progress);
    return subscribeScene((s) => apply(s.progress));
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      // Mobile: figure occupies the upper portion only (~3-37vh) so the
      // body copy sitting at the optical centre of the viewport stays
      // unobstructed. scale-125 on the image keeps the mascot reading
      // as substantial despite the smaller container height.
      className="pointer-events-none absolute top-[3vh] left-0 right-0 flex h-[34vh] items-center justify-center will-change-transform md:top-0 md:inset-y-0 md:right-[1vw] md:left-auto md:h-auto md:w-[72vw] md:justify-end"
      style={{
        // Centre origin on mobile so the collapse-on-scroll shrinks
        // toward the figure's middle; bottom-right on desktop matches
        // the original cinematic exit anchor.
        transformOrigin: "50% 50%",
      }}
    >
      {/* Inner drift layer.  Hosts a continuous keyframe loop
          (`dust-drift` in globals.css) that gently rises, falls, and
          breathes the queen so she feels alive while the user is
          reading — not just animating internally via the WebP. The
          loop runs entirely on the compositor (transform-only) so it
          never paints. */}
      <div className="dust-drift flex h-full w-full items-center justify-center md:items-stretch md:justify-end">
        <Image
          src="/media/hero/dust-figure.webp"
          alt=""
          width={1500}
          height={744}
          priority
          unoptimized
          // Mobile: scale the figure up — `scale-125` overspills the
          // 34vh container so the mascot reads as a substantial
          // portrait rather than a thumbnail. Desktop keeps its
          // absolute h-[108vh].
          className="h-full w-auto scale-125 object-contain opacity-95 md:h-[108vh] md:scale-100 md:opacity-100"
          style={{
            transform: "translateZ(0)",
            willChange: "transform, opacity",
          }}
        />
      </div>
    </div>
  );
}
