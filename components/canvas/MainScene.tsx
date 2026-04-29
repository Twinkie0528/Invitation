"use client";

import { useEffect } from "react";
import GalaBloom from "./GalaBloom";
import { markReady } from "@/lib/loadGate";

// The persistent WebGL canvas (ParticleField cosmos starfield) was
// retired at the user's request — they did not want any global
// particle effect bleeding through behind the section mp4s.  GalaBloom
// stays because it is an animated WebP <img>, not WebGL, and powers
// the Gala scene's bloom highlight.
export default function MainScene() {
  // Other modules wait on the "canvas" load-gate signal before swapping
  // the loading overlay out, so satisfy it immediately now that there
  // is no actual canvas to wait for.
  useEffect(() => {
    markReady("canvas");
  }, []);

  return (
    <div className="canvas-root">
      <GalaBloom />
    </div>
  );
}
