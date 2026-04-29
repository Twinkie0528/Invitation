"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useLoadGate } from "@/hooks/useLoadGate";
import { useGuestName } from "@/lib/guestContext";
import { RevealText } from "@/components/ui/RevealText";

// Hero (scene 0) — personalised invitation.
//
// Layout uses absolute anchors rather than flex distribution so each
// landmark sits at a stable percentage of the viewport regardless of
// content length (the script flourish for "Esteemed Guest" is wider
// than for short names like "Ryechi", and a flex stack would shift the
// centre block off-axis as a result).
//
//   ~6vh   : Unitel · 20th anniversary lockup
//   50%    : "UNITEL GROUP / is pleased to invite / {Name} / to an exclusive evening"
//   ~5vh   : scroll cue ("Explore the experience below" + chevron)
//
// Mobile renders an autoplay <video> behind the copy.  Desktop falls
// through to the section's transparent backdrop (the global MainScene
// cosmos shows through).
//
// `useGuestName()` reads the slug-driven name from <GuestProvider>; on
// the un-personalised root URL it falls back to a generic line so the
// script flourish still has an anchor.
export default function HeroSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: -0.02,
    peak: 0.0,
    hold: 0.10,
    end: 0.16,
  });
  const entered = useSceneEntered(0);
  // The lockup stays invisible until LoadingOverlay finishes its FLIP
  // transition — the static logo cross-fades in at the exact position
  // the overlay logo flew to.
  const { introDone } = useLoadGate();
  const guestName = useGuestName() ?? "Esteemed Guest";

  // Some Android browsers (Mi Browser, MIUI, Samsung Internet, in-app
  // webviews) silently refuse to autoplay even with `muted playsInline` —
  // especially under data-saver / low-battery modes — and the user just
  // sees a black box because the first frame never paints.  Force a
  // programmatic .play() on mount, and if the browser blocks it, retry
  // on the first user gesture (touch/scroll/click) which counts as the
  // activation needed for the autoplay policy.  Also set Tencent X5 /
  // Mi Browser hints that prevent the video tag from being hijacked into
  // a native fullscreen player.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.setAttribute("x5-video-player-type", "h5-page");
    video.setAttribute("x5-video-player-fullscreen", "false");
    video.setAttribute("x5-playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    tryPlay();

    const onGesture = () => {
      tryPlay();
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click", onGesture);
      document.removeEventListener("scroll", onGesture);
    };
    document.addEventListener("touchstart", onGesture, { passive: true });
    document.addEventListener("click", onGesture);
    document.addEventListener("scroll", onGesture, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click", onGesture);
      document.removeEventListener("scroll", onGesture);
    };
  }, []);

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black blocks the global MainScene cosmos canvas from
      // bleeding through the section.  Without it, any moment the
      // hero mp4 is buffering / paused / out-of-view leaves the
      // ParticleField starfield visible behind the copy — the user
      // saw "the old star effect" because the video was hidden by an
      // earlier `md:hidden` and the canvas was leaking through.
      className="pointer-events-none fixed inset-0 z-20 bg-black"
    >
      {/* Ambient hero mp4 (the new dust-mascot render).  Plays on every
          device — the previous `md:hidden` was a holdover from when the
          desktop fell back to the canvas DustFigure component, which has
          since been removed.  Without this, desktop hero loaded with no
          backdrop at all (just the global ParticleField cosmos). */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src="/media/hero/asset1.mp4"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* The single inner wrapper carries `flex` so the existing 1024+
          desktop zoom rule in globals.css (which scopes via
          `section[data-reveal] > div.flex`) keeps working. */}
      <div className="relative z-10 flex h-full w-full">
        {/* TOP — anniversary lockup, anchored ~8vh from the top edge to
            match the Figma artboard's optical placement. */}
        <div className="absolute inset-x-0 top-[7vh] flex justify-center sm:top-[8vh]">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            className="h-9 w-auto sm:h-10 md:h-14 lg:h-16"
            style={{
              opacity: introDone ? 1 : 0,
              transition: "opacity 220ms ease-out",
            }}
          />
        </div>

        {/* CENTRE — invitation copy, vertically centred on the viewport.
            Sizes mirror the Figma spec (script flourish at 120px /
            font-weight 400) so the rendered output reads at parity with
            the design when both are viewed at the same zoom. */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center px-4 text-center">
          <RevealText
            as="div"
            className="font-sans text-[19px] font-semibold tracking-[0.18em] text-white md:text-xl lg:text-2xl"
            stagger={36}
            duration={700}
            trigger={entered}
          >
            UNITEL GROUP
          </RevealText>
          <RevealText
            as="div"
            className="mt-2 font-sans text-[15px] font-light text-white/85 md:text-base lg:text-lg"
            stagger={32}
            duration={700}
            delay={140}
            trigger={entered}
          >
            is pleased to invite
          </RevealText>

          {/* Guest name — Ingkar Janji handwriting at the Figma 120px
              spec.  `clamp()` keeps narrow phones (<430px) and very
              wide names from blowing past the viewport while still
              hitting 120px on the iPhone 14 Pro Max design width.
              Rendered as a vertical gradient so the script reads with
              the same soft top-bright / bottom-cool cadence as the
              source.  Reveal lifts + fades the whole gesture in —
              word-staggering would fragment the calligraphy. */}
          <div
            className="mt-4 font-script leading-[1] tracking-tight md:mt-6 lg:mt-8"
            style={{
              fontSize: "clamp(64px, 28vw, 120px)",
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(14px)",
              transition:
                "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1) 320ms, transform 900ms cubic-bezier(0.16, 1, 0.3, 1) 320ms",
              backgroundImage:
                "linear-gradient(180deg, #e6ecff 0%, #94a8d8 60%, #6a7fb8 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              filter: "drop-shadow(0 0 22px rgba(150, 175, 230, 0.25))",
            }}
          >
            {guestName}
          </div>

          <RevealText
            as="div"
            className="mt-3 font-sans text-[11px] uppercase tracking-[0.34em] text-[#a8bce0] md:mt-4 md:text-xs md:tracking-[0.5em]"
            stagger={26}
            duration={700}
            delay={780}
            trigger={entered}
          >
            to an exclusive evening
          </RevealText>
        </div>

        {/* BOTTOM — scroll cue, anchored near the bottom edge.  Pure
            visual indicator (no click handler) because the parent
            section is pointer-events-none. */}
        <div
          className="absolute inset-x-0 bottom-[6vh] flex flex-col items-center gap-2 text-white/60 md:bottom-[7vh]"
          style={{
            opacity: entered ? 1 : 0,
            transition: "opacity 600ms ease-out 1100ms",
          }}
        >
          <span className="font-sans text-[13px] md:text-sm">
            Explore the experience below
          </span>
          <ChevronDown />
        </div>
      </div>
    </section>
  );
}

function ChevronDown() {
  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 22 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="opacity-80"
    >
      <path
        d="M1 1L11 11L21 1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
