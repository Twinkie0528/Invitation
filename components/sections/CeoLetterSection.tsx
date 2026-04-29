"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
// Cinematic background — Jamiyan-Sharav mascot animation, mounted
// only once the user is within scroll range.  Served from /public/media
// so the file ships through Next.js's static asset pipeline (no
// webpack /assets import — that path is gitignored on CI).
const BG_VIDEO = "/media/ceo/mascot.mp4";
// Signature SVG — `next/image` accepts a string `src` for files in
// /public; we just supply the width/height here.
const CEO_SIGNATURE_SRC = "/media/ceo/signature.svg";
// No poster — the section bg is already solid black, so we let
// BackgroundVideoFrame fall through to its plain dark stand-in until
// the mp4 mounts.  Saves ~7 MB of needless image fetch.

// Reveal range — also drives the video play/pause window.
// CEO Letter is page 4 (after Hero + Urtuu + Gala): scroll 0.64 → 0.85.
// Hold extends to 0.84 so the section stays at 100% opacity right up to
// the RSVP handoff — earlier hold values left a 5% window where the
// CEO bg-black faded enough to expose the global MainScene cosmos.
const REVEAL_RANGE = {
  start: 0.64,
  peak: 0.69,
  hold: 0.84,
  end: 0.85,
};

// Covers scene `ceo` — formal welcome letter from Jamiyan-Sharav D.
//
// Layout follows the Figma `Mobile Version` (node 6:260) frame at
// pixel-accurate proportional positions:
//
//   - Body text:  top 197 / 956  ≈ 20.6% from top
//   - Signature:  top 752 / 956  ≈ 78.6% from top
//   - Pagination: top 854 / 956  ≈ 89.3% from top
//
// We pin the body and signature blocks with absolute top-percent
// positioning so the layout maps to the same rhythm on any phone
// height instead of getting compressed by a flex column.
export default function CeoLetterSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const entered = useSceneEntered(0.66);

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background — MP4 mascot ----------
          Constrained to a vertical band leaving ~10 % of the viewport
          dark above and below.  The Figma frame keeps clear black
          space around the wordmark (top) and pagination dots (bottom),
          so the mascot fills only the central area instead of going
          full-bleed.  `object-cover` keeps the figure edge-to-edge
          horizontally inside that band. */}
      <div className="absolute inset-x-0 top-[10vh] bottom-[10vh]">
        <BackgroundVideoFrame
          src={BG_VIDEO}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          objectFit="cover"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      {/* Light dimming behind the body copy only — soft enough that
          the mascot stays clearly visible through it.  Previous
          combined gradient dimmed the figure to ~80% which made the
          mp4 read as washed out. */}
      <div className="absolute inset-x-0 top-[18%] bottom-[18%] bg-gradient-to-b from-black/15 via-transparent to-black/25" />

      {/* Figma shader overlay — pre-rendered radial darkening behind
          the letter copy so the queen mascot stops fighting the body
          text on mobile.  Authored at 440×879 (iPhone aspect); desktop
          falls back to the existing top/bottom gradient above.
          The radial mask softens the shader's hard rectangular edges
          so the mascot keeps showing through along the perimeter
          — without it the dim was clipping the prettier parts of the
          queen frame. */}
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

      <TopMark />

      {/* ---------- Body letter ----------
          Pinned at ~18% from the top of the viewport (Figma
          y=197/956).  Centred horizontally with a constrained width
          that matches Figma's 321/440 ≈ 73% mobile column.  Paragraph
          margin is `mt-2` (a single blank line) so the whole letter
          fits cleanly between the title and the signature row, even
          on shorter phones where viewport height runs ~840–880px. */}
      <div
        className="absolute inset-x-0 top-[22%] mx-auto flex w-full justify-center px-6 sm:px-14 md:px-20"
        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
      >
        {/* All five paragraphs share the same typography stack so the
            letter reads as a single voice (matches the Figma frame).
            `paraClass` collects the common classes; per-paragraph
            margin-tops drive the rhythm. */}
        <div className="w-full max-w-[360px] text-center sm:max-w-[500px] md:max-w-[600px]">
          <RevealText
            as="p"
            className="text-[15px] font-normal leading-[1.5] text-white sm:text-[18px] sm:leading-[1.55] md:text-[20px] md:leading-[1.6] lg:text-[22px]"
            stagger={26}
            duration={650}
            delay={300}
            trigger={entered}
          >
            {"Dear Valued Partner,"}
          </RevealText>
          <RevealText
            as="p"
            className="text-[15px] font-normal leading-[1.5] text-white sm:text-[18px] sm:leading-[1.55] md:text-[20px] md:leading-[1.6] lg:text-[22px]"
            stagger={26}
            duration={650}
            delay={500}
            trigger={entered}
          >
            {"I am proud to acknowledge the role you have played in shaping this journey."}
          </RevealText>
          <RevealText
            as="p"
            className="mt-5 text-[15px] font-normal leading-[1.5] text-white sm:mt-7 sm:text-[18px] sm:leading-[1.55] md:mt-8 md:text-[20px] md:leading-[1.6] lg:text-[22px]"
            stagger={24}
            duration={700}
            delay={1000}
            trigger={entered}
          >
            {"Over the past two decades, Unitel Group has played a meaningful role in advancing Mongolia’s telecommunications landscape introducing technological innovations and helping shape the evolution of connectivity across the nation."}
          </RevealText>
          <RevealText
            as="p"
            className="mt-5 text-[15px] font-normal leading-[1.5] text-white sm:mt-7 sm:text-[18px] sm:leading-[1.55] md:mt-8 md:text-[20px] md:leading-[1.6] lg:text-[22px]"
            stagger={24}
            duration={700}
            delay={1400}
            trigger={entered}
          >
            {"This 20 year milestone is not only a celebration of our journey, but an opportunity to share that progress with those who have been part of it."}
          </RevealText>
          <RevealText
            as="p"
            className="mt-5 text-[15px] font-normal leading-[1.5] text-white sm:mt-7 sm:text-[18px] sm:leading-[1.55] md:mt-8 md:text-[20px] md:leading-[1.6] lg:text-[22px]"
            stagger={24}
            duration={700}
            delay={1800}
            trigger={entered}
          >
            {"To mark this occasion, we are curating immersive experience dedicated to our customers and partners one that reflects the transformation of the industry, the milestones we have achieved together, and the future we continue to build."}
          </RevealText>
        </div>
      </div>

      {/* ---------- Signature row ----------
          Pinned at ~83% from top so it always sits clearly below the
          longest body case on a short viewport.  Figma reference is
          y=752/956 ≈ 79% but the original Figma frame is 956px tall;
          on shorter phones we push it slightly further down so the
          paragraph above never overlaps it.  Layout mirrors the
          Figma: name + title on the left, green Image5 signature
          mark to the right of it. */}
      <div
        className="absolute inset-x-0 top-[83%] mx-auto flex w-full items-center justify-center gap-4 px-6 sm:gap-6 sm:px-14 md:gap-8 md:px-20"
        style={{
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(8px)",
          transition:
            "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 2300ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 2300ms",
        }}
      >
        {/* Name + title block — Figma export values applied verbatim:
              "Jamiyan-Sharav D." — Manrope 800 (ExtraBold), 16px,
                line-height 100%, letter-spacing 0%.
              "CEO of Unitel Group" — Manrope 400 (Regular), 10px,
                line-height 100%, letter-spacing 40% (= 0.4em). */}
        <div className="text-left">
          <p
            className="text-[16px] font-extrabold text-white"
            style={{ lineHeight: 1, letterSpacing: 0 }}
          >
            Jamiyan-Sharav D.
          </p>
          <p
            className="mt-1.5 text-[10px] font-normal text-[#b7b7b7]"
            style={{ lineHeight: 1, letterSpacing: "0.4em" }}
          >
            CEO of Unitel Group
          </p>
        </div>
        {/* Signature mark — green hand-drawn SVG.  Sized to match
            Figma (107×64 mobile) and scaled with breakpoints. */}
        <Image
          src={CEO_SIGNATURE_SRC}
          alt="Jamiyan-Sharav D. signature"
          width={107}
          height={64}
          priority={false}
          className="h-[44px] w-auto sm:h-[54px] md:h-[64px]"
        />
      </div>
    </section>
  );
}
