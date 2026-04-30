"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useLoadGate } from "@/hooks/useLoadGate";
import { useGuestName } from "@/lib/guestContext";
import { RevealText } from "@/components/ui/RevealText";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";

// Hero is the first scene users see on page load, so the play-window
// has to start at the very top (p=0) and extend through the whole
// section reveal range so the dust-mascot mp4 keeps looping while the
// invitation copy is on screen.
const HERO_VIDEO_RANGE = { start: -0.05, end: 0.2 };

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

  // Hero script sizing — Figma spec is 180 px on desktop and 120 px on
  // mobile, but those are the *ceilings* not the actual rendered size:
  // Ingkar Janji's loose calligraphy averages ~0.35 em per glyph, so a
  // 16-char name like "Ch.Darkhanbaatar" at 180 px would span ~1000 px
  // and overflow the 640 px centre column.  We pick the largest size
  // that still fits both edges of the box and cap the Figma ideal
  // there.
  //
  //   desktop budget: 530 px (centre column max-w-[560px] minus 30 px
  //     breathing on each side, also fits the 640 px lg-column with
  //     extra room).  Result for our guest list:
  //       6-char "G.Bold"          → 180 px  (Figma ideal)
  //       9-char "R.Ganbold"       → 168 px
  //      14-char "Esteemed Guest"  → 108 px
  //      16-char "Ch.Darkhanbaatar"→  95 px
  //
  //   mobile budget: 92 vw (8 vw of horizontal padding combined),
  //     which on a 375 px iPhone is 345 px.  Result:
  //       6 chars  → 32 vw   (= 120 px on 375px = Figma ideal)
  //      14 chars  → 17.86 vw (= 67 px)
  //      16 chars  → 15.63 vw (= 59 px)
  //
  // Math.max(…, 6) holds very short names ("J.Od" = 4 chars) at the
  // 180/120-px ceiling instead of letting the formula scale them up
  // beyond the Figma spec.
  const charCount = Math.max(guestName.length, 6);
  const heroScriptDesktopPx = Math.min(
    180,
    Math.round(530 / (charCount * 0.35)),
  );
  const heroScriptMobileVw = Math.min(32, +(250 / charCount).toFixed(2));

  // Viewport-aware mount: only mount the video instances that are
  // actually visible on the current viewport.  Previously the JSX
  // shipped THREE BackgroundVideoFrame instances of `first.mp4`
  // (mobile full-bleed + two desktop pillars) and relied on Tailwind's
  // `md:hidden` / `hidden md:block` to hide the inactive set via
  // CSS — but `display:none` does NOT prevent the inner <video>
  // element from being mounted, fetching the source, or holding a
  // decoder slot.  In production this manifested as the left desktop
  // pillar intermittently rendering as black: three concurrent decoders
  // racing against the browser's autoplay throttle, with one losing
  // the race and never firing `onPlaying` (so its fade-in stayed at
  // opacity 0).  Mounting only the active set eliminates the race.
  // Initial value is `null` — render no video on the SSR/pre-hydrate
  // pass so we don't briefly mount the wrong viewport's instance and
  // trigger a hydration mismatch / mount/unmount churn.
  const [viewport, setViewport] = useState<"mobile" | "desktop" | null>(null);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setViewport(mql.matches ? "desktop" : "mobile");
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
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
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* Ambient hero mp4 — `/media/hero/first.mp4` everywhere.  The
          old asset1/asset2 split (different mp4s per viewport) was
          retired at the user's request: a single source now powers
          mobile (full-bleed) and both desktop pillars (mirrored
          pair), so there is exactly one video file shipping to the
          browser for the hero scene.

          Mobile (<md): full-bleed cover, container nudged down ~5vh
          so the dust-mascot's dense particle cap sits below the
          lockup band — the lockup overlaps only the sparse outer
          particles, matching the Figma reference's ~5% overlap.

          Desktop (≥md): two pillars — left in natural orientation,
          right mirrored on X via wrapper transform — each 40vw wide
          with -10vw outer-edge bleed so 25% slides past the
          viewport edge.  The section carries `overflow-hidden` so
          the bled-off chunk is clipped (no horizontal scrollbar).
          `objectFit: cover` because the asset has its own internal
          framing around the figure; contain would letterbox.
          `display:none` on the inactive viewport keeps each
          decoder asleep so we don't pay a triple-decode tax for
          mounting all three instances. */}
      {/* Mobile asset — sized to the Figma spec (644×1288 px, aspect
          1:2) and pinned to the top of the section, centred
          horizontally.  On every phone we ship to (320–430 wide)
          this overflows the viewport on both axes; the section's
          `overflow-hidden` clips the bleed.  The visible result is a
          dust-mascot that reads bigger and more present than the
          previous full-bleed `inset-0 cover` — which scaled the
          source down to fit and made the figure feel small.  The
          mobile shader (rendered just below) still sits over the top
          band so the lockup reads cleanly. */}
      {viewport === "mobile" && (
        <div className="absolute left-1/2 top-0 h-[1288px] w-[644px] -translate-x-1/2">
          <BackgroundVideoFrame
            src="/media/hero/first.mp4"
            start={HERO_VIDEO_RANGE.start}
            end={HERO_VIDEO_RANGE.end}
            objectFit="cover"
            className="absolute inset-0 h-full w-full brightness-110 contrast-110"
          />
        </div>
      )}

      {viewport === "desktop" && (
        <>
          {/* Desktop left pillar — natural orientation. */}
          <div className="absolute inset-y-0 left-[-10vw] h-full w-[40vw] lg:left-[-10vw] lg:w-[40vw]">
            <BackgroundVideoFrame
              src="/media/hero/first.mp4"
              start={HERO_VIDEO_RANGE.start}
              end={HERO_VIDEO_RANGE.end}
              objectFit="cover"
              className="absolute inset-0 h-full w-full brightness-110 contrast-110"
            />
          </div>

          {/* Desktop right pillar — same source, mirrored on X via the
              wrapper so the two columns read as a symmetrical pair.
              The mirror lives on the wrapper (not on the <video>
              directly) because BackgroundVideoFrame already applies
              its own translateZ(0) inline transform for the GPU pin;
              layering the flip on the parent keeps both transforms
              intact. */}
          <div
            className="absolute inset-y-0 right-[-10vw] h-full w-[40vw] lg:right-[-10vw] lg:w-[40vw]"
            style={{ transform: "scaleX(-1)" }}
          >
            <BackgroundVideoFrame
              src="/media/hero/first.mp4"
              start={HERO_VIDEO_RANGE.start}
              end={HERO_VIDEO_RANGE.end}
              objectFit="cover"
              className="absolute inset-0 h-full w-full brightness-110 contrast-110"
            />
          </div>
        </>
      )}

      {/* Lockup shader — MOBILE ONLY (md:hidden).  Soft radial
          darkening plate (440×316 source, authored by the user)
          anchored at the top of the viewport so the anniversary
          lockup reads cleanly against the busy first.mp4
          particles behind it.  Desktop does NOT use this shader —
          the desktop layout has the asset constrained to the two
          side pillars, so the centre of the viewport is already
          clean black behind the lockup.  Centred horizontally via
          `inset-x-0 + mx-auto` (works on absolutely-positioned
          elements as long as a width is set).  Sits at z-[5]:
          above the video frame (z-auto) but below the foreground
          content stack (z-10) so the lockup itself paints on top
          of the shader. */}
      <Image
        src="/media/hero/shader.png"
        alt=""
        aria-hidden
        priority
        width={440}
        height={316}
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] mx-auto h-auto w-[440px] max-w-[90vw] sm:w-[520px] md:hidden"
      />

      {/* The single inner wrapper carries `flex` so the existing 1024+
          desktop zoom rule in globals.css (which scopes via
          `section[data-reveal] > div.flex`) keeps working. */}
      <div className="relative z-10 flex h-full w-full">
        {/* TOP — anniversary lockup, anchored ~6–8vh from the top edge
            to match the Figma artboard's optical placement.  Desktop
            scales the lockup up so it reads at the same proportional
            weight against the larger centre block (the global zoom:0.8
            rule on this section's flex wrapper trims the rendered size
            back toward the design spec). */}
        <div className="absolute inset-x-0 top-[7vh] flex justify-center sm:top-[8vh] md:top-[6vh]">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            className="h-9 w-auto sm:h-10 md:h-9 lg:h-11"
            style={{
              opacity: introDone ? 1 : 0,
              transition: "opacity 220ms ease-out",
            }}
          />
        </div>

        {/* CENTRE — invitation copy, vertically centred on the viewport.
            Mobile sizes are tuned for narrow portrait phones (script
            flourish at the Figma 120px spec).  Desktop scales the
            whole copy block up — the asset2.mp4 pillars on each side
            frame the composition, and the centre needs to read at
            equivalent visual weight, so the script climbs to ~180px
            and the supporting copy steps up in proportion.  The
            global zoom:0.8 rule on this section's flex wrapper trims
            the rendered output back toward the artboard spec. */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center px-4 text-center md:mx-auto md:max-w-[560px] md:px-0 lg:max-w-[640px]">
          <RevealText
            as="div"
            className="font-sans text-[19px] font-semibold tracking-[0.18em] text-white md:text-lg md:tracking-[0.22em] lg:text-xl"
            stagger={36}
            duration={700}
            trigger={entered}
          >
            UNITEL GROUP
          </RevealText>
          <RevealText
            as="div"
            className="mt-2 font-sans text-[15px] font-light text-white/85 md:mt-1.5 md:text-sm lg:text-base"
            stagger={32}
            duration={700}
            delay={140}
            trigger={entered}
          >
            is pleased to invite
          </RevealText>

          {/* Guest name — Ingkar Janji handwriting.  Font-size is
              computed by `scriptFontSize` above (name-length-adaptive
              so the calligraphy never overflows the viewport).
              Rendered as a vertical gradient so the script reads with
              the same soft top-bright / bottom-cool cadence as the
              source.  Reveal lifts + fades the whole gesture in —
              word-staggering would fragment the calligraphy. */}
          <div
            className="mt-4 w-full font-script leading-[normal] md:mt-4 lg:mt-5
              text-[clamp(48px,var(--hero-script-mobile),120px)]
              md:text-[var(--hero-script-desktop)]"
            style={{
              ["--hero-script-mobile" as any]: `${heroScriptMobileVw}vw`,
              ["--hero-script-desktop" as any]: `${heroScriptDesktopPx}px`,
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(14px)",
              transition:
                "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1) 320ms, transform 900ms cubic-bezier(0.16, 1, 0.3, 1) 320ms",
              backgroundImage:
                "linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {guestName}
          </div>

          <RevealText
            as="div"
            className="mt-3 font-sans text-[11px] uppercase tracking-[0.34em] text-[#a8bce0] md:mt-3 md:text-[11px] md:tracking-[0.5em] lg:text-[13px]"
            stagger={26}
            duration={700}
            delay={780}
            trigger={entered}
          >
            to an exclusive evening
          </RevealText>
        </div>

        {/* BOTTOM — scroll cue, anchored near the bottom edge.  Desktop
            sits a touch higher to leave room for the SectionDots row
            below.  Pure visual indicator (no click handler) because
            the parent section is pointer-events-none. */}
        <div
          className="absolute inset-x-0 bottom-[6vh] flex flex-col items-center gap-2 text-white/60 md:bottom-[10vh] md:gap-1.5"
          style={{
            opacity: entered ? 1 : 0,
            transition: "opacity 600ms ease-out 1100ms",
          }}
        >
          <span className="font-sans text-[13px] md:text-sm lg:text-base">
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
