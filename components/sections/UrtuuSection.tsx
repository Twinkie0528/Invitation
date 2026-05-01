"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import SceneCue from "@/components/ui/SceneCue";

// UNITEL wordmark for the desktop right-corner placement.  Same SVG
// asset as TopMark, sized to match.  We render this in addition to
// TopMark on desktop and hide TopMark via `sm:hidden` so the mobile
// composition (centred wordmark) keeps reading correctly.
const WORDMARK_SRC = "/media/common/unitel-wordmark.svg";

// Cinematic background — Urtuu particle figure animation, mounted
// only once the user is within scroll range so the initial page load
// doesn't pay for a video the visitor may never reach.  Served from
// /public/media (no webpack /assets import — that path is gitignored
// on CI).
const BG_VIDEO = "/media/urtuu/urtuu-script.mp4";
// Static-frame fallback shown by BackgroundVideoFrame until the MP4
// has been mounted/decoded.  We reuse the existing animated WebP
// (its first frame paints fine through an <img>) so we don't have to
// ship a separate poster file.
const BG_POSTER = "/media/urtuu/urtuu-script.webp";

// Reveal range — also drives the video play/pause window.
// Urtuu is page 2: scroll progress 0.16 → 0.42.
const REVEAL_RANGE = {
  start: 0.16,
  peak: 0.22,
  hold: 0.37,
  end: 0.42,
};

// Covers scene `urtuu` — "The Urtuu" immersive experience reveal.
//
// Layout follows the Figma `Mobile Version` (node 6:150) and
// `Screen PC` (node 4:48) frames.
//
//   - Solid black base on the <section> itself so the global
//     MainScene cosmos/Galaxy canvas is fully hidden behind this scene.
//   - Atmospheric particle figure plays as a muted/looped MP4 via
//     BackgroundVideoFrame (lazy-mounted, scroll-gated play/pause).
//   - "Introducing" eyebrow → wide-tracked, soft-grey caps.
//   - Title — Manrope 700, 26px (mobile), gradient 215° from the
//     Figma Inspect panel (#73A4FF 14.69% → #E1E1E1 83.64%).
//   - Two body paragraphs of immersive copy.
// Body paragraph copy hoisted so `useSequentialDelays` can sum word
// counts without re-tokenising every render.
const BODY_PARA_1 = "Past and present converge within Urtuu, where time itself comes alive before you. Visuals, sound, and space come together as one, drawing you into the past as if you were truly there. Ancient rock carvings awaken into motion, horses neigh beyond the walls, the first telephone rings through the room, and the story of an unbroken connection unfolds beside you.";
const BODY_PARA_2 = "Unitel Group proudly presents Mongolia’s largest immersive experience in celebration of its 20th anniversary. We are honored to invite you to experience it.";

export default function UrtuuSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.18);
  // Chain every reveal in this section so the eyebrow → title → body
  // copy plays as one continuous typewriter.  String steps are
  // word-counted; the title is a single inline opacity/transform
  // transition so it appears here as the literal 800 ms of its
  // animation.
  // Reveal cadence — eyebrow → title (2 s convergence) → 1 s
  // sentinel hold → body paragraphs (continuous, only 0.3 s
  // breath between them).  The sentinel `1000` is a number step
  // that contributes a 1 s wait without rendering anything; the
  // small `pause: 60` between every step turns the body lines
  // into a near-continuous typewriter rather than separate beats.
  const [
    d_eyebrow,
    d_title,
    _afterTitleHold,
    d_para1,
    d_para2,
  ] = useSequentialDelays(
    ["Introducing", 1600, 320, BODY_PARA_1, BODY_PARA_2],
    { stagger: 8, duration: 220, pause: 0 },
  );
  void _afterTitleHold;

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background stack ---------- */}
      <div className="absolute inset-0">
        {/* Atmospheric figure — MP4 loops while user is within
            REVEAL_RANGE.  Mobile keeps the full-bleed cover that the
            phone Figma frame uses (mascot dominates the viewport).
            Desktop constrains the mascot to a centred column ~45vw
            wide so the script reads as a discreet centred figure
            framed by the surrounding black, matching the desktop
            Figma frame where the mascot is much smaller relative to
            the viewport than on phone. */}
        {/* Mobile: mascot anchored near the top of the section so the
            layout reads in three stacked bands — mascot at the top,
            copy block in the middle, floor plate at the bottom.  Spec
            taken from the Figma mobile frame (440×956): box is
            321×403 (aspect 47/59), positioned 21px from the section's
            top edge with 59/60 horizontal margins (so the asset is
            essentially centred at ~73 % of the viewport width and
            capped at 321px on wider phones / tablets).  `mix-blend-
            mode: screen` and `objectFit: contain` match the Figma-
            prescribed treatment — whole figure visible, dark regions
            dissolve into the black base. */}
        <div className="absolute inset-x-0 top-[21px] mx-auto flex justify-center sm:hidden">
          <div
            className="relative w-[73vw] max-w-[321px]"
            style={{
              aspectRatio: "47 / 59",
              mixBlendMode: "screen",
            }}
          >
            <BackgroundVideoFrame
              src={BG_VIDEO}
              poster={BG_POSTER}
              start={REVEAL_RANGE.start}
              end={REVEAL_RANGE.end}
              objectFit="contain"
              className="absolute inset-0 h-full w-full brightness-110 contrast-110"
            />
          </div>
        </div>

        {/* Desktop: centred mascot, sized to the Figma spec
            (472×593 px on a 1280-wide artboard ⇒ 36.9vw width,
            aspect-ratio 39/49 ≈ 0.796).  We hold the aspect ratio
            via CSS `aspectRatio` so the box auto-sizes its height
            from the responsive width without us having to maintain
            a separate vh value per breakpoint.

            `mix-blend-mode: screen` is the Figma-prescribed blend.
            On the section's pure-black base, screen with black is
            mathematically equivalent to the source video (black +
            screen × source = source), so the practical effect is
            the same as `opacity: 1` against the black plate — but
            keeping the blend mode means any later layer change
            (e.g. swapping the section base off pure black) will
            still composite the way the design specifies.

            `objectFit: contain` keeps the whole script-figure
            visible inside the frame — no cropping, exactly as the
            Figma reference shows.  Display:none on the inactive
            viewport's wrapper keeps its video decoder asleep so we
            don't pay a double-decode tax for running mobile +
            desktop instances side by side. */}
        {/* Figma spec (1280×832 frame, scales 1:1 on viewport via vw/vh):
              width  : 472 / 1280 = 37vw
              height : 593 / 832  → derived from aspect-ratio 472/593
              top    : 103 / 832  = 12.4vh
              left   : 403 / 1280 = 31.5vw
            On a 1920×1200 laptop these expand to ~708×890 / top 149 /
            left 605 — exactly the 1.5× scale the artboard implies. */}
        <div className="absolute hidden sm:block" style={{
          top: "12.4vh",
          left: "31.5vw",
          width: "37vw",
          aspectRatio: "472 / 593",
          mixBlendMode: "screen",
        }}>
          <BackgroundVideoFrame
            src={BG_VIDEO}
            poster={BG_POSTER}
            start={REVEAL_RANGE.start}
            end={REVEAL_RANGE.end}
            objectFit="contain"
            className="absolute inset-0 h-full w-full brightness-110 contrast-110"
          />
        </div>
        {/* Vertical vignette — figure stays visible at the top + bottom
            edges (matching the Figma frame where the mascot blooms in
            from above and below) and the middle is darkened so the
            centred copy reads cleanly on top of the moving particles.
            Same gradient on mobile and desktop because the desktop
            layout is now centred too. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/55 to-black/75" />
        {/* Figma shader overlay — pre-rendered radial darkening behind
            the body copy so the new high-bitrate mp4 stops fighting
            the paragraphs.  Mobile-only because the asset is
            authored at 440×879 (iPhone aspect); desktop reads
            against the radial vignette declared right after.
            The radial mask softens the shader's hard rectangular
            edges so the mascot/bloom keep showing through along the
            perimeter. */}
        <Image
          src="/media/common/shader.png"
          alt=""
          fill
          aria-hidden
          priority={false}
          sizes="100vw"
          className="pointer-events-none object-cover sm:hidden"
          style={{
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
        {/* Desktop centre-darken vignette — soft radial dim behind the
            centred copy column so the title + body paragraphs read
            cleanly without losing the mascot's outer silhouette.
            Hidden on mobile (the shader.png above already handles
            mobile dimming with a phone-specific aspect). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 50% 55%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Floor plate — topographic horizon image
            (`/media/urtuu/floor.jpg`) overlaid at the bottom.  The
            source jpg ships with a bright greenish tint; we tone
            it down lightly so the topography reads clearly as
            faint terrain (matching the Figma reference) without
            shouting against the dark composition:
              - `mix-blend-mode: screen` — same blend the Figma
                spec calls for on the mascot, so the floor and
                mascot read as a coherent layer treatment.  Screen
                drops the truly dark regions of the floor into the
                section's black base and only lets the brighter
                topographic lines come through.
              - `opacity: 0.45` keeps the plate present without
                making it dominate.
              - `filter: saturate(0.65) brightness(0.85)` softens
                the green tint just enough to read as muted
                terrain rather than a bright photo overlay.
              - A tall top-edge fade-to-black masks the upper
                horizon so there is no hard collage line where
                the plate begins.
            `.floor-drift` runs a barely-perceptible vertical
            breathe + tiny scale pulse so the horizon feels alive
            without distracting from the centred copy. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] overflow-hidden sm:h-[42vh]"
        >
          <div className="floor-drift absolute inset-0">
            <Image
              src="/media/urtuu/floor.jpg"
              alt=""
              fill
              priority={false}
              unoptimized
              sizes="(min-width: 768px) 100vw, 110vw"
              quality={100}
              className="object-cover"
              style={{
                opacity: 0.6,
                mixBlendMode: "screen",
                // hue-rotate(70deg) shifts the source's green-tinted
                // topography toward cyan/blue so the floor matches the
                // cool palette of the other assets (mascot particles,
                // gala bloom, cosmos rider — all sit in the
                // #73A4FF → #E1E1E1 gradient family).  saturate(0.6)
                // keeps the lines readable as terrain rather than a
                // bright photo overlay.
                filter:
                  "saturate(0.6) brightness(0.95) hue-rotate(70deg)",
              }}
            />
          </div>
          {/* Colour gradient overlay — paints a subtle blue→silver
              wash so the floor reads as part of the brand palette
              (mascot / gala bloom / cosmos rider all sit in the
              #73A4FF → #E1E1E1 family).  `floor-glow` breathes the
              opacity 0.55 → 1 → 0.55 every 9 s so the plate feels
              emissive instead of flat — teamLab-style ambient
              pulse.  `mix-blend-overlay` keeps the topographic
              line detail visible underneath. */}
          <div
            aria-hidden
            className="floor-glow pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(115, 164, 255, 0.22) 45%, rgba(225, 225, 225, 0.16) 100%)",
            }}
          />
          {/* Shimmer pass — a soft cyan light strip slides diagonally
              across the floor every 14 s, mimicking the moving light
              washes teamLab uses on their projected floors.  Sits on
              its own `mix-blend-mode: screen` layer (declared in the
              keyframes) so it adds light to the bright topographic
              lines without darkening the surrounding plate. */}
          <div
            aria-hidden
            className="floor-shimmer pointer-events-none absolute inset-0"
          />
          {/* Top fade — pull the plate into the section's dark base.
              Mobile: shorter fade (h-[40%]) so MORE of the floor's
              topographic terrain reads as visible band — fixes the
              "empty black space between body and floor" issue.
              Desktop: keep the gentler h-[60%] fade so the floor sits
              as a soft horizon under the centred copy. */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black via-black/75 to-transparent sm:h-[60%]" />
        </div>
      </div>

      {/* TopMark renders the centred mobile wordmark; on sm+ we hide
          it and drop a right-corner copy of the same wordmark to
          match the desktop Figma frame. */}
      <div className="sm:hidden">
        <TopMark />
      </div>
      <div className="pointer-events-none fixed right-6 top-5 z-40 hidden sm:block md:right-8 md:top-8 lg:right-10 lg:top-10">
        <Image
          src={WORDMARK_SRC}
          alt="Unitel"
          width={74}
          height={17}
          priority
          className="h-[17px] w-[74px]"
        />
      </div>

      {/* ---------- Foreground content ----------
          Mobile: narrow column (`max-w-[320px]`) so the body
          paragraphs break to the same rhythm as the Figma frame.
          Desktop: centred column matching the Figma desktop frame —
          everything stacks vertically on the viewport's central axis,
          framed left + right by the mascot mp4's wings.  This
          replaces the previous left-aligned split-layout (which the
          Figma reference does not use). */}
      <div className="absolute inset-0 mx-auto flex w-full max-w-[1320px] flex-col items-center px-6 pt-[21vh] pb-8 text-center sm:justify-center sm:px-14 sm:py-16 md:px-20 md:py-20 lg:px-28 lg:py-24">
        <div className="w-full max-w-[347px] sm:max-w-[48vw]">
          {/* Eyebrow — Figma: 16px, color #b7b7b7, letter-spacing
              6.4px (= 0.4em).  No italics. */}
          <RevealText
            as="div"
            className="mb-3 text-center font-sans text-[13px] font-normal uppercase tracking-[0.4em] text-[#b7b7b7] sm:mb-4 sm:text-[20px] md:text-[21px] lg:text-[22px]"
            stagger={8}
            duration={220}
            delay={d_eyebrow}
            trigger={entered}
          >
            Introducing
          </RevealText>

          {/* Title — Figma `Mobile Version`: 22 px to match the Hero's
              "UNITEL GROUP" header weight (the user's typography rule
              for pages 2/3 keeps the gradient title at the same scale
              as the Hero lockup so the whole flow reads as one set).
              Desktop keeps the previous 40 px so it dominates the
              centred 760-px column the desktop Figma frame uses. */}
          <h2
            className="mb-5 text-center font-sans text-[22px] font-bold uppercase leading-[1.2] tracking-tight sm:mb-7 sm:text-[40px] md:mb-8"
            style={{
              backgroundImage:
                "linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              // Particle-converge feel — the title starts blurred at
              // 12 px and slightly under-scaled, then resolves into
              // focus over 2 s on a smooth, no-overshoot curve.  Reads
              // as cosmic dust gathering into the headline rather than
              // a marquee zoom-in, per user feedback.  `drop-shadow`
              // glow is eased in alongside so the focus moment lands
              // with a subtle bloom.
              filter: entered
                ? "blur(0px) drop-shadow(0 0 18px rgba(115, 164, 255, 0.18))"
                : "blur(12px) drop-shadow(0 0 0 rgba(115, 164, 255, 0))",
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.94)",
              transition: `opacity 1440ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms, filter 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms`,
            }}
          >
            {"“The Urtuu” immersive Experience"}
          </h2>

          {/* Body — two paragraphs of immersive copy. */}
          <div className="space-y-5 sm:space-y-5 md:space-y-6">
            <RevealText
              as="p"
              className="font-sans text-[16px] font-light leading-[1] text-white sm:text-[22px] sm:leading-[1.6]"
              stagger={8}
              duration={250}
              delay={d_para1}
              trigger={entered}
            >
              {BODY_PARA_1}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[16px] font-light leading-[1] text-white sm:text-[22px] sm:leading-[1.6]"
              stagger={8}
              duration={250}
              delay={d_para2}
              trigger={entered}
            >
              {BODY_PARA_2}
            </RevealText>
          </div>
        </div>
      </div>

      <SceneCue scene="urtuu" />
    </section>
  );
}
