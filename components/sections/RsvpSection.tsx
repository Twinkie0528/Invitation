"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Final scene — closing message only. The previous date/venue card and
// "Confirm Attendance" CTA were removed; the section now reads as a
// single quiet sign-off.
export default function RsvpSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: 0.86,
    peak: 0.92,
    hold: 1.0,
    end: 1.05,
  });
  const entered = useSceneEntered(0.88);

  return (
    <section
      ref={ref}
      data-reveal
      className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
    >
      <TopMark />

      <div className="relative flex w-full max-w-[680px] flex-col items-center px-7 text-center sm:px-12 md:max-w-[860px] lg:max-w-[1000px]">
        <RevealText
          as="div"
          className="mb-3 text-[10px] uppercase tracking-[0.36em] text-unitel-green sm:mb-5 sm:tracking-[0.42em] sm:text-[11px] md:mb-6 md:text-[13px] md:tracking-[0.5em]"
          stagger={40}
          duration={600}
          trigger={entered}
        >
          You are cordially invited
        </RevealText>
        <TypeText
          as="h2"
          className="font-display text-[30px] font-light leading-[1.12] text-white sm:text-[44px] md:text-[60px] lg:text-[76px] xl:text-[88px]"
          speed={48}
          delay={350}
          trigger={entered}
        >
          {"An evening designed\nexclusively for you"}
        </TypeText>
      </div>
    </section>
  );
}
