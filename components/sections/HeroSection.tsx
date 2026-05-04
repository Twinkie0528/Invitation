"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import { useLoadGate } from "@/hooks/useLoadGate";
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
  // The lockup stays invisible until LoadingOverlay finishes its FLIP
  // transition — the static logo cross-fades in at the exact position
  // the overlay logo flew to.
  const { introDone } = useLoadGate();

  // Continuous typewriter for the centre block: each line lands the
  // moment the previous one settles.  String steps are word-counted by
  // useSequentialDelays; the script flourish + scroll cue are inline
  // opacity/transform transitions, so they appear here as their literal
  // animation durations (900 ms / 600 ms).
  // Reveal order: UNITEL GROUP → is pleased to invite → "to an
  // exclusive evening" PNG → scroll cue → NAME (calligraphy zoom-in
  // arrives LAST, after every other element on screen, so the guest's
  // name is the climactic moment of the hero composition).
  // Reveal order — UNITEL GROUP → is pleased to invite →
  // PLACEHOLDER ("lorem ipsum") → "to an exclusive evening" →
  // scroll cue.  Every step is a literal duration (no
  // word-counted typewriter); each line resolves with the same
  // fade-in pattern (opacity + blur + scale convergence) used
  // on the RSVP scene so the whole site reads with a single
  // unified entry treatment.  Chain steps are kept shorter than
  // each line's visual duration so reveals overlap gracefully
  // instead of waiting for full settle.
  const [
    d_unitel,
    d_invite,
    d_placeholder,
    d_evening,
    d_scroll,
  ] = useSequentialDelays(
    [
      900, // UNITEL GROUP
      900, // is pleased to invite
      900, // placeholder copy (lorem ipsum)
      900, // "to an exclusive evening"
      120, // scroll cue (short fade)
    ],
    { stagger: 0, duration: 0, pause: 400 },
  );

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
  // pass so server HTML and client HTML match (synchronous client
  // detection caused a hydration mismatch where the server emitted no
  // video divs but the client emitted them on the first render).
  // The viewport flips to "mobile" / "desktop" inside the effect below
  // and the mp4 mounts on the next paint.
  const [viewport, setViewport] = useState<"mobile" | "desktop" | null>(null);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setViewport(mql.matches ? "desktop" : "mobile");
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Local "mounted" gate — flips true ONLY after the LoadingOverlay
  // hands off (`introDone === true`), so every hero reveal waits
  // until the lockup logo has finished gliding into position.  The
  // 30 ms `setTimeout` delay ensures the next paint has the static
  // hero logo committed before we kick off the text reveals — that
  // way the user sees a calm, top-down sequence: logo lands → name
  // copy fades in line by line.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, [introDone]);

  // Desktop pillar synchronisation — both <BackgroundVideoFrame>
  // instances paint the same first.mp4 source, but each one's
  // decoder boots independently, so previously the user saw the
  // left pillar appear, then the right pillar 200-500 ms later.
  // We count `onFirstFrame` callbacks from each pillar and only flip
  // `pillarsReady` true once BOTH have fired — `forceVisible={pillarsReady}`
  // then drives the opacity transition on the two videos in lockstep.
  const [pillarReadyCount, setPillarReadyCount] = useState(0);
  const pillarsReady = pillarReadyCount >= 2;
  const onPillarFirstFrame = () =>
    setPillarReadyCount((c) => Math.min(c + 1, 2));

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
      {/* Mobile asset — zoom reduced from the original 183.5 vw / 166.6
          vh design footprint per user feedback, with the new bleed
          tuned to the golden ratio (φ ≈ 1.618).  Width 161.8 vw means
          the mascot extends 30.9 vw past each viewport edge, and the
          vertical bleed splits 1 : φ (top -2 vh, bottom -45 vh) so the
          figure feels weighted toward the lower frame instead of
          floating off the top.  `overflow-hidden` on the section
          clips the bleed; the mobile shader keeps the lockup
          readable. */}
      {viewport === "mobile" && (
        <div className="absolute inset-x-0 top-0 bottom-[-15vh]">
          <BackgroundVideoFrame
            src="/media/hero/first.mp4"
            start={HERO_VIDEO_RANGE.start}
            end={HERO_VIDEO_RANGE.end}
            objectFit="cover"
            className="absolute inset-0 h-full w-full brightness-120 contrast-145 saturate-110"
          />
        </div>
      )}

      {viewport === "desktop" && (
        <>
          {/* Desktop pillars sized to the Figma `Screen PC` spec
              (1280×832 frame, asset 517×1034 = 1:2 aspect):
                width  : 517 / 1280 = 40vw
                height : 1034 / 832 = 124vh (asset is taller than the
                         viewport — overflow-hidden on the section
                         clips the excess top + bottom)
                top    : -72 / 832  = -8.65vh
                left  (right pillar) : 960 / 1280 = 75vw
                left  (left pillar)  : (-1280 + 960) mirrored = -15.4vw
                rotation (right)     : -180°  (Figma blend layer is
                         rotated, so the visible figure mirrors AND
                         flips top↔bottom relative to the left pillar).

              The two pillars therefore frame the centre copy as a
              symmetrical pair: left pillar in natural orientation,
              right pillar rotated 180°.  Brightness/contrast are
              tuned higher than before so the dust mascot reads
              clearly against the black plate (the previous values
              were too dim per user feedback). */}
          <div
            className="absolute h-[124vh] w-[36vw]"
            style={{ top: "-8.65vh", left: "-10vw" }}
          >
            <BackgroundVideoFrame
              src="/media/hero/first.mp4"
              start={HERO_VIDEO_RANGE.start}
              end={HERO_VIDEO_RANGE.end}
              objectFit="cover"
              forceVisible={pillarsReady}
              onFirstFrame={onPillarFirstFrame}
              className="absolute inset-0 h-full w-full brightness-110 contrast-110"
            />
          </div>

          <div
            className="absolute h-[124vh] w-[36vw]"
            style={{ top: "-8.65vh", left: "74vw", transform: "scaleX(-1)" }}
          >
            <BackgroundVideoFrame
              src="/media/hero/first.mp4"
              start={HERO_VIDEO_RANGE.start}
              end={HERO_VIDEO_RANGE.end}
              forceVisible={pillarsReady}
              onFirstFrame={onPillarFirstFrame}
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

      {/* Soft top-band fade behind the lockup — a smooth linear
          gradient from semi-opaque black at the top edge fading to
          transparent below, so the UNITEL 20th Anniversary mark
          gets elegant breathing room above the dust-mascot mp4
          on every viewport.  Applied on top of the mobile shader
          PNG (when present) and as the sole fade on desktop where
          the shader is hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-[18vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* The single inner wrapper carries `flex` so the existing 1024+
          desktop zoom rule in globals.css (which scopes via
          `section[data-reveal] > div.flex`) keeps working. */}
      <div className="relative z-10 flex h-full w-full">
        {/* TOP — anniversary lockup, anchored ~6–8vh from the top edge
            to match the Figma artboard's optical placement.  Lives
            INSIDE the flex wrapper so it inherits the global
            `zoom: 0.8` rule (globals.css 1024px+ scope) — without
            that zoom the lockup renders too large vs. the centre
            copy on desktop. */}
        <div className="absolute inset-x-0 top-[7vh] flex justify-center sm:top-[8vh] md:top-[6vh]">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            // Figma spec (1280×832 frame): 384.968 × 48.215 px,
            // expressed as 30vw with auto-derived height so the
            // lockup scales linearly with viewport.  The flex
            // wrapper's zoom:0.8 trims the final rendered size
            // back toward the design spec on desktop.
            className="h-8 w-auto sm:h-auto sm:w-[30vw]"
            style={{
              // Morph-in hand-off: same pattern used on the script
              // signature so the lockup feels like it's resolving
              // into focus rather than swapping in.  Three layered
              // transitions:
              //   • opacity 700 ms — matches the LoadingOverlay's
              //     HANDOFF_FADE_MS so the splash → static
              //     cross-fade stays at constant total opacity (no
              //     mid-fade dip)
              //   • blur 2600 ms — the visual "morph": the
              //     static lockup starts gauzy (8 px blur) and
              //     sharpens slowly into final clarity over 2.6 s
              //   • transform 2800 ms — gentle grow from scale
              //     0.92 to 1.0 on the same easing curve, so size
              //     and focus settle together AFTER the splash is
              //     long gone.  Reads as a single soft exhale.
              opacity: introDone ? 1 : 0,
              transform: introDone ? "scale(1)" : "scale(0.92)",
              filter: introDone ? "blur(0px)" : "blur(8px)",
              transformOrigin: "center center",
              transition:
                "opacity 700ms ease-out, transform 2800ms cubic-bezier(0.22, 1, 0.36, 1), filter 2600ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "opacity, transform, filter",
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
        <div className="absolute inset-x-0 top-[45vh] -translate-y-1/2 flex flex-col items-center px-4 text-center md:top-1/2 md:mx-auto md:max-w-[900px] md:px-0 lg:max-w-[1200px]">
          <div
            className="font-sans text-[22px] font-semibold tracking-[0.18em] text-white sm:text-[2vw] md:tracking-[0.22em]"
            style={{
              opacity: introDone ? 1 : 0,
              transform: introDone ? "scale(1)" : "scale(0.94)",
              filter: introDone ? "blur(0px)" : "blur(12px)",
              transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_unitel}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_unitel}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_unitel}ms`,
            }}
          >
            UNITEL GROUP
          </div>
          <div
            className="mt-[1.5vh] font-sans text-[16px] font-light text-white/85 sm:mt-1 sm:text-[1.5vw]"
            style={{
              opacity: introDone ? 1 : 0,
              transform: introDone ? "scale(1)" : "scale(0.96)",
              filter: introDone ? "blur(0px)" : "blur(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_invite}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_invite}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_invite}ms`,
            }}
          >
            is pleased to invite
          </div>

          {/* Placeholder copy — sits in the slot the personalised
              calligraphy used to occupy (now relocated to CEO).
              Manrope 34 px so the placeholder visually anchors the
              centre block until the user supplies the final copy. */}
          <div
            className="mt-[3vh] sm:mt-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_placeholder}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_placeholder}ms`,
            }}
          >
            <p className="block text-center font-sans text-[34px] font-normal text-white">
              lorem ipsum
            </p>
          </div>

          {/* "to an exclusive evening" — live Manrope text on every
              breakpoint.  Mobile keeps its 16 px / 0.3 em-tracked
              treatment; desktop scales up to ~20 px so the line
              occupies the same visual footprint the prior PNG
              (358×31 at w-[22vw]) used in the artboard. */}
          <div
            className="mt-[5vh] sm:mt-20"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_evening}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_evening}ms`,
            }}
          >
            <span className="block text-center font-sans text-[16px] font-light uppercase tracking-[0.3em] text-[#B7B7B7] sm:text-[20px]">
              to an exclusive evening
            </span>
          </div>
        </div>

        {/* BOTTOM — scroll cue, anchored near the bottom edge.  Desktop
            sits a touch higher to leave room for the SectionDots row
            below.  Pure visual indicator (no click handler) because
            the parent section is pointer-events-none. */}
        <div
          className="absolute inset-x-0 bottom-[6vh] flex flex-col items-center gap-2 text-white/60 md:bottom-[10vh] md:gap-1.5"
          style={{
            opacity: mounted ? 1 : 0,
            transition: `opacity 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${d_scroll}ms`,
          }}
        >
          <span className="font-sans text-[13px] md:text-base lg:text-lg">
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
