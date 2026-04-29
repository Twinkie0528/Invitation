"use client";

import { Canvas, invalidate } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import SceneContent from "./SceneContent";
import GalaBloom from "./GalaBloom";
import { markReady } from "@/lib/loadGate";

// One persistent WebGL canvas that fades in/out uniforms but never unmounts.
// Everything on the canvas reads from sceneRef (lib/scenes + hooks/useScrollProgress)
// so the GPU stays in sync with scroll without React state churn.
export default function MainScene() {
  // Cold-start with frameloop="demand" so shader compile + GPGPU init don't
  // also burn frames competing with hero image decode. Switch to "always"
  // shortly after the canvas reports ready.
  const [frameloop, setFrameloop] = useState<"demand" | "always">("demand");

  useEffect(() => {
    if (frameloop !== "demand") return;
    const id = window.setTimeout(() => setFrameloop("always"), 250);
    return () => window.clearTimeout(id);
  }, [frameloop]);

  return (
    <div className="canvas-root">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.2]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 0, 4], fov: 45, near: 0.1, far: 50 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#030308", 1);
          // three's default is sRGB, but we want the palette to feel
          // a touch more punchy — set tone mapping explicitly downstream.
          scene.fog = null;
          markReady("canvas");
          // Force one render so the cleared backdrop paints behind the overlay
          // even while frameloop is still "demand".
          invalidate();
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      {/* GalaBloom renders inside canvas-root so its mix-blend-mode
          composites against the WebGL canvas pixels (same stacking
          context — outside any section's isolation). */}
      <GalaBloom />
    </div>
  );
}
