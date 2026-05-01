"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { attachLenis, subscribeScene } from "@/hooks/useScrollProgress";
import { markReady } from "@/lib/loadGate";
import {
  getMaxAllowedProgress,
  loadVisitedFromStorage,
  setLockEnabled,
  tryLockScene,
} from "@/lib/sceneLock";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Disable the browser's scroll-restoration heuristic — by
    // default Chrome / Firefox / Safari try to put the user back
    // where they last scrolled to, which fights Lenis's idea of
    // "page just loaded, progress = 0" and produces the jarring
    // "snaps back to the previous position the moment I touch the
    // wheel" effect users were seeing on refresh.  Setting this to
    // `manual` tells the browser to leave scroll position alone;
    // we then `scrollTo(0, 0)` to guarantee a clean top-of-page
    // start every time.
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    // Hydrate the visited-scenes memo before Lenis fires its first
    // scroll event so a returning guest's already-seen sections
    // unlock instantly.
    loadVisitedFromStorage();

    // The cap values in `sceneLock.ts` were measured against the
    // mobile scroll layout — desktop has its own scroll mapping
    // that we haven't characterised, so the lock is gated to
    // viewports below the `sm` breakpoint (768 px).  A `change`
    // listener handles the unlikely case of a guest rotating
    // their tablet between portrait/landscape mid-session.
    const mobileMql = window.matchMedia("(max-width: 767px)");
    setLockEnabled(mobileMql.matches);
    const onMobileChange = (e: MediaQueryListEvent) => {
      setLockEnabled(e.matches);
    };
    mobileMql.addEventListener("change", onMobileChange);

    const lenis = new Lenis({
      duration: 1.4,
      // Custom easing — not a Lenis default. Long tail, slow landing.
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.0,
    });

    const detach = attachLenis(lenis);
    // Lenis sometimes inherits the browser's pre-restoration scroll
    // value before our `scrollTo(0, 0)` above takes effect — force
    // its internal state to 0 so the first frame paints at the top
    // of the hero, not at the user's last-session position.
    lenis.scrollTo(0, { immediate: true, force: true });
    markReady("lenis");

    // Scene → lock dispatcher.  Whenever the active scroll scene
    // changes, ask the lock module whether to hold the user inside
    // the new section while its reveal animations play.
    let lastScene: string | null = null;
    const unsubScene = subscribeScene(({ active }) => {
      if (active === lastScene) return;
      lastScene = active;
      tryLockScene(active);
    });

    // Boundary-clamp scroll handler — user CAN scroll within the
    // current section freely, but if their wheel / touch / keyboard
    // input pushes scroll progress past the locked scene's end,
    // we instantly snap back to the boundary.  Unlike `lenis.stop()`,
    // this lets them re-read the headline / scroll back to the top
    // of the section while the lock is active; only forward
    // navigation past the section is blocked.
    const onScroll = ({ progress }: { progress: number }) => {
      const max = getMaxAllowedProgress();
      if (progress > max) {
        // `lenis.limit` is the total scrollable distance in pixels.
        // Multiplying by `max` gives the pixel position that
        // corresponds to the locked scene's end progress.
        const limit = (lenis as unknown as { limit: number }).limit;
        if (typeof limit === "number" && limit > 0) {
          lenis.scrollTo(max * limit, {
            immediate: true,
            force: true,
            lock: true,
          });
        }
      }
    };
    lenis.on("scroll", onScroll);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      detach();
      unsubScene();
      mobileMql.removeEventListener("change", onMobileChange);
      lenis.off("scroll", onScroll);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
