"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";

// Cinematic background — Gala bloom particles, mounted only once
// the user is within scroll range.  Served from /public/media so the
// file ships through Next.js's static asset pipeline (no webpack
// /assets import needed; that path is gitignored on CI).
const BG_VIDEO = "/media/common/gala-bloom.mp4";
// Static-frame fallback shown by BackgroundVideoFrame until the MP4
// has been mounted/decoded.  Use the existing animated WebP — its
// first frame paints fine through an <img> and we avoid shipping a
// separate (15 MB) GIF just for a poster.
const BG_POSTER = "/media/common/gala-bloom.webp";

// Reveal range — also drives the video play/pause window.
// Gala is page 3: scroll progress 0.42 → 0.64.
const REVEAL_RANGE = {
  start: 0.42,
  peak: 0.48,
  hold: 0.59,
  end: 0.64,
};

// Covers scene `gala` — "Immersive Gala Dinner" reveal.
//
// Layout follows the Figma `Mobile Version` (node 6:241) and
// `Screen PC` (node 4:80) frames.
//
//   - Solid black base on the <section> so the global MainScene
//     cosmos/Galaxy canvas is fully hidden behind this scene.
//   - Particle bloom plays as a muted/looped MP4 via
//     BackgroundVideoFrame (lazy-mounted, scroll-gated play/pause).
//   - "An Exclusive" eyebrow → wide-tracked, soft-grey caps line.
//   - Title — Manrope 700, 26px (mobile), gradient 190.14° from the
//     Figma Inspect panel (#73A4FF 14.69% → #E1E1E1 83.64%).
//   - Multi-paragraph body — gala dinner copy.
export default function GalaSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.44);

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background stack ---------- */}
      {/* Mobile: bloom is constrained to the lower 45% of the viewport
          so the upper copy area reads on a clean black backdrop, matching
          the Figma frame where the bloom only blooms beneath the body
          paragraphs.  Desktop reverts to a full-bleed bloom for the
          cinematic split-layout. */}
      {/* Mobile container is pushed down to top-[60%] AND extended 10vh
          below the viewport edge so the bloom renders ~15 % larger
          (object-cover scales it to fill the taller virtual container)
          while the visible portion sits visibly lower on the screen.
          Net effect on mobile: bigger blossom, anchored toward the
          bottom — matches the user's Figma request. */}
      <div className="absolute inset-x-0 bottom-[-10vh] top-[60%] sm:bottom-0 sm:top-0">
        <BackgroundVideoFrame
          src={BG_VIDEO}
          poster={BG_POSTER}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          className="absolute inset-0 h-full w-full opacity-95"
        />
        {/* Soft fade from black into the bloom so the boundary isn't
            a hard line.  Trimmed to 12 % so the bloom reads vividly
            instead of getting washed out by an aggressive overlay. */}
        <div className="absolute inset-x-0 top-0 h-[12%] bg-gradient-to-b from-black to-transparent sm:hidden" />
        {/* Desktop-only side darken for the left-aligned heading on
            wide widths. */}
        <div className="absolute inset-0 hidden sm:block sm:bg-gradient-to-r sm:from-black/70 sm:via-black/35 sm:to-black/15" />
      </div>

      {/* Figma shader overlay — confined to the upper text band on
          mobile so the bloom mp4 in the lower 45 % keeps reading at
          full saturation.  Without the bottom clip the shader was
          dimming the bloom along with the paragraphs and the rider
          looked muted vs the Figma reference. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[45%] sm:hidden">
        <Image
          src="/media/common/shader.png"
          alt=""
          fill
          aria-hidden
          priority={false}
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>

      <TopMark />

      {/* ---------- Foreground content ---------- */}
      {/* Mobile: top-aligned content (matches Figma `top: 182/210/307`
          positions) with the bloom glowing in the lower portion.
          Desktop reverts to the cinematic flex-centred split-layout. */}
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-6 pt-[14vh] pb-[42vh] text-center sm:items-start sm:px-14 sm:pt-0 sm:pb-0 sm:text-left md:px-20 lg:px-28 sm:h-full sm:justify-center">
        <div className="w-full max-w-[280px] sm:max-w-[660px] md:max-w-[820px]">
          {/* Eyebrow — Figma: Manrope Regular 16px, #b7b7b7,
              letter-spacing 6.4px (= 0.4em).  No italics. */}
          <RevealText
            as="div"
            className="mb-3 font-sans text-[13px] font-normal tracking-[0.4em] text-[#b7b7b7] sm:mb-5 sm:text-[15px] md:text-[17px] lg:text-[19px]"
            stagger={60}
            duration={650}
            trigger={entered}
          >
            An Exclusive
          </RevealText>

          {/* Title — Figma confirmed:
              - font: Manrope 700, 26px (mobile)
              - line-height: 120%
              - background: linear-gradient(190.14deg, #73A4FF 14.69%, #E1E1E1 83.64%)
              - background-clip: text + transparent fill
              Plain heading + fade+lift reveal — TypeText's nested
              spans don't propagate `background-clip: text` cleanly. */}
          {/* Title — mobile breaks to two lines ("IMMERSIVE GALA" /
              "DINNER") via the inline `<br>`; on sm+ the desktop layout
              relaxes the break with `sm:hidden` so it reads as a wider
              single-line headline. */}
          <h2
            className="mb-7 font-sans text-[28px] font-bold leading-[1.15] tracking-tight sm:mb-8 sm:text-[44px] md:mb-10 md:text-[60px] lg:text-[72px] xl:text-[84px]"
            style={{
              backgroundImage:
                "linear-gradient(190.14deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
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
            IMMERSIVE GALA<br className="sm:hidden" /> DINNER
          </h2>

          {/* Body — four short paragraphs of gala copy.  Mobile sits
              tight (space-y-2) so the whole block fits above the
              bloom; desktop opens up the rhythm. */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={1500}
              trigger={entered}
            >
              {"Created exclusively for you, this immersive gala dinner is designed as an evening beyond the ordinary where storytelling is not simply observed, but experienced."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={1750}
              trigger={entered}
            >
              {"Throughout the night, you will move through three distinct thematic settings, each offering its own atmosphere for dining and discovery."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={2000}
              trigger={entered}
            >
              {"Live performances unfold seamlessly around you, blending space, sound, and visuals into a continuous sensory experience. A night where you don’t just attend—you step in, explore, and become part of the moment."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.55] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={40}
              duration={700}
              delay={2250}
              trigger={entered}
            >
              {"A night designed exclusively for invited guests."}
            </RevealText>
          </div>
        </div>
      </div>
    </section>
  );
}
