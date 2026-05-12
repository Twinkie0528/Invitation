"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import { LineFade, estimateLineCount } from "@/components/ui/LineFade";
import TopMark from "@/components/ui/TopMark";

const GALA_PARA_1 = "Created exclusively for you, this immersive gala dinner is designed as an evening beyond the ordinary where storytelling is not simply observed, but experienced.";
const GALA_PARA_2 = "Throughout the night, you will move through three distinct thematic settings, each offering its own atmosphere for dining and discovery.";
const GALA_PARA_3 = "Live performances unfold seamlessly around you, blending space, sound, and visuals into a continuous sensory experience. A night where you don’t just attend you step in, explore, and become part of the moment.";
const GALA_PARA_4 = "A night designed exclusively for invited guests.";

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
// Gala is page 3 (Dear → Urtuu → Gala → RSVP):
// scroll progress 0.50 → 0.76.  Reveal aligned with scene
// boundaries so the Urtuu → Gala and Gala → RSVP handoffs share
// the same minimal-overlap pattern.
const REVEAL_RANGE = {
  start: 0.50,
  peak: 0.55,
  hold: 0.73,
  end: 0.77,
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
  const entered = useSceneEntered(0.53);
  // Continuous typewriter: eyebrow → headline (inline 800 ms) → 4
  // paragraphs.  Each step starts the moment the previous one settles.
  // Reveal cadence — eyebrow → title (2 s convergence) → 1 s
  // sentinel hold → body paragraphs (continuous, only 60 ms breath
  // between them so the four lines read as one flowing letter).
  // Header chain (eyebrow → title) — body starts a short
  // `TITLE_TO_BODY_PAUSE_MS` after the title's 1.6 s fade
  // settles so the body lines feel tied to the headline rather
  // than waiting for an extra sentinel hold.
  const [d_eyebrow, d_title] = useSequentialDelays(
    [800, 1600],
    { stagger: 0, duration: 0, pause: 400 },
  );
  const TITLE_DURATION_MS = 1600;
  const TITLE_TO_BODY_PAUSE_MS = 188;
  const d_para_group = d_title + TITLE_DURATION_MS + TITLE_TO_BODY_PAUSE_MS;
  // Continuous line cascade — every paragraph shares a single
  // `delay` and offsets its internal line index by the running
  // line count of earlier paragraphs, so the four body paragraphs
  // read as one uninterrupted top-to-bottom wave (paragraph N+1
  // line 0 fires the instant paragraph N's last line ends).
  // Cadence shared with Urtuu so the two letter-cascade body sections
  // (Urtuu, Gala) read with one reveal vocabulary — tight stagger +
  // slow per-line fade with the slide-and-fade <LineFade slide /> mode.
  const LINE_STAGGER_MS = 50;
  const LINE_FADE_DURATION_MS = 2000;
  const linesP1 = estimateLineCount(GALA_PARA_1);
  const linesP2 = estimateLineCount(GALA_PARA_2);
  const linesP3 = estimateLineCount(GALA_PARA_3);
  const d_para1 = d_para_group;
  const d_para2 = d_para_group;
  const d_para3 = d_para_group;
  const d_para4 = d_para_group;
  const offset_p1 = 0;
  const offset_p2 = linesP1;
  const offset_p3 = linesP1 + linesP2;
  const offset_p4 = linesP1 + linesP2 + linesP3;

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background stack ---------- */}
      {/* Mobile container is pushed down to top-[60%] AND extended 10vh
          below the viewport edge so the bloom renders ~15 % larger
          (object-cover scales it to fill the taller virtual container)
          while the visible portion sits visibly lower on the screen.
          Net effect on mobile: bigger blossom, anchored toward the
          bottom — matches the user's Figma request.

          Desktop matches Figma `Screen PC` precisely (canvas 1124×727):
          asset 1341×574 anchored at left:177 (15.75 %), top:429 (59 %),
          bleeding 35 % past the right edge and 38 % past the bottom.
          Rotated −180° per the Figma transform — overflow-hidden on
          the <section> clips the bleed. */}
      <div className="absolute left-[-69.3vw] right-[-75.5vw] top-[64.6vh] bottom-[-12.9vh] sm:inset-x-auto sm:left-[15.75%] sm:right-[-35%] sm:top-[59%] sm:bottom-[-38%]">
        <BackgroundVideoFrame
          src={BG_VIDEO}
          poster={BG_POSTER}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          className="absolute inset-0 h-full w-full rotate-180 opacity-95 brightness-110 contrast-110"
        />
        {/* Soft fade from black into the bloom so the boundary isn't
            a hard line.  Trimmed to 12 % so the bloom reads vividly
            instead of getting washed out by an aggressive overlay. */}
        <div className="absolute inset-x-0 top-0 h-[12%] bg-gradient-to-b from-black to-transparent sm:hidden" />
      </div>

      {/* Figma shader overlay — confined to the upper text band on
          mobile so the bloom mp4 in the lower 45 % keeps reading at
          full saturation.  Without the bottom clip the shader was
          dimming the bloom along with the paragraphs and the rider
          looked muted vs the Figma reference.
          The radial mask softens the shader's hard rectangular edges
          so the mascot/bloom keep showing through along the perimeter
          — without it the dim was clipping the prettier parts of the
          video frame. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[45%] sm:hidden">
        <Image
          src="/media/common/shader.png"
          alt=""
          fill
          aria-hidden
          priority={false}
          sizes="100vw"
          className="object-cover object-top"
          style={{
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
      </div>

      {/* TopMark renders the centred mobile wordmark; on sm+ we hide
          it and drop a right-corner copy of the same wordmark to
          match the desktop Figma frame (UNITEL anchored top-right). */}
      <div className="sm:hidden">
        <TopMark />
      </div>
      <div className="pointer-events-none fixed right-6 top-5 z-40 hidden sm:block md:right-8 md:top-8 lg:right-10 lg:top-10">
        <Image
          src="/media/common/unitel-wordmark.svg"
          alt="Unitel"
          width={74}
          height={17}
          priority
          className="h-[17px] w-[74px]"
        />
      </div>

      {/* ---------- Foreground content ---------- */}
      {/* Mobile: top-aligned content (matches Figma `top: 182/210/307`
          positions) with the bloom glowing in the lower portion.
          Desktop matches Figma `Screen PC` (node 4:80): centered title
          + 535-px body column sits in the upper-middle band (eyebrow
          ~28 % from top), bloom banner underneath at top:52 %. */}
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-6 pt-[14vh] pb-[42vh] text-center sm:px-14 sm:pt-[26vh] sm:pb-[28vh] md:px-20 lg:px-28">
        <div className="w-full max-w-[347px] text-balance sm:max-w-[920px] sm:text-pretty">
          {/* Eyebrow — Figma: Manrope Regular 16px, #b7b7b7,
              letter-spacing 6.4px (= 0.4em).  No italics. */}
          <div
            className="mb-3 text-center font-sans text-[13px] font-normal tracking-[0.4em] text-[#b7b7b7] sm:mb-4 sm:text-[27px]"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.96)",
              filter: entered ? "blur(0px)" : "blur(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_eyebrow}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_eyebrow}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_eyebrow}ms`,
            }}
          >
            An Exclusive
          </div>

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
            className="mb-7 text-center font-sans text-[22px] font-bold uppercase leading-[1.2] tracking-tight sm:mb-10 sm:text-[45px] sm:leading-[1.0]"
            style={{
              backgroundImage:
                "linear-gradient(190.14deg, #46C800 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              // Particle-converge feel — blurred at 12 px and slightly
              // under-scaled at first, then resolves into focus over
              // 2 s with a smooth no-overshoot curve.  Reads as
              // cosmic dust assembling into the headline.  Drop-shadow
              // glow uses the same UNITEL green (#46C800 → rgb 70/200/0)
              // as the gradient so the bloom reinforces the headline
              // tint instead of fighting it.
              filter: entered
                ? "blur(0px) drop-shadow(0 0 18px rgba(70, 200, 0, 0.20))"
                : "blur(12px) drop-shadow(0 0 0 rgba(70, 200, 0, 0))",
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.94)",
              transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms`,
            }}
          >
            IMMERSIVE GALA<br className="sm:hidden" /> DINNER
          </h2>

          {/* Body — four short paragraphs of gala copy.  Mobile sits
              tight (space-y-2) so the whole block fits above the
              bloom; desktop opens up the rhythm. */}
          <div className="space-y-4 sm:space-y-0">
            <p className="font-sans text-[16px] font-light leading-[1.4] text-white sm:mb-6 sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
              <LineFade
                text={GALA_PARA_1}
                delay={d_para1}
                lineOffset={offset_p1}
                lineStagger={LINE_STAGGER_MS}
                duration={LINE_FADE_DURATION_MS}
                trigger={entered}
                slide
              />
            </p>
            <p className="font-sans text-[16px] font-light leading-[1.4] text-white sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
              <LineFade
                text={GALA_PARA_2}
                delay={d_para2}
                lineOffset={offset_p2}
                lineStagger={LINE_STAGGER_MS}
                duration={LINE_FADE_DURATION_MS}
                trigger={entered}
                slide
              />
            </p>
            <p className="font-sans text-[16px] font-light leading-[1.4] text-white sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
              <LineFade
                text={GALA_PARA_3}
                delay={d_para3}
                lineOffset={offset_p3}
                lineStagger={LINE_STAGGER_MS}
                duration={LINE_FADE_DURATION_MS}
                trigger={entered}
                slide
              />
            </p>
            <p className="font-sans text-[16px] font-light leading-[1.4] text-white sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
              <LineFade
                text={GALA_PARA_4}
                delay={d_para4}
                lineOffset={offset_p4}
                lineStagger={LINE_STAGGER_MS}
                duration={LINE_FADE_DURATION_MS}
                trigger={entered}
                slide
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
