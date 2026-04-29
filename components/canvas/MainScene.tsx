"use client";

import { useEffect } from "react";
import { markReady } from "@/lib/loadGate";

// All persistent global effects (the WebGL ParticleField cosmos and
// the GalaBloom WebP halo) were retired at the user's request — they
// only wanted scene-local backgrounds, with the bloom living solely
// inside GalaSection (which now ships its own gala-bloom.mp4).  This
// component used to mount those effects; it now exists purely to
// satisfy the load-gate's "canvas" key so the LoadingOverlay still
// fades on schedule.
export default function MainScene() {
  useEffect(() => {
    markReady("canvas");
  }, []);

  return null;
}
