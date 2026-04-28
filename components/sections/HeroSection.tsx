"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useLoadGate } from "@/hooks/useLoadGate";
import { RevealText } from "@/components/ui/RevealText";

// Scene 0 → Scene 1 coverage. The hero is fully visible from p=0 (start
// negative so the reveal formula lands on hold immediately) and stays
// pinned through the hold range before collapsing into the gala scene.
//
// The dust-figure is rendered separately by <DustFigure /> at the canvas
// root so its compositing isn't isolated by this section's stacking ctx.
//
// Mobile layout: all spacing/typography scales down via Tailwind's `md:`
// prefix. The body copy column is constrained to keep line-length
// comfortable on small phones; signature row stacks vertically below the
// CEO credit when there's no horizontal room.
export default function HeroSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: -0.02,
    peak: 0.0,
    hold: 0.13,
    end: 0.19,
  });
  const entered = useSceneEntered(0);
  // The hero lockup stays invisible until LoadingOverlay finishes its
  // FLIP transition. After `introDone` fires the static logo cross-fades
  // in at exactly the same position the overlay logo flew to.
  const { introDone } = useLoadGate();

  // Body sizing scales aggressively at md/lg so the desktop hero reads
  // as a confident editorial spread, not a cramped paragraph.  Mobile
  // base is dialled tight so all three paragraphs + signature fit on
  // a typical phone viewport without colliding with the dust mascot.
  const bodyClass =
    "font-sans text-[12.5px] font-light leading-[1.55] text-white/95 sm:text-[16px] md:text-[19px] lg:text-[22px]";

  return (
    <section
      ref={ref}
      data-reveal
      // Mobile: align content to the top with explicit padding so it
      // sits just below the dust mascot — vertical-centring pushes the
      // signature off-screen on shorter phone viewports.  Desktop
      // (md+) keeps the original optical-centre composition.
      className="pointer-events-none fixed inset-0 z-20 flex items-start justify-center pt-[32vh] md:items-center md:pt-0"
    >
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col px-6 sm:px-14 md:px-20 lg:px-28">
        <div className="mb-3 flex justify-center sm:mb-8 md:mb-14">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            className="h-6 w-auto sm:h-9 md:h-14 lg:h-16"
            style={{
              opacity: introDone ? 1 : 0,
              transition: "opacity 220ms ease-out",
            }}
          />
        </div>

        <div className="max-w-[560px] space-y-2.5 sm:space-y-4 md:max-w-[680px] md:space-y-6 lg:max-w-[720px]">
          <RevealText
            as="p"
            className={bodyClass}
            stagger={32}
            duration={700}
            trigger={entered}
          >
            {"Over the past two decades, Unitel Group has played a meaningful role in advancing Mongolia’s telecommunications landscape, introducing technological innovations and helping shape the evolution of connectivity across the nation."}
          </RevealText>
          <RevealText
            as="p"
            className={bodyClass}
            stagger={32}
            duration={700}
            delay={220}
            trigger={entered}
          >
            {"This 20 year milestone is not only a celebration of our journey, but an opportunity to share that progress with those who have been part of it."}
          </RevealText>
          <RevealText
            as="p"
            className={bodyClass}
            stagger={32}
            duration={700}
            delay={440}
            trigger={entered}
          >
            {"To mark this occasion, we are curating an immersive experience dedicated to our customers and partners — one that reflects the transformation of the industry, the milestones we have achieved together, and the future we continue to build."}
          </RevealText>
        </div>

        <div className="mt-4 flex flex-row items-center gap-3 sm:mt-10 sm:gap-6 md:mt-14">
          <div>
            <RevealText
              as="div"
              className="font-sans text-[12px] font-semibold tracking-wide text-white sm:text-[15px] md:text-[18px] lg:text-[20px]"
              stagger={50}
              duration={700}
              delay={600}
              trigger={entered}
            >
              Jamiyan-Sharav D.
            </RevealText>
            <RevealText
              as="div"
              className="mt-0.5 text-[8.5px] uppercase tracking-[0.24em] text-white/70 sm:text-[11px] sm:tracking-[0.28em] md:text-[12px] md:tracking-[0.34em]"
              stagger={28}
              duration={600}
              delay={820}
              trigger={entered}
            >
              CEO of Unitel Group
            </RevealText>
          </div>
          <Image
            src="/media/hero/signature.png"
            alt=""
            width={180}
            height={90}
            priority
            className="h-7 w-auto opacity-95 sm:h-14 md:h-16 lg:h-20"
          />
        </div>
      </div>
    </section>
  );
}
