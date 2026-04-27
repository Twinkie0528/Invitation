"use client";

import { useEffect, useRef } from "react";
import { subscribeScene, sceneRef } from "./useScrollProgress";

type Range = {
  start: number; // scroll progress at which the section begins to fade in
  peak: number; // progress at which the section is fully visible
  hold: number; // progress until which the section stays fully visible
  end: number; // progress at which the section has fully faded out
};

// Drive a DOM element's opacity + visibility directly from the scroll
// subscription. Avoids React re-renders — every scroll tick touches only
// the ref'd element's style.
export function useSectionReveal<T extends HTMLElement = HTMLDivElement>(
  range: Range,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const { start, peak, hold, end } = range;

    const apply = (p: number) => {
      const el = ref.current;
      if (!el) return;

      let o = 0;
      if (p <= start) o = 0;
      else if (p < peak) o = (p - start) / Math.max(peak - start, 0.0001);
      else if (p <= hold) o = 1;
      else if (p < end) o = 1 - (p - hold) / Math.max(end - hold, 0.0001);
      else o = 0;

      el.style.opacity = String(o);
      // Keep the section wrapper non-interactive so pointer events always
      // reach the TubesCursor canvas underneath. Interactive children
      // (cards, buttons) opt back in via `pointer-events-auto`.
      if (o < 0.05) {
        el.style.visibility = "hidden";
      } else {
        el.style.visibility = "visible";
      }
    };

    // Apply once based on current scroll.
    apply(sceneRef.current.progress);

    const unsub = subscribeScene((s) => apply(s.progress));
    return () => {
      unsub();
    };
  }, [range.start, range.peak, range.hold, range.end, range]);

  return ref;
}
