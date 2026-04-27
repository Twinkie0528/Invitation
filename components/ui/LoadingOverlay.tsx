"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { markIntroDone, markReady } from "@/lib/loadGate";
import { useLoadGate } from "@/hooks/useLoadGate";

// Critical hero assets that must finish loading before the overlay fades.
const HERO_IMAGES = [
  "/media/hero/dust-figure.webp",
  "/media/hero/unitel-20-lockup.svg",
  "/media/hero/signature.png",
];

// Animation cadence — backdrop fades while the logo flies, then the
// overlay logo fades while the hero's static logo cross-fades in.
const BACKDROP_FADE_MS = 450;
const FLIP_DURATION_MS = 850;
const FLIP_DELAY_MS = 80;
const HANDOFF_FADE_MS = 220;

export default function LoadingOverlay() {
  const { ready } = useLoadGate();
  // 'loading' = initial overlay, 'flying' = backdrop fading + logo flying,
  // 'handoff' = logo at target, fading into hero's static logo, 'done' = unmounted.
  const [phase, setPhase] = useState<"loading" | "flying" | "handoff" | "done">("loading");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const logoWrapperRef = useRef<HTMLDivElement | null>(null);
  const flightStartedRef = useRef(false);

  // Preload critical hero images in parallel; report readiness when settled.
  useEffect(() => {
    let pending = HERO_IMAGES.length;
    const settle = () => {
      pending -= 1;
      if (pending === 0) markReady("hero-images");
    };
    HERO_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
    });
  }, []);

  // When `ready` flips, kick off the FLIP transition: measure the hero
  // lockup's bounding box and animate the overlay's logo onto it.
  useEffect(() => {
    if (!ready || flightStartedRef.current) return;
    flightStartedRef.current = true;

    const target = document.getElementById("hero-lockup");
    const wrapper = logoWrapperRef.current;
    if (!target || !wrapper) {
      // Fallback — no hero target found (e.g. SSR mismatch). Fade overlay
      // out conventionally and immediately mark intro done so the hero's
      // static logo isn't held back.
      setPhase("flying");
      window.setTimeout(() => {
        markIntroDone();
        setPhase("done");
      }, BACKDROP_FADE_MS);
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Compute the translate + scale needed to land the overlay logo on
    // top of the hero logo's box (FLIP "Last" math).
    const dx = targetRect.left + targetRect.width / 2 - (wrapperRect.left + wrapperRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (wrapperRect.top + wrapperRect.height / 2);
    const scale = targetRect.height / wrapperRect.height;

    // IMPORTANT: keep the original `translate(-50%, -50%)` centering so
    // the logo doesn't snap to a top-left anchor at the start of the
    // flight. The new translate / scale stack on top of it.
    wrapper.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`;
    setPhase("flying");

    const handoff = window.setTimeout(() => {
      markIntroDone();
      setPhase("handoff");
    }, FLIP_DELAY_MS + FLIP_DURATION_MS);

    const finish = window.setTimeout(() => {
      setPhase("done");
    }, FLIP_DELAY_MS + FLIP_DURATION_MS + HANDOFF_FADE_MS);

    return () => {
      window.clearTimeout(handoff);
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

  const backdropFaded = phase !== "loading";
  const logoFaded = phase === "handoff";

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        // Backdrop only — the logo wrapper paints separately so it can
        // outlive the backdrop during the FLIP transition.
        background: backdropFaded ? "transparent" : "var(--bg)",
        transition: `background ${BACKDROP_FADE_MS}ms ease-out`,
        // Disable interactions once the logo starts flying — clicks should
        // hit the page underneath, not the overlay.
        pointerEvents: backdropFaded ? "none" : "auto",
      }}
      aria-hidden={backdropFaded}
    >
      <div
        ref={logoWrapperRef}
        style={{
          position: "absolute",
          // The wrapper sits at the centre of the viewport via `top: 50%
          // / left: 50%` plus the `translate(-50%, -50%)` half-of-self
          // shift in the transform. The FLIP effect re-applies that same
          // centering before its translate/scale so the logo never snaps
          // off-centre at the start of the flight.
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(1)",
          transformOrigin: "center center",
          transition: `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${FLIP_DELAY_MS}ms, opacity ${HANDOFF_FADE_MS}ms ease-out`,
          opacity: logoFaded ? 0 : 1,
          willChange: "transform, opacity",
        }}
      >
        <Image
          src="/media/hero/unitel-20-lockup.svg"
          alt="Unitel 20"
          width={420}
          height={46}
          priority
          // Sized to match the hero lockup's md+ size (h-12 = 48px). The
          // FLIP scale handles smaller screens automatically because the
          // target rect is measured per-viewport.
          className="h-12 w-auto"
        />
      </div>
    </div>
  );
}
