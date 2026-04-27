"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Cinematic background — Van Gogh plays muted/loop while the section is
// in view. Lazy-mounted by BackgroundVideoFrame so it doesn't burden the
// initial page load. Same pattern as ImmersiveSection's Spirit of Japan.
// (TeamLab was tried first but its source footage carries baked-in text
// that fought with this section's overlay copy.)
const BG_VIDEO = "/media/cards/van-gogh.mp4";
const BG_POSTER = "/media/cards/van-gogh-poster.png";

// Reveal range — also drives the video play/pause window.
const REVEAL_RANGE = {
  start: 0.62,
  peak: 0.68,
  hold: 0.83,
  end: 0.88,
};

// Covers scene `urtuu` — the emotional peak with the Mongolian script logo.
export default function UrtuuSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.64);

  return (
    <section
      ref={ref}
      data-reveal
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
    >
      <div className="absolute inset-0">
        <BackgroundVideoFrame
          src={BG_VIDEO}
          poster={BG_POSTER}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          className="absolute inset-0 h-full w-full"
        />
        {/* Vignette: heavy on the left where the heading sits, lighter on
            the right so the imagery still reads. Mirrors the immersive
            section's treatment for a consistent feel between the two. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/40" />
      </div>

      <TopMark />

      <div className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col justify-center px-7 py-16 sm:px-14 sm:py-20 md:px-20 md:py-24 lg:px-28 lg:py-28">
        <div className="max-w-[660px] pt-2 sm:pt-4 md:max-w-[820px] md:pt-8">
          <RevealText
            as="div"
            className="mb-3 font-display text-[18px] font-light italic text-white/80 sm:mb-4 sm:text-[22px] md:text-[32px] lg:text-[36px]"
            stagger={60}
            duration={650}
            trigger={entered}
          >
            Introducing the
          </RevealText>
          <TypeText
            as="h2"
            className="mb-6 font-sans text-[28px] font-bold leading-[1.08] tracking-tight text-white sm:mb-8 sm:text-[40px] md:mb-10 md:text-[56px] lg:text-[68px] xl:text-[76px]"
            speed={50}
            delay={350}
            trigger={entered}
          >
            {"“The Urtuu” Immersive Experience"}
          </TypeText>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.6] text-white/95 sm:text-[16px] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={2000}
              trigger={entered}
            >
              {"Past and present converge within Urtuu, where time itself comes alive before you. Visuals, sound, and space come together as one, drawing you into the past as if you were truly there. Ancient rock carvings awaken into motion, horses neigh beyond the walls, the first telephone rings through the room, and the story of an unbroken connection unfolds beside you."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[14px] font-light leading-[1.6] text-white/95 sm:text-[16px] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={2300}
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
