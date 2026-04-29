"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";

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
export default function UrtuuSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.18);

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
            REVEAL_RANGE.  The video already carries a dark background
            so we don't need a blend mode; plain `object-cover` reads
            cleanly on the section's black base. */}
        <BackgroundVideoFrame
          src={BG_VIDEO}
          poster={BG_POSTER}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          className="absolute inset-0 h-full w-full opacity-95"
        />
        {/* Vertical vignette — figure stays visible at the top + bottom
            edges (matching the Figma frame where the mascot blooms in
            from above and below) and the middle is darkened so the
            centred copy reads cleanly on top of the moving particles. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/55 to-black/75 sm:from-black/55 sm:via-black/25 sm:to-black/70" />
        {/* Desktop-only side darken so the left-aligned heading reads
            against the figure at wide widths. */}
        <div className="absolute inset-0 hidden sm:block sm:bg-gradient-to-r sm:from-black/70 sm:via-black/35 sm:to-black/15" />
        {/* Figma shader overlay — pre-rendered radial darkening behind
            the body copy so the new high-bitrate mp4 stops fighting the
            paragraphs.  Mobile-only because the asset is authored at
            440×879 (iPhone aspect); desktop reads against the existing
            side-darken gradient already declared above.
            The radial mask softens the shader's hard rectangular edges
            so the mascot/bloom keep showing through along the perimeter
            — without it the dim was clipping the prettier parts of the
            video frame. */}
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
      </div>

      <TopMark />

      {/* ---------- Foreground content ----------
          Mobile: narrow column (`max-w-[320px]`) so the body paragraphs
          break to the same rhythm as the Figma frame (5–6 short lines
          per paragraph rather than 3–4 long ones).  Desktop opens up
          again for the cinematic split-layout. */}
      <div className="absolute inset-0 mx-auto flex w-full max-w-[1320px] flex-col items-center justify-center px-6 py-8 text-center sm:items-start sm:px-14 sm:py-20 sm:text-left md:px-20 md:py-24 lg:px-28 lg:py-28">
        <div className="w-full max-w-[320px] sm:max-w-[660px] md:max-w-[820px]">
          {/* Eyebrow — Figma: 16px, color #b7b7b7, letter-spacing
              6.4px (= 0.4em).  No italics. */}
          <RevealText
            as="div"
            className="mb-3 font-sans text-[13px] font-normal uppercase tracking-[0.4em] text-[#b7b7b7] sm:mb-5 sm:text-[15px] md:text-[17px] lg:text-[19px]"
            stagger={60}
            duration={650}
            trigger={entered}
          >
            Introducing
          </RevealText>

          {/* Title — Figma confirmed:
              - font: Manrope 700, 26px (mobile)
              - line-height: 120%
              - background: linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)
              - background-clip: text + transparent fill
              Plain heading + fade+lift reveal — TypeText's nested
              spans don't propagate `background-clip: text` cleanly. */}
          <h2
            className="mb-5 font-sans text-[26px] font-bold leading-[1.2] tracking-tight sm:mb-8 sm:text-[40px] md:mb-10 md:text-[54px] lg:text-[64px] xl:text-[72px]"
            style={{
              backgroundImage:
                "linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              filter: "drop-shadow(0 0 18px rgba(115, 164, 255, 0.18))",
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(10px)",
              transition:
                "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 350ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 350ms",
            }}
          >
            {"“The Urtuu” immersive Experience"}
          </h2>

          {/* Body — two paragraphs of immersive copy. */}
          <div className="space-y-5 sm:space-y-5 md:space-y-6">
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={1500}
              trigger={entered}
            >
              {"Past and present converge within Urtuu, where time itself comes alive before you. Visuals, sound, and space come together as one, drawing you into the past as if you were truly there. Ancient rock carvings awaken into motion, horses neigh beyond the walls, the first telephone rings through the room, and the story of an unbroken connection unfolds beside you."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={1800}
              trigger={entered}
            >
              {"Unitel Group proudly presents Mongolia’s largest immersive experience in celebration of its 20th anniversary. We are honored to invite you to experience it."}
            </RevealText>
          </div>
        </div>
      </div>
    </section>
  );
}
