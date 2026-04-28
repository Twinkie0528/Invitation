"use client";

import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useGuest } from "@/lib/guestContext";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import { TypeText } from "@/components/ui/TypeText";

// Final scene — closing message only. The previous date/venue card and
// "Confirm Attendance" CTA were removed; the section now reads as a
// single quiet sign-off.
export default function RsvpSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: 0.85,
    peak: 0.91,
    hold: 1.0,
    end: 1.05,
  });
  const entered = useSceneEntered(0.87);
  const guest = useGuest();
  const guestName = guest?.name;
  const guestDate = guest?.date;

  return (
    <section
      ref={ref}
      data-reveal
      className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
    >
      <TopMark />

      <div className="relative flex w-full max-w-[680px] flex-col items-center px-7 text-center sm:px-12 md:max-w-[860px] lg:max-w-[1000px]">
        {guestName && (
          <RevealText
            as="div"
            className="mb-3 font-display text-[22px] font-light leading-[1.2] text-white sm:mb-4 sm:text-[28px] md:mb-5 md:text-[34px] lg:text-[40px]"
            stagger={50}
            duration={700}
            trigger={entered}
          >
            {guestName}
          </RevealText>
        )}
        <RevealText
          as="div"
          className="mb-3 text-[10px] uppercase tracking-[0.36em] text-unitel-green sm:mb-5 sm:tracking-[0.42em] sm:text-[11px] md:mb-6 md:text-[13px] md:tracking-[0.5em]"
          stagger={40}
          duration={600}
          delay={guestName ? 200 : 0}
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
        {guestDate && (
          <RevealText
            as="div"
            className="mt-6 text-[11px] uppercase tracking-[0.36em] text-white/85 sm:mt-8 sm:tracking-[0.42em] sm:text-[12px] md:mt-10 md:text-[14px] md:tracking-[0.5em]"
            stagger={40}
            duration={600}
            delay={1500}
            trigger={entered}
          >
            {guestDate}
          </RevealText>
        )}
      </div>
    </section>
  );
}
