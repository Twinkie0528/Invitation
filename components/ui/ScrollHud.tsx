"use client";

import { useSceneState } from "@/hooks/useScrollProgress";

// Tiny bottom-left HUD showing scroll + active scene. Dev-only — hidden in
// production so it doesn't ship to the invitation.
export default function ScrollHud() {
  const { progress, active } = useSceneState();

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 rounded-md bg-black/55 px-3 py-2 font-mono text-[10px] leading-tight tracking-wider text-white/70 backdrop-blur">
      <div className="text-white/90">
        scroll <span className="tabular-nums">{progress.toFixed(3)}</span>
      </div>
      <div>scene · {active}</div>
    </div>
  );
}
