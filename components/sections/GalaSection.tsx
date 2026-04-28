"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Covers scene `gala` — the purple/magenta bloom beat.
// The bloom GIF is rendered separately by <GalaBloom /> at the canvas
// root so it can blend with the WebGL canvas without the section's
// stacking-context isolation (mobile flicker fix).
export default function GalaSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: 0.19,
    peak: 0.25,
    hold: 0.45,
    end: 0.52,
  });
  const entered = useSceneEntered(0.21);

  return (
    <section
      ref={ref}
      data-reveal
      // Content is vertically centred on every breakpoint — the bloom
      // GIF decorates the lower portion via its own absolute layer.
      className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
    >
      <TopMark />

      {/* Mobile: content is centred horizontally (text-center + items-
          center) so the invitation reads as a poster card with the bloom
          glowing beneath. `pb-[30vh]` reserves space for that bloom so
          the flex centre lands in the UPPER part of the viewport — the
          headline + body sit comfortably above the glow rather than
          colliding with it. From sm+ the desktop split-layout returns:
          heading/body left-aligned, bloom anchored bottom-right, no
          bottom padding needed. */}
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-6 pb-[36vh] text-center sm:items-stretch sm:px-14 sm:pb-0 sm:text-left md:px-20 lg:px-28">
        <RevealText
          as="div"
          className="mb-2 font-display text-[15px] font-light italic text-white/75 sm:mb-4 sm:text-[24px] md:text-[32px] lg:text-[36px]"
          stagger={60}
          duration={650}
          trigger={entered}
        >
          An Exclusive
        </RevealText>
        <TypeText
          as="h2"
          className="mb-4 font-sans text-[26px] font-bold leading-[1.04] tracking-tight text-white sm:mb-8 sm:text-[48px] md:mb-10 md:text-[64px] lg:text-[80px] xl:text-[88px]"
          speed={55}
          delay={350}
          trigger={entered}
        >
          IMMERSIVE GALA DINNER
        </TypeText>
        <div className="mx-auto w-full max-w-[480px] space-y-3 sm:mx-0 sm:max-w-[640px] sm:space-y-5 md:max-w-[760px] md:space-y-6">
          <RevealText
            as="p"
            className="font-sans text-[13px] font-light leading-[1.5] text-white/92 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
            stagger={28}
            duration={700}
            delay={1500}
            trigger={entered}
          >
            {"Created exclusively for you, this immersive gala dinner is designed as an evening beyond the ordinary."}
          </RevealText>
          <RevealText
            as="p"
            className="font-sans text-[13px] font-light leading-[1.5] text-white/92 sm:text-[16px] sm:leading-[1.6] md:text-[20px] lg:text-[23px]"
            stagger={28}
            duration={700}
            delay={1750}
            trigger={entered}
          >
            {"Throughout the night, you will journey across three distinct thematic settings, each offering a unique atmosphere for dining and discovery. As the experience unfolds, exceptional live performances will accompany you, engaging both sight and sound in a seamless flow of art and ambiance."}
          </RevealText>
          <RevealText
            as="p"
            className="font-sans text-[11.5px] font-light leading-[1.45] text-white/80 sm:text-[14px] sm:leading-[1.55] md:text-[18px] lg:text-[20px]"
            stagger={40}
            duration={700}
            delay={2100}
            trigger={entered}
          >
            {"A night designed exclusively for invited guests."}
          </RevealText>
        </div>
      </div>
    </section>
  );
}
