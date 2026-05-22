"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { markIntroDone, markReady } from "@/lib/loadGate";
import { useLoadGate } from "@/hooks/useLoadGate";

// Gate set — intentionally tiny.  The splash now shows the small
// UNITEL wordmark (not the anniversary lockup) so the gate asset is
// the wordmark itself; everything else preloads via <link rel="...">
// hints in app/layout.tsx.
const GATE_IMAGES = [
  "/media/common/Artboard%201100%201.svg",
];

const GATE_VIDEOS: string[] = [];

// Hard timeout — fall back to "ready" after 8 s so the page never
// stays locked behind the overlay.
const PRELOAD_TIMEOUT_MS = 8_000;

// Animation cadence — the splash now retires with a pure fade-out
// (no FLIP flight into the hero lockup).  The wordmark holds at
// full opacity for a beat so the user reads it deliberately, then
// fades to zero; markIntroDone fires at the end of the fade so
// downstream scenes' intro animations only kick off once the
// splash is fully gone.
const HOLD_BEFORE_FADE_MS = 800;
const FADE_OUT_MS = 700;

export default function LoadingOverlay() {
  const { ready } = useLoadGate();
  // 'loading' = wordmark visible, 'fading' = opacity tween to 0,
  // 'done' = unmounted.
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");

  // Preload the gate set in parallel; report readiness when settled.
  useEffect(() => {
    let pending = GATE_IMAGES.length + GATE_VIDEOS.length;
    let resolved = false;
    const settle = () => {
      if (resolved) return;
      pending -= 1;
      if (pending <= 0) {
        resolved = true;
        markReady("hero-images");
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        markReady("hero-images");
      }
    }, PRELOAD_TIMEOUT_MS);

    GATE_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
    });

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  // When `ready` flips, hold the wordmark for a beat then fade it out.
  // No FLIP, no measurement, no transform — just opacity.
  useEffect(() => {
    if (!ready) return;

    const fadeStart = window.setTimeout(() => {
      setPhase("fading");
    }, HOLD_BEFORE_FADE_MS);

    const finish = window.setTimeout(() => {
      markIntroDone();
      setPhase("done");
    }, HOLD_BEFORE_FADE_MS + FADE_OUT_MS);

    return () => {
      window.clearTimeout(fadeStart);
      window.clearTimeout(finish);
    };
  }, [ready]);

  // Drive a document-level data flag while the overlay still owns the page,
  // so other components can stage in/out around it (e.g. cursor effects).
  useEffect(() => {
    if (phase === "loading") return;
    document.documentElement.dataset.loaded = "true";
  }, [phase]);

  if (phase === "done") return null;

  const logoFaded = phase === "fading";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        // Backdrop is fully transparent so anything mounted underneath
        // (e.g. the global MainScene canvas) reads through the splash
        // from the very first paint.
        background: "transparent",
        // Disable interactions once the wordmark starts fading so the
        // page underneath becomes interactive immediately.
        pointerEvents: logoFaded ? "none" : "auto",
      }}
      aria-hidden={logoFaded}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transition: `opacity ${FADE_OUT_MS}ms ease-out`,
          opacity: logoFaded ? 0 : 1,
          willChange: "opacity",
        }}
      >
        <Image
          src="/media/common/Artboard%201100%201.svg"
          alt="Unitel"
          width={148}
          height={34}
          priority
          className="h-8 w-auto sm:h-12 lg:h-14"
        />
      </div>
    </div>
  );
}
