"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Cinematic background — Spirit of Japan plays muted/loop while the
// section is in view. Lazy-mounted by BackgroundVideoFrame so it doesn't
// burden the initial page load.
const BG_VIDEO = "/media/cards/spirit-of-japan.mp4";
const BG_POSTER = "/media/cards/spirit-of-japan-poster.png";

// Reveal range — also drives the video play/pause window.
const REVEAL_RANGE = {
  start: 0.52,
  peak: 0.58,
  hold: 0.81,
  end: 0.86,
};

// Covers scene `urtuu` — the emotional peak with the Mongolian script logo.
export default function UrtuuSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.53);

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
        {/* Vignette.  Mobile uses a softer, more even darken so the
            footage stays legible behind the centred copy.  sm+ reverts
            to the heavier left-biased gradient that frames the desktop
            split-layout heading. */}
        <div className="absolute inset-0 bg-black/55 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/55 sm:to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30 sm:to-black/40" />
      </div>

      <TopMark />

      <div className="absolute inset-0 mx-auto flex w-full max-w-[1320px] flex-col items-center justify-center px-6 py-8 text-center sm:items-start sm:px-14 sm:py-20 sm:text-left md:px-20 md:py-24 lg:px-28 lg:py-28">
        <div className="w-full max-w-[420px] sm:max-w-[660px] md:max-w-[820px]">
          <RevealText
            as="div"
            className="mb-2 font-display text-[15px] font-light italic text-white/80 sm:mb-4 sm:text-[22px] md:text-[32px] lg:text-[36px]"
            stagger={60}
            duration={650}
            trigger={entered}
          >
            Introducing the
          </RevealText>
          <TypeText
            as="h2"
            className="mb-4 font-sans text-[22px] font-bold leading-[1.1] tracking-tight text-white sm:mb-8 sm:text-[40px] md:mb-10 md:text-[56px] lg:text-[68px] xl:text-[76px]"
            speed={50}
            delay={350}
            trigger={entered}
          >
            {"“The Urtuu” Immersive Experience"}
          </TypeText>
          <div className="space-y-3 sm:space-y-5 md:space-y-6">
            <RevealText
              as="p"
              className="font-sans text-[12.5px] font-light leading-[1.5] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
              stagger={28}
              duration={700}
              delay={2000}
              trigger={entered}
            >
              {"Past and present converge within Urtuu, where time itself comes alive before you. Visuals, sound, and space come together as one, drawing you into the past as if you were truly there. Ancient rock carvings awaken into motion, horses neigh beyond the walls, the first telephone rings through the room, and the story of an unbroken connection unfolds beside you."}
            </RevealText>
            <RevealText
              as="p"
              className="font-sans text-[12.5px] font-light leading-[1.5] text-white/95 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
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
