"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { formatGuestName, useGuestName } from "@/lib/guestContext";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";
import { LetterGlow, estimateLineCount } from "@/components/ui/LetterGlow";
import TopMark from "@/components/ui/TopMark";

const CEO_PARA_2 = "I am proud to acknowledge the role you have played in shaping this journey.";
const CEO_PARA_3 = "Over the past two decades, Unitel Group has played a meaningful role in advancing Mongolia’s telecommunications landscape introducing technological innovations and helping shape the evolution of connectivity across the nation.";
const CEO_PARA_4 = "This 20 year milestone is not only a celebration of our journey, but an opportunity to share that progress with those who have been part of it.";
const CEO_PARA_5 = "To mark this occasion, we are curating immersive experience dedicated to our customers and partners one that reflects the transformation of the industry, the milestones we have achieved together, and the future we continue to build.";

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
// CEO Letter is page 2 (after Hero, before Urtuu): scroll 0.16 → 0.42.
// Hold extends to 0.408 (≈ local 0.95) so the section stays at 100%
// opacity right up to the Urtuu handoff — earlier hold values left a
// gap where the CEO bg-black faded enough to expose the global
// MainScene cosmos behind it.
const REVEAL_RANGE = {
  start: 0.16,
  peak: 0.222,
  hold: 0.408,
  end: 0.42,
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
  const entered = useSceneEntered(0.18);

  // Guest name — relocated from the Hero section.  Replaces the
  // previous static "Dear Valued Partner," header.
  const rawGuestName = useGuestName();
  const guestName = rawGuestName ? formatGuestName(rawGuestName) : "Esteemed Guest";

  // Calligraphy sizing math.  Ingkar Janji averages ~0.33 em per
  // glyph, so a 14-char "Esteemed Guest" at 20 vw on a 375 px
  // phone would render ~370 px wide and overflow the CEO body
  // column (`max-w-[321px]` mobile).  The Hero's original formula
  // was tuned to a ~92 vw stage; we scale it down for the CEO's
  // tighter ~86 vw column so even 16-char names fit on one line.
  //
  // Mobile result on 375 px viewport:
  //   6 chars  "G.Bold"           → 15.0 vw =  56 px
  //  14 chars  "Esteemed Guest"   → 14.3 vw =  54 px (≈248 px wide)
  //  16 chars  "Ch.Darkhanbaatar" → 12.5 vw =  47 px (≈247 px wide)
  // All comfortably within the 321 px column.
  const charCount = Math.max(guestName.length, 6);
  const heroScriptDesktopCss = "9vw";
  const heroScriptMobileVw = Math.min(15, +(200 / charCount).toFixed(2));
  // Continuous typewriter for the letter — the five paragraphs reveal
  // one after the other instead of overlapping.  We append a 0-duration
  // sentinel step at the end so we can read back the timestamp at which
  // the chain settles; that timestamp drives the signature row's
  // inline transition (so the name + signature mark land exactly when
  // the body text finishes).
  // The personalised guest name is treated as the HEADER (blur
  // particle convergence over ~2 s) — same rhythm the static
  // "Dear Valued Partner," used to occupy.  Hardcode its delay;
  // body paragraphs run through useSequentialDelays starting 1 s
  // after the title resolves, with only 60 ms between each
  // paragraph so the four lines write themselves continuously like
  // a hand-penned letter.
  // After the closing paragraph finishes, a 1500 ms sentinel hold
  // sits between the final body line and the signature row so the
  // letter has a moment to "settle" before the closing flourish.
  // Calligraphy header lands first (delay 100 ms).  After it
  // settles, the four body paragraphs reveal as ONE continuous
  // top-to-bottom line cascade — they share the same `delay`
  // and offset their internal line index by the running line
  // count of earlier paragraphs, so the body reads as a single
  // uninterrupted wave of light from the first line of CEO_PARA_2
  // through the last line of CEO_PARA_5.  Signature lands once
  // the final line has settled.
  //
  // LINE_STAGGER + LETTER_GLOW_DURATION must mirror the
  // <LetterGlow> defaults so the signature delay calc stays
  // accurate.
  const TITLE_DURATION = 1600;
  const PAUSE_AFTER_TITLE = 800;
  const LINE_STAGGER_MS = 200;
  const LETTER_GLOW_DURATION_MS = 900;
  const SIGNATURE_SETTLE_MS = 800;
  const linesP2 = estimateLineCount(CEO_PARA_2);
  const linesP3 = estimateLineCount(CEO_PARA_3);
  const linesP4 = estimateLineCount(CEO_PARA_4);
  const linesP5 = estimateLineCount(CEO_PARA_5);
  const totalBodyLines = linesP2 + linesP3 + linesP4 + linesP5;
  const d_para1 = 100;
  const d_para_group = 100 + TITLE_DURATION + PAUSE_AFTER_TITLE;
  const d_para2 = d_para_group;
  const d_para3 = d_para_group;
  const d_para4 = d_para_group;
  const d_para5 = d_para_group;
  const offset_p2 = 0;
  const offset_p3 = linesP2;
  const offset_p4 = linesP2 + linesP3;
  const offset_p5 = linesP2 + linesP3 + linesP4;
  const d_signature =
    d_para_group +
    (totalBodyLines - 1) * LINE_STAGGER_MS +
    LETTER_GLOW_DURATION_MS +
    SIGNATURE_SETTLE_MS;

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background — MP4 mascot ----------
          The mascot.mp4 file is a PORTRAIT video (1842×2304, aspect
          0.8 — taller than wide).  Figma's 1503×746 landscape box
          was clipping the queen's head + tail because object-cover
          on a landscape container scales a portrait source to fill
          width and chops the top/bottom off.

          Fix: on desktop only, render the mascot at its natural
          portrait aspect via object-contain (so the queen's head
          and tail stay visible), in a container inset 15 vh from
          the top (clears the UNITEL wordmark) and 10 vh from the
          bottom — that vertical inset bounds the mascot height
          since portrait+contain is height-bound, both pushing the
          figure down AND shrinking it.  Opacity 25 % so letter copy
          reads cleanly.  MOBILE KEEPS object-fit:cover so the
          existing full-bleed band rendering is preserved (contain
          on mobile letterboxes the figure into a thin strip).  We
          override the inline `object-fit` on the video/img children
          via Tailwind's `!`-important arbitrary variants on sm+
          only — the BackgroundVideoFrame component doesn't expose
          a responsive prop for it. */}
      <div className="absolute inset-x-0 top-[7vh] bottom-[20vh] sm:inset-x-[-8.7%] sm:top-[8.7%] sm:bottom-[1.6%]">
        <BackgroundVideoFrame
          src={BG_VIDEO}
          start={REVEAL_RANGE.start}
          end={REVEAL_RANGE.end}
          objectFit="cover"
          className="absolute inset-0 h-full w-full brightness-125 contrast-115 sm:opacity-50 sm:[&>video]:!object-contain sm:[&>img]:!object-contain"
        />
      </div>
      {/* Strong radial dim behind the text band — replaces the
          previous gentle top/bottom linear gradient (which only
          dimmed the edges, leaving the centre — where the body
          copy reads — fighting the mascot mp4 at full strength).
          Now the centre is darkened to ~65 % black, fading out to
          transparent toward the perimeter so the mascot still shows
          along the top, bottom, and sides.  Mobile-only — desktop
          composition relies on the shader.png + section bg-black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Figma shader overlay — pre-rendered radial darkening with
          atmospheric particle texture, sits ABOVE the strong dim
          layer (so the dim does the readability heavy-lifting and
          shader.png adds the cinematic dust grain).  Mask softens
          the shader's hard rectangular edges so the mascot keeps
          showing along the perimeter.  `mix-blend-mode: multiply`
          on mobile compounds the dim — even where shader.png has
          mid-grey pixels, multiplying with the dim layer keeps
          the centre dark enough for body copy to read cleanly. */}
      <Image
        src="/media/common/shader.png"
        alt=""
        fill
        aria-hidden
        priority={false}
        sizes="100vw"
        className="pointer-events-none object-cover sm:opacity-35 sm:blur-2xl"
        style={{
          maskImage:
            "radial-gradient(ellipse 65% 55% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 55% at 50% 50%, black 30%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* TopMark renders the centred mobile wordmark; on sm+ we hide
          it and drop a right-corner copy of the same wordmark to
          match the desktop Figma frame (UNITEL anchored top-right
          at 74×17, same as the Gala / Urtuu sections). */}
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

      {/* ---------- Body letter ----------
          Mobile: pinned at ~22% from the top of the viewport (Figma
          y=197/956).  Centred horizontally with a constrained width
          that matches Figma's 321/440 ≈ 73% mobile column.
          Desktop: pinned at ~31% from top so the letter sits in the
          upper-middle band of the 1280×832 frame (matches the Figma
          desktop reference) with the signature visible underneath. */}
      <div
        className="absolute inset-x-0 top-[22%] mx-auto flex w-full justify-center px-6 sm:top-[28%] sm:px-14 md:px-20"
        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
      >
        {/* Figma `Mobile Version` text block — Width 321 / Height 521
            / Top 182 / Left 60 in the source artboard.  The previous
            `top-[19%]` (computed against a 956-tall canvas) rendered
            the block too high on real phones per user feedback;
            bumping to `top-[24%]` lands the heading at the design's
            optical position with comfortable mascot breathing room
            above and signature clearance below.
            Typography (Figma inspect):
              "Dear Valued Partner,"           — Bold 24 / lh 136 %
              whitespace span (24 px gap)      — Bold 24 / lh 100 %
              Body paragraphs 2-5              — Regular 16 / lh 100 %
            Body line-height bumped to 120 % (`leading-[1.2]`) so the
            paragraphs don't read as crammed at the new placement —
            user requested "багахан Linear space".  Desktop tier
            unchanged (sm: variants). */}
        <div className="w-full max-w-[321px] text-balance text-center sm:max-w-[920px]">
          {/* Personalised guest name — Ingkar Janji calligraphy with
              the soft blue → silver wash, lifted from the Hero
              section to anchor the letter.  Replaces the previous
              static "Dear Valued Partner," header.  Same blur 12 →
              0 + scale 0.94 → 1 entry as the surrounding section
              titles so the rhythm with the body paragraphs below is
              preserved. */}
          <div
            className="w-full font-script leading-[1] whitespace-nowrap md:leading-[normal] md:whitespace-normal
              text-[clamp(32px,var(--ceo-script-mobile),90px)]
              md:text-[var(--ceo-script-desktop)]"
            style={{
              ["--ceo-script-mobile" as any]: `${heroScriptMobileVw}vw`,
              ["--ceo-script-desktop" as any]: heroScriptDesktopCss,
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.94)",
              filter: entered ? "blur(0px)" : "blur(12px)",
              transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_para1}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_para1}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_para1}ms`,
              transformOrigin: "center center",
              backgroundImage:
                "linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {guestName}
          </div>
          {/* Body paragraphs 2–5 — Manrope Regular 16 / lh 100 % on
              mobile per the Figma spec.  The Bold 24 / lh 100 %
              entry in the inspect panel is the *whitespace* spacer
              between the header and Para 2 (a literal 24 px tall
              empty span), so the gap is rendered here as `mt-6`
              (= 1.5 rem = 24 px).  Subsequent paragraphs keep the
              same 24 px rhythm.  Desktop tier (sm:) is unchanged. */}
          <p className="mt-6 text-[16px] font-normal leading-[1.4] text-white sm:mt-10 sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
            <LetterGlow
              text={CEO_PARA_2}
              delay={d_para2}
              lineOffset={offset_p2}
              trigger={entered}
            />
          </p>
          <p className="mt-6 text-[16px] font-normal leading-[1.4] text-white sm:mt-7 sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
            <LetterGlow
              text={CEO_PARA_3}
              delay={d_para3}
              lineOffset={offset_p3}
              trigger={entered}
            />
          </p>
          <p className="mt-6 text-[16px] font-normal leading-[1.4] text-white sm:mt-7 sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
            <LetterGlow
              text={CEO_PARA_4}
              delay={d_para4}
              lineOffset={offset_p4}
              trigger={entered}
            />
          </p>
          <p className="mt-6 text-[16px] font-normal leading-[1.4] text-white sm:mt-7 sm:text-[24px] sm:font-light sm:leading-[1.55] sm:text-white/90">
            <LetterGlow
              text={CEO_PARA_5}
              delay={d_para5}
              lineOffset={offset_p5}
              trigger={entered}
            />
          </p>
        </div>
      </div>

      {/* ---------- Signature row ----------
          Mobile: pinned at ~83% so it sits clearly below the longest
          body case on shorter phones.
          Desktop: pinned at ~76% (Figma y≈630/832) so it tucks
          underneath the body block with normal rhythm — the desktop
          body ends much higher than mobile because the column is
          wider and breaks fewer lines.  Layout mirrors the Figma:
          name + title on the left, green signature mark to the right. */}
      <div
        className="absolute inset-x-0 top-[85%] mx-auto flex w-full items-center justify-center gap-4 px-6 sm:top-[78%] sm:gap-6 sm:px-14 md:gap-8 md:px-20"
        style={{
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          opacity: entered ? 1 : 0,
          // Signature row reveals as a single GROUPED unit — name +
          // title + signature SVG cross-fade in together over an
          // even longer 3.2 s glide with a soft `blur(6 px) → 0`
          // ramp so the closing flourish feels like cosmic dust
          // gathering into focus, not a snap-on.  Larger initial
          // translateY (32 px) + scale 0.92 amplifies the slow
          // settle so the eye has time to register the rise.
          transform: entered ? "translateY(0) scale(1)" : "translateY(28px) scale(0.93)",
          filter: entered ? "blur(0px)" : "blur(5px)",
          transition: `opacity 2200ms cubic-bezier(0.22, 1, 0.36, 1) ${d_signature}ms, transform 2400ms cubic-bezier(0.22, 1, 0.36, 1) ${d_signature}ms, filter 2200ms cubic-bezier(0.22, 1, 0.36, 1) ${d_signature}ms`,
        }}
      >
        {/* Name + title block — Figma `Mobile Version` (canvas 440×956)
            spec: 181 × 51 box anchored at top:752 / left:74.  At
            top-[78%] the box's vertical centre lands on the design
            line.  Name + title are stacked with a 21 px gap (mt-5)
            so the inner block heights add up to the design's 51 px
            (20 + 21 + 10 = 51).  Typography matches the Figma values:
              "Jamiyansharav D." — Manrope 800 / 20 px / lh 100% / ls 0
              "CEO of Unitel Group" — Manrope 400 / 10 px / lh 100% / ls 40 % */}
        <div className="text-left">
          <p
            className="text-[20px] font-extrabold text-white sm:text-[28px] md:text-[32px]"
            style={{ lineHeight: 1, letterSpacing: 0 }}
          >
            Jamiyansharav D.
          </p>
          <p
            className="mt-1 text-[10px] font-normal text-[#b7b7b7] sm:mt-2 sm:text-[15px] md:text-[16px]"
            style={{ lineHeight: 1, letterSpacing: "0.4em" }}
          >
            CEO of Unitel Group
          </p>
        </div>
        {/* Signature mark — green hand-drawn SVG.  Mobile bumped from
            44 → 52 px per user feedback so the flourish reads more
            prominent next to the name block; desktop sizes unchanged. */}
        <Image
          src={CEO_SIGNATURE_SRC}
          alt="Jamiyansharav D. signature"
          width={107}
          height={64}
          priority={false}
          className="h-[52px] w-auto sm:h-[64px] md:h-[78px]"
        />
      </div>
    </section>
  );
}
