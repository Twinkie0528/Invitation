"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { markIntroDone, markReady } from "@/lib/loadGate";
import { useLoadGate } from "@/hooks/useLoadGate";

// Gate set — kept INTENTIONALLY tiny.  The overlay is just the FLIP
// runway from "page loaded" to "hero lockup in position", so the only
// asset it strictly requires is the lockup SVG itself (the FLIP target).
// Anything heavier here (posters, shaders, mp4s) used to push the
// overlay to 8-10 s on real networks — VVIP guests don't wait that
// long.  The rest of the site's assets are downloaded in parallel via
// the eager set below, with `<link rel="preload">` hints in
// app/layout.tsx so the fetches start during HTML parse.
const GATE_IMAGES = [
  "/media/hero/unitel-20-lockup.svg",
];

const GATE_VIDEOS: string[] = [];

// Eager preloading is now handled entirely by `<link rel="preload">`
// and `<link rel="prefetch">` hints in app/layout.tsx — the browser
// honours those during HTML parse, before React hydrates, AND it
// reuses the prefetched bytes when our <video> elements later mount
// and issue range requests.  The previous JS-side `fetch()` preload
// duplicated those downloads (full GET via fetch + range GETs via
// <video> = the same mp4 transferred 2-3 times, totalling ~200 MB
// per page load).  Trust the head hints and let the JS path fall
// through to the gate set only.

// Hard timeout — if the network stalls on the lockup SVG itself, fall
// back to "ready" after 8 s so the page is never permanently locked
// behind the overlay (e.g. a guest on a flaky cellular link).
const PRELOAD_TIMEOUT_MS = 8_000;

// Animation cadence — invitation pacing: warm, calm, deliberate.
// Logo holds on the splash for a full 1 s, then glides into the
// hero lockup over 2.2 s on a smooth no-overshoot curve, and the
// hand-off cross-fade runs 700 ms so the overlay logo melts into
// place rather than flicking off.  Total splash → hero handoff
// runs ~3.9 s, after which the hero text starts revealing
// top-down (gated on `introDone` in HeroSection).
const BACKDROP_FADE_MS = 900;
const FLIP_DURATION_MS = 2200;
const FLIP_DELAY_MS = 1000;
const HANDOFF_FADE_MS = 700;

export default function LoadingOverlay() {
  const { ready } = useLoadGate();
  // 'loading' = initial overlay, 'flying' = backdrop fading + logo flying,
  // 'handoff' = logo at target, fading into hero's static logo, 'done' = unmounted.
  const [phase, setPhase] = useState<"loading" | "flying" | "handoff" | "done">("loading");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const logoWrapperRef = useRef<HTMLDivElement | null>(null);
  const flightStartedRef = useRef(false);

  // Preload the gate set in parallel; report readiness when settled.
  // Eager assets fire alongside but don't gate — they just warm the
  // browser cache so later scenes have their bytes ready.
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

    // Hard timeout — never leave the user staring at the overlay if
    // one asset's request hangs.
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        markReady("hero-images");
      }
    }, PRELOAD_TIMEOUT_MS);

    // Gate images — settle on load OR error.
    GATE_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
    });

    // Gate videos — kept around for symmetry; the GATE_VIDEOS array is
    // empty by design (see the comment at the top of the module) so
    // this loop is currently a no-op.  Left in place so a future asset
    // we DO want to gate on can be added with one line.
    const gateVideos: HTMLVideoElement[] = [];
    GATE_VIDEOS.forEach((src) => {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      const cleanup = () => {
        v.removeEventListener("canplaythrough", onReady);
        v.removeEventListener("loadeddata", onReady);
        v.removeEventListener("error", onReady);
        settle();
      };
      const onReady = () => cleanup();
      v.addEventListener("canplaythrough", onReady, { once: true });
      v.addEventListener("loadeddata", onReady, { once: true });
      v.addEventListener("error", onReady, { once: true });
      v.src = src;
      gateVideos.push(v);
    });

    return () => {
      window.clearTimeout(timeoutId);
      // Tear down hidden gate videos so we don't keep their decoders
      // alive after handoff.
      for (const v of gateVideos) {
        v.removeAttribute("src");
        v.load();
      }
    };
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
    // flight.  The full chain stays `translate translate scale` to
    // exactly match the initial style — same number of ops on both
    // sides means CSS will smoothly interpolate, not discrete-swap.
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
        // Backdrop is fully transparent from the start so the hero
        // mp4 (dust mascot) reads through the splash from the very
        // first paint — per user request the background asset must
        // always be visible underneath, never covered by a solid
        // colour plate.  The logo wrapper still paints on top.
        background: "transparent",
        // Disable interactions once the logo starts flying — clicks should
        // hit the page underneath, not the overlay.
        pointerEvents: backdropFaded ? "none" : "auto",
      }}
      aria-hidden={backdropFaded}
    >
      <div
        ref={logoWrapperRef}
        // Match the desktop `zoom: 0.8` applied to the hero's section
        // flex wrapper in globals.css.  Without this, the overlay logo
        // renders at native scale while the hero static lockup renders
        // at 80 % — two visibly different sizes in the same `h-8
        // sm:w-[30vw]` class.  Mobile (< lg) has no zoom on either side
        // so it stays untouched.
        className="lg:[zoom:0.8]"
        style={{
          position: "absolute",
          // The wrapper sits at the centre of the viewport via `top: 50%
          // / left: 50%` plus the `translate(-50%, -50%)` half-of-self
          // shift in the transform. The FLIP effect re-applies that same
          // centering before its translate/scale so the logo never snaps
          // off-centre at the start of the flight.
          top: "50%",
          left: "50%",
          // Initial transform MUST have the same number of
          // operations as the post-FLIP transform (translate +
          // translate + scale).  CSS interpolates a `transform`
          // chain function-by-function only when both states have
          // matching shapes — when FROM had `translate scale`
          // (2 ops) and TO had `translate translate scale` (3 ops)
          // the browser fell back to discrete swap, which is what
          // the user kept seeing as the logo "locking" instantly
          // at the hero position with no inflate animation.
          transform: "translate(-50%, -50%) translate(0px, 0px) scale(1)",
          transformOrigin: "center center",
          transition: `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${FLIP_DELAY_MS}ms, opacity ${HANDOFF_FADE_MS}ms ease-out`,
          opacity: logoFaded ? 0 : 1,
          willChange: "transform, opacity",
        }}
      >
        <Image
          src="/media/hero/unitel-20-lockup.svg"
          alt="Unitel 20"
          width={520}
          height={58}
          priority
          // Splash logo uses the EXACT same sizing rules as the
          // hero static lockup so the FLIP transition is pure
          // translation — no scale change at all.  Same pixel
          // dimensions on both ends means the overlay→hero
          // cross-fade lines up perfectly and the user no longer
          // sees a doubled / blurry "two-logo" composite at the
          // hand-off boundary.
          className="h-8 w-auto sm:h-auto sm:w-[30vw]"
        />
      </div>
    </div>
  );
}
