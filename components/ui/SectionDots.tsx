"use client";

import { useEffect, useState } from "react";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";
import { SCENES } from "@/lib/scenes";

// Page-step pagination — one dot per scroll-bound page from the master
// timeline (currently hero / ceo / urtuu / gala / rsvp).  Sourcing the
// list from SCENES means the dot count tracks any future reorder or
// scene addition without a separate edit here.  "cold" is the pre-roll
// padding before hero, so it gets filtered out.
//
// The active dot lights green to mirror the brand accent.  Pure status
// indicator (no click-to-jump): keeping it pointer-events-none means
// the dots never intercept TubesCursor input.
const PAGES = SCENES.filter((s) => s.id !== "cold");

function activeIndex(progress: number): number {
  for (let i = 0; i < PAGES.length; i++) {
    if (progress >= PAGES[i].start && progress < PAGES[i].end) return i;
  }
  return PAGES.length - 1;
}

export default function SectionDots() {
  const [active, setActive] = useState(() =>
    activeIndex(sceneRef.current.progress),
  );

  useEffect(() => {
    setActive(activeIndex(sceneRef.current.progress));
    return subscribeScene(({ progress }) => {
      const next = activeIndex(progress);
      setActive((prev) => (prev === next ? prev : next));
    });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-[3vh] z-40 flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 md:right-8 lg:right-10"
    >
      <div className="flex items-center gap-3 sm:flex-col sm:gap-3">
        {PAGES.map((page, i) => {
          const isActive = i === active;
          return (
            <span
              key={page.id}
              className={`block rounded-full transition-all duration-500 ease-out ${
                isActive
                  ? "h-[7px] w-[7px] bg-unitel-green"
                  : "h-[5px] w-[5px] bg-white/30"
              }`}
              style={
                isActive
                  ? { boxShadow: "0 0 10px rgba(0, 217, 95, 0.55)" }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
