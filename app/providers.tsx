"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { attachLenis } from "@/hooks/useScrollProgress";
import { markReady } from "@/lib/loadGate";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      // Custom easing — not a Lenis default. Long tail, slow landing.
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.0,
    });

    const detach = attachLenis(lenis);
    markReady("lenis");

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      detach();
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
