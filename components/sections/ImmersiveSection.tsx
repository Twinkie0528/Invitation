"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Cinematic background — Spirit of Japan plays muted/loop while the
// section is in view. Mounted lazily by BackgroundVideoFrame so it never
// participates in the initial page load.
const BG_VIDEO = "/media/cards/spirit-of-japan.mp4";
const BG_POSTER = "/media/cards/spirit-of-japan-poster.png";

// Match the same scroll-progress band as useSectionReveal so the video
// plays whenever the section is on stage and pauses cleanly otherwise.
const REVEAL_RANGE = {
  start: 0.2,
  peak: 0.27,
  hold: 0.38,
  end: 0.44,
};

export default function ImmersiveSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.22);

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
            the right so the imagery still reads. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/40" />
      </div>

      <TopMark />

      <div className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col justify-center px-7 sm:px-14 md:px-20 lg:px-28">
        <RevealText
          as="div"
          className="mb-3 font-display text-[18px] font-light text-white/80 sm:mb-4 sm:text-[22px] md:text-[30px] lg:text-[34px]"
          stagger={60}
          duration={650}
          trigger={entered}
        >
          What is an
        </RevealText>
        <TypeText
          as="h2"
          className="mb-6 font-sans text-[34px] font-bold leading-[1.04] tracking-tight text-white sm:mb-8 sm:text-[48px] md:mb-10 md:text-[64px] lg:text-[80px] xl:text-[88px]"
          speed={55}
          delay={350}
          trigger={entered}
        >
          IMMERSIVE EXPERIENCE?
        </TypeText>
        <RevealText
          as="p"
          className="max-w-[640px] font-sans text-[15px] font-light leading-[1.6] text-white/95 sm:text-[16px] md:max-w-[760px] md:text-[20px] lg:text-[23px]"
          stagger={28}
          duration={700}
          delay={1500}
          trigger={entered}
        >
          {"An immersive experience is where storytelling transcends observation — and becomes something you step into. It dissolves the boundary between the audience and the narrative, engaging the senses through a seamless blend of space, sound, visuals, and technology. It is not something you watch; it is something you feel, explore, and remember."}
        </RevealText>
      </div>
    </section>
  );
}
