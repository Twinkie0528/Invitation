"use client";

import { useEffect, useRef } from "react";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";

// Scroll-progress windows during which TubesCursor is hidden so its
// separate WebGL context stops competing with the section <video> tags
// for GPU/decode bandwidth. Two ranges, one per video-backed section.
const HIDE_RANGES: Array<readonly [number, number]> = [
  [0.18, 0.46], // ImmersiveSection — Spirit of Japan
  [0.6, 0.9], // UrtuuSection     — TeamLab
];

function shouldHide(p: number): boolean {
  for (const [s, e] of HIDE_RANGES) {
    if (p >= s && p <= e) return true;
  }
  return false;
}

// Follow-cursor 3D tubes effect (Kevin Levron / threejs-components).
// Config is the reference snippet verbatim — we trade palette tuning for
// known-good smoothness. Palette changes can be made later via
// tubes.setColors() once everything's stable.
export default function TubesCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip on touch — the sleep-loop animation is distracting without a pointer.
    const coarse = window.matchMedia("(pointer: coarse)");
    if (coarse.matches) return;

    let cancelled = false;

    import("threejs-components/build/cursors/tubes1.min.js")
      .then(({ default: TubesCursorFactory }) => {
        if (cancelled || !canvasRef.current) return;

        const app = TubesCursorFactory(canvas, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
            },
          },
        });

        disposeRef.current = () => app.dispose();
      })
      .catch((err) => {
        console.warn("TubesCursor failed to init:", err);
      });

    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, []);

  // Hide the canvas while either video is on stage. display:none takes
  // the canvas out of the rasterization tree — even though the lib keeps
  // ticking on RAF, the browser skips compositing this layer and GPU
  // bandwidth frees up for the <video> decoder.
  useEffect(() => {
    const apply = (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.display = shouldHide(p) ? "none" : "";
    };
    apply(sceneRef.current.progress);
    return subscribeScene((s) => apply(s.progress));
  }, []);

  // IMPORTANT: the library reads pointer state from the canvas's own
  // pointermove events (its `p.hover` flag), so the canvas MUST have
  // pointer-events enabled. It sits at z-10 below the DOM sections (z-20)
  // so content still feels on top; sections keep `pointer-events: none`
  // on their wrappers and only buttons/cards carry `pointer-events: auto`.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-[10] h-full w-full"
    />
  );
}
