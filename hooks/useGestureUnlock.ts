"use client";

import { useEffect, useState } from "react";

// One-shot global gate that flips on the first user gesture (touch,
// click, wheel, scroll, keydown).  Every BackgroundVideoFrame waits
// on this before mounting its <video> element, which is the only
// reliable way to suppress iOS Safari's autoplay-block UI: when
// autoplay is denied (Low Power Mode, "Auto-Play Video Previews"
// off, in-app webviews), iOS paints a tap-to-play triangle overlay
// over any visible <video> element — and there is no `controls`
// attribute we can omit to make it go away, because the overlay is
// the autoplay-block indicator, not a control.  Holding the
// <video> tag back until the gesture lands means iOS never has a
// reason to paint the overlay, and the play() call we issue inside
// the gesture handler counts as user activation so autoplay is
// granted on the first frame the video actually mounts.
//
// The gate is intentionally module-scoped, not React state, so the
// listener runs exactly once per page load regardless of how many
// BackgroundVideoFrame instances mount and unmount across scroll.

let unlocked = false;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const flip = () => {
    if (unlocked) return;
    unlocked = true;
    listeners.forEach((fn) => fn());
    listeners.clear();
    document.removeEventListener("touchstart", flip);
    document.removeEventListener("touchend", flip);
    document.removeEventListener("click", flip);
    document.removeEventListener("pointerdown", flip);
    document.removeEventListener("scroll", flip);
    document.removeEventListener("wheel", flip);
    document.removeEventListener("keydown", flip);
  };
  // `passive: true` on the gesture-detection listeners — we never
  // preventDefault here, just observe.  `once: true` is omitted
  // because we want each listener to detach explicitly inside flip()
  // (so all of them go away in one pass when any one fires) rather
  // than relying on each event firing for that to happen.
  document.addEventListener("touchstart", flip, { passive: true });
  document.addEventListener("touchend", flip, { passive: true });
  document.addEventListener("click", flip);
  document.addEventListener("pointerdown", flip);
  document.addEventListener("scroll", flip, { passive: true });
  document.addEventListener("wheel", flip, { passive: true });
  document.addEventListener("keydown", flip);
}

export function isGestureUnlocked(): boolean {
  return unlocked;
}

export function useGestureUnlock(): boolean {
  const [u, setU] = useState(unlocked);
  useEffect(() => {
    if (unlocked) {
      if (!u) setU(true);
      return;
    }
    const fn = () => setU(true);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
    // u is intentionally omitted — re-running the effect when u
    // flips is a no-op (we already returned at the top in that
    // case) and re-running risks double-subscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return u;
}
