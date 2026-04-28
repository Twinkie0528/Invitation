"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";

// Reveal window — matches GalaSection's useSectionReveal range so the
// bloom fades in/out exactly with the heading and copy.
const REVEAL_START = 0.19;
const REVEAL_PEAK = 0.25;
const REVEAL_HOLD = 0.45;
const REVEAL_END = 0.52;

// The bloom is served as a premium-quality animated WebP (truecolor
// RGBA, 1500 px wide, ~50 frames) generated from the source GIF by
// `scripts/build-anim.mjs`.  Alpha keying + 2× super-sampled
// downscale + saturation boost happen once at build time; at runtime
// the browser just composites it like any transparent image — no SVG
// filters, no mix-blend-mode, no per-frame CPU rasterisation, no
// flicker on mobile.  Mobile parity with desktop comes for free.
export default function GalaBloom() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const apply = (p: number) => {
      const el = wrapperRef.current;
      if (!el) return;

      let o = 0;
      if (p <= REVEAL_START) o = 0;
      else if (p < REVEAL_PEAK) o = (p - REVEAL_START) / (REVEAL_PEAK - REVEAL_START);
      else if (p <= REVEAL_HOLD) o = 1;
      else if (p < REVEAL_END) o = 1 - (p - REVEAL_HOLD) / (REVEAL_END - REVEAL_HOLD);
      else o = 0;

      el.style.opacity = String(o);
      el.style.visibility = o < 0.02 ? "hidden" : "visible";
    };
    apply(sceneRef.current.progress);
    return subscribeScene((s) => apply(s.progress));
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      // Mobile: bloom dominates the lower third of the viewport.  The
      // wrapper sits flush with the bottom edge and overshoots the
      // sides so the alpha-keyed image isn't constrained by the narrow
      // viewport width — letting the halo render at its full vertical
      // extent rather than getting shrunk to fit the device width.
      // `object-cover` (mobile) fills the wrapper top-to-bottom,
      // cropping only the soft outer wings.  sm+ reverts to the
      // cinematic bottom-right anchor.  `bloom-drift` runs a slow
      // translate+scale loop on the compositor so the halo breathes
      // on top of the APNG's own particle motion.
      className="bloom-drift pointer-events-none absolute bottom-[8vh] left-[-8vw] right-[-8vw] flex h-[40vh] items-center justify-center sm:top-auto sm:bottom-[-2vh] sm:left-auto sm:right-[-4vw] sm:h-[82vh] sm:w-[96vw] sm:items-end sm:justify-end md:bottom-0 md:right-[-2vw] md:h-[100vh] md:w-[80vw] lg:right-0 lg:h-[108vh] lg:w-[78vw]"
    >
      <Image
        src="/media/common/gala-bloom.webp"
        alt=""
        width={1500}
        height={642}
        unoptimized
        className="h-full w-full object-cover sm:w-auto sm:object-contain"
        // Pinned to a compositor layer so the WebP playback stays on
        // the GPU thread instead of repainting through layout each
        // tick — same trick that smooths the hero dust figure.
        style={{
          transform: "translateZ(0)",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}
