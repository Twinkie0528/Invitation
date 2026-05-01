"use client";

import { useEffect, useState } from "react";
import type { SceneId } from "@/lib/scenes";
import { isCueVisible, subscribeCue } from "@/lib/sceneLock";

type Props = {
  scene: SceneId;
  /** Optional override; defaults to bottom-centered. */
  className?: string;
};

// Levitating chevron + label that appears at the bottom of a section
// once the scene's reveal animations have fully played (i.e. its
// lock timer fired).  Tells the guest "you've seen everything here,
// now you can scroll on" without breaking the immersive composition.
//
// The component subscribes to the global cue store from `sceneLock`
// so it lights up automatically as soon as the matching scene's
// timer settles.  Visited scenes also start in the cue set, so a
// returning guest sees the chevron immediately on every section.
export default function SceneCue({ scene, className }: Props) {
  const [visible, setVisible] = useState(() => isCueVisible(scene));

  useEffect(() => {
    const unsub = subscribeCue((cued) => {
      setVisible(cued.has(scene));
    });
    return unsub;
  }, [scene]);

  return (
    <div
      aria-hidden
      className={
        className ??
        "pointer-events-none absolute inset-x-0 bottom-[8vh] z-30 flex flex-col items-center gap-2 text-white/70 sm:hidden"
      }
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <span className="font-sans text-[11px] uppercase tracking-[0.32em]">
        Scroll
      </span>
      <span className="scene-cue-bob inline-flex h-5 w-5 items-center justify-center">
        <svg
          width="18"
          height="10"
          viewBox="0 0 22 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L11 11L21 1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
