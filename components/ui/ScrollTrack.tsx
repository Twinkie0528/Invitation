"use client";

import { useMemo } from "react";
import { useSceneState } from "@/hooks/useScrollProgress";
import { computeSceneUniforms } from "@/lib/sceneUniforms";

// M1/M3 dev layer: provides the scroll height Lenis needs, plus a live HUD
// exposing scroll progress, active scene, and the current uniform snapshot
// (attractors + palette). Replaced by real DOM sections from M4 onward.
export default function ScrollTrack() {
  const { progress, active, localT } = useSceneState();
  const u = useMemo(() => computeSceneUniforms(progress), [progress]);

  const rgbToCss = (c: readonly [number, number, number]) =>
    `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
  const colorACss = rgbToCss(u.colorA);
  const colorBCss = rgbToCss(u.colorB);

  const activeAttractors = u.attractors.filter((a) => a.strength > 0.001);

  return (
    <div className="dom-layer">
      {/* 7 viewports of scroll runway so Lenis has range to drive the scene. */}
      <div style={{ height: "700vh" }} />

      <div className="pointer-events-none fixed bottom-4 left-4 z-50 rounded-md bg-black/55 px-3 py-2 font-mono text-[10px] leading-tight tracking-wider text-white/70 backdrop-blur">
        <div className="mb-1 text-white/90">
          scroll <span className="tabular-nums">{progress.toFixed(3)}</span>
        </div>
        <div>scene · {active}</div>
        <div>localT · {localT.toFixed(3)}</div>
        <div className="mt-2 text-white/50">noise</div>
        <div>
          scale {u.noiseScale.toFixed(2)} · str {u.noiseStrength.toFixed(2)}
        </div>
        <div>
          drag {u.drag.toFixed(3)} · max {u.maxSpeed.toFixed(2)}
        </div>
        <div className="mt-2 text-white/50">palette</div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: colorACss }}
          />
          <span>{colorACss}</span>
          <span
            className="ml-1 inline-block h-2 w-2 rounded-sm"
            style={{ background: colorBCss }}
          />
          <span>{colorBCss}</span>
        </div>
        <div className="mt-2 text-white/50">
          attractors ({activeAttractors.length})
        </div>
        {activeAttractors.map((a, i) => (
          <div key={i}>
            [{a.pos[0].toFixed(2)}, {a.pos[1].toFixed(2)}, {a.pos[2].toFixed(2)}] ·{" "}
            {a.strength.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}
