"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useGuest } from "@/lib/guestContext";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import TopMark from "@/components/ui/TopMark";
import { RevealText } from "@/components/ui/RevealText";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";

// Pre-rendered Figma title — the 4.8px blur, Manrope weight, and
// 306×113 box are baked into the PNG itself, so we just drop it in
// instead of fighting CSS blur / web-font swap drift.  Served from
// /public/media so the file ships through Next.js's static asset
// pipeline (no webpack /assets import needed; that path is gitignored
// on CI).
const INVITATION_TITLE_SRC = "/media/rsvp/invitation-title.png";
// Desktop cosmos backdrop — galloping rider silhouette built from
// drifting stars (mp4 export with cosmos.png poster fallback).
// Mobile uses the static `full.png` per the new Figma design;
// desktop keeps the original mp4 for the cinematic motion.
const COSMOS_SRC = "/media/rsvp/cosmos.mp4";
const COSMOS_POSTER = "/media/rsvp/cosmos.png";

// The CSV / guests.json schema only carries `date` (e.g. "6.18") per
// guest — the dinner time and year are the same for everyone.  If the
// schema ever grows a `time` field, swap the constant for guest?.time.
const EVENT_TIME = "18:00";
const EVENT_YEAR = "2026";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Convert "6.18" → { month: "June", day: "18" }.  Falls back to the
// raw input on the non-personalised root URL or any unexpected shape.
function parseGuestDate(raw?: string): { month: string; day: string } | null {
  if (!raw) return null;
  const [m, d] = raw.split(".");
  const monthIndex = parseInt(m, 10) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  if (!d) return null;
  return { month: MONTHS[monthIndex], day: d };
}

// Final scene — "This invitation is reserved exclusively for you" with
// the date/time card and venue line, atop a cosmos particle field of a
// galloping rider.  Layout matches Figma `Mobile Version` (node 6:297).
//
// Implementation note: the previous version pinned each row at an
// absolute `top-[NN%]` offset, which collapsed on shorter phone
// viewports — the date block grew taller than its allotted slot and
// crashed into the dress-code line.  This rewrite uses a single
// flex-column stack with controlled gaps so every element flows
// naturally from the title down through the venue, with the rider
// particles painted underneath in the lower half.
export default function RsvpSection() {
  const ref = useSectionReveal<HTMLElement>({
    start: 0.85,
    peak: 0.91,
    hold: 1.0,
    end: 1.05,
  });
  const entered = useSceneEntered(0.87);
  const guest = useGuest();
  const parsed = parseGuestDate(guest?.date);
  // Continuous typewriter for the closing scene: title → date block
  // (mobile stack / desktop inline row, both share the same delay) →
  // dress code → venue.  Each step's literal animation duration is
  // listed so the next one fires the moment the previous one settles.
  const VENUE_TEXT = "Temporary Exhibition Hall, Outdoor of the State Academic Drama Theatre.";
  // Reveal cadence — title PNG (2 s convergence) → date (2 s
  // convergence) → 1 s sentinel hold → dress code → venue.
  // Both title and date follow the HEADER rule; body items
  // (dress + venue) write continuously with only 60 ms between
  // them, like a hand-penned closing line.
  const [
    d_title,
    d_date,
    _afterDateHold,
    d_dress,
    d_venue,
  ] = useSequentialDelays(
    // Every step is now a number (literal duration) because the
    // body lines also use the same blur+scale convergence as the
    // title and date — no glyph-staggered RevealText left to
    // measure.  Cadence: title (1.6 s) → date (1.6 s) → 0.4 s
    // hold → dress (chain step 0.6 s; visual 1.4 s) → venue
    // (visual 1.4 s).  The 0.6 s chain step on dress means the
    // venue starts halfway through the dress's blur convergence,
    // so both body lines land in a soft cascade rather than two
    // discrete beats.
    [1600, 1600, 400, 600, 1400],
    { stagger: 8, duration: 220, pause: 0, initialDelay: 100 },
  );
  void _afterDateHold;
  // Fallback to the headline date from the Figma so the un-personalised
  // root URL still reads as a proper invitation.
  const month = parsed?.month ?? "June";
  const day = parsed?.day ?? "18";

  return (
    <section
      ref={ref}
      data-reveal
      // bg-black on the section itself blocks the global MainScene
      // (Galaxy / ParticleField) canvas from bleeding through.
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Background — cosmos rider PNG.
          Mobile and desktop use different layout strategies:

            Mobile (md:hidden) — Figma `Mobile` artboard 440 × 956
            spec verbatim: image is 1237 × 613 px, anchored at
            top:462 / left:-434 within the canvas.  Converted to
            viewport-relative units so it scales with phone size:
              width  : 1237 / 440 = 281.13 vw
              left   : -434 / 440 = -98.64 vw
              top    : 462 / 956  = 48.33 vh
              height : auto via aspect-ratio 1237/613 (preserves
                       the source image proportions; the section
                       carries `overflow-hidden` so any overhang
                       past the bottom edge is clipped).
            The `cosmos-drift-mobile` class layers a tiny ±0.4 %
            translate + opacity breath on top so the plate still
            feels alive without disturbing the Figma placement.

            Desktop (hidden md:block) — full-bleed `object-cover
            object-bottom` with the original `cosmos-drift`
            (scale 1.1 + 5 % Y baseline) so the rider reads
            cinematic across the wider canvas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Mobile wrapper carries the Figma-spec absolute dimensions
            (1237×613 at top:462 / left:-434 within a 440×956 canvas,
            translated to viewport-relative units).  Image inside uses
            `fill` so Next/Image fills the wrapper exactly — keeps us
            free from any intrinsic-size conflicts that prevented the
            previous direct-width approach from rendering. */}
        <div
          className="cosmos-drift-mobile pointer-events-none absolute md:hidden"
          style={{
            width: "281.13vw",
            aspectRatio: "1400 / 613",
            top: "48.33vh",
            left: "-98.64vw",
          }}
        >
          <Image
            src="/media/rsvp/full.png"
            alt=""
            fill
            aria-hidden
            priority
            unoptimized
            sizes="281vw"
            quality={100}
            className="object-cover"
          />
        </div>
        <Image
          src="/media/rsvp/full.png"
          alt=""
          fill
          aria-hidden
          priority
          unoptimized
          sizes="100vw"
          quality={100}
          className="cosmos-drift hidden object-cover object-bottom md:block"
        />
        <div className="cosmos-shimmer absolute inset-0" />
        <div className="cosmos-pulse absolute inset-0" />
      </div>

      {/* ---------- Shader plate behind the text ----------
          Same `common/shader.png` the Urtuu / CEO sections use.  The
          cosmos rider mp4 was reading right through the title + dress
          code + date row, so we drop the shader in between the video
          (z-auto) and the foreground content (z-10) and mask it with
          a radial gradient centred on the text band so the dim only
          covers the copy area while leaving the rider's outer edges
          clear.  Visible on every breakpoint because the readability
          issue affected mobile and desktop alike. */}
      <Image
        src="/media/common/shader.png"
        alt=""
        fill
        aria-hidden
        priority={false}
        sizes="100vw"
        className="pointer-events-none object-cover"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 35%, black 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 35%, black 20%, transparent 100%)",
        }}
      />

      {/* TopMark renders the centred mobile wordmark; on sm+ we hide
          it and drop a right-corner copy at 74×17 to match the
          desktop Figma frame (same pattern as Gala / CEO / Urtuu). */}
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

      {/* ---------- All foreground rows in a single flex stack ----------
          `justify-start` + `pt-[14vh]` pins the title slightly below
          the wordmark; subsequent gaps (mt-*) drive the rhythm down
          through the date block, dress-code line, and venue.  Nothing
          uses absolute %-positioning, so on any phone height the
          layout just expands or compresses gracefully without rows
          colliding. */}
      <div className="absolute inset-x-0 top-0 flex h-full w-full flex-col items-center justify-start px-6 pt-[14vh] sm:pt-[15vh]">
        {/* ---------- Title ----------
            Pre-rendered Figma export at
            /public/media/rsvp/invitation-title.png.  The 4.8px blur,
            Manrope weight, line-height, and exact 306×113 box are
            baked into the pixels so we don't have to fight CSS-blur
            or web-font swap drift. */}
        <div
          className="w-[306px] sm:w-[600px]"
          style={{
            opacity: entered ? 1 : 0,
            // Header rule — blur 12 px → 0 + scale 0.94 → 1 over 2 s
            // on a smooth no-overshoot curve, matching the Urtuu /
            // Gala / CEO title treatment.
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 1440ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms, filter 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_title}ms`,
          }}
        >
          <Image
            src={INVITATION_TITLE_SRC}
            alt="This invitation is reserved exclusively for you."
            width={306}
            height={113}
            priority={false}
            className="h-auto w-full"
          />
        </div>

        {/* ---------- Mobile-only date stack ----------
            Three values flanked by two hairline rules.  This is the
            mobile Figma frame's vertical layout — desktop swaps to
            an inline single-line render below.  `sm:hidden` keeps
            this block out of the desktop layout entirely. */}
        <div
          className="mt-7 flex flex-col items-center sm:hidden"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 1440ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms, filter 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms`,
          }}
        >
          {/* 18:00 — gradient blue→silver. */}
          <h2
            className="font-sans text-[40px] font-bold leading-none tracking-tight"
            style={{
              backgroundImage:
                "linear-gradient(190deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {EVENT_TIME}
          </h2>

          {/* Hairline above June DD. */}
          <span className="my-2 block h-px w-[170px] bg-white/85" />

          {/* Month + Day — dynamic from guest CSV. */}
          <h2 className="font-sans text-[34px] font-bold leading-none text-white">
            {month} {day}
          </h2>

          {/* Hairline below June DD. */}
          <span className="my-2 block h-px w-[170px] bg-white/85" />

          {/* 2026 — same scale as the date row. */}
          <h2 className="font-sans text-[34px] font-bold leading-none text-white">
            {EVENT_YEAR}
          </h2>
        </div>

        {/* ---------- Desktop-only date row ----------
            Single inline line `18:00 June 18, 2026` per the desktop
            Figma frame.  "18:00" keeps the gradient; month/day/year
            stay white.  Hidden on mobile (mobile uses the vertical
            stack above).  `sm:order-2` puts the date directly under
            the title (mobile-style flow), with `sm:mt-12` lifting
            the date up from the previous `sm:mt-24`. */}
        <h2
          className="hidden font-sans font-bold leading-none tracking-tight sm:order-2 sm:mt-8 sm:flex sm:items-baseline sm:justify-center sm:gap-3"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 1440ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms, filter 1600ms cubic-bezier(0.22, 1, 0.36, 1) ${d_date}ms`,
          }}
        >
          <span
            className="text-[50px] md:text-[60px] lg:text-[66px]"
            style={{
              backgroundImage:
                "linear-gradient(190deg, #73A4FF 14.69%, #E1E1E1 83.64%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {EVENT_TIME}
          </span>
          <span className="text-[44px] text-white md:text-[54px] lg:text-[58px]">
            {month} {day},
          </span>
          <span className="text-[44px] text-white md:text-[54px] lg:text-[58px]">
            {EVENT_YEAR}
          </span>
        </h2>

        {/* ---------- Dress code ----------
            "Dress code:" is bold per the Figma; the rest stays
            regular.  Desktop reorders to position 3 — date sits
            above (mobile-style flow), and the dress code follows
            with a comfortable gap (`sm:mt-10`). */}
        <p
          className="mt-7 font-sans text-[16px] font-normal leading-[1.4] text-white sm:order-3 sm:mt-10 sm:text-[22px]"
          style={{
            opacity: entered ? 1 : 0,
            // Same blur + scale convergence as the title PNG and
            // date row above — every element on this RSVP scene
            // now resolves with the same cosmic-dust-into-focus
            // animation so the closing copy reads as one unified
            // landing.  Slightly shorter durations than the
            // headers (1.2 / 1.4 s vs 1.4 / 1.6 s) so the body
            // lines settle a touch faster, per user feedback.
            transform: entered ? "scale(1)" : "scale(0.96)",
            filter: entered ? "blur(0px)" : "blur(8px)",
            transition: `opacity 1200ms cubic-bezier(0.22, 1, 0.36, 1) ${d_dress}ms, transform 1400ms cubic-bezier(0.22, 1, 0.36, 1) ${d_dress}ms, filter 1400ms cubic-bezier(0.22, 1, 0.36, 1) ${d_dress}ms`,
          }}
        >
          <span className="font-bold">Dress code:</span> Cocktail attire
        </p>

        {/* ---------- Venue ----------
            Mobile Figma spec: 259×50 box, three lines.  At 16 px font-
            size with 1.4 line-height the text wraps to exactly three
            rows.  Desktop pinned to the last position via `sm:order-4`.
            Blur + scale convergence matches the dress-code line
            above so the closing block reads as one synchronised
            reveal instead of mixing typewriter + blur effects. */}
        <div className="mt-3 sm:order-4 sm:mt-10">
          <p
            className="w-[259px] text-center font-sans text-[16px] font-normal leading-[1.4] text-white sm:w-auto sm:max-w-[420px] sm:text-[22px] md:max-w-[540px]"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.96)",
              filter: entered ? "blur(0px)" : "blur(8px)",
              transition: `opacity 1200ms cubic-bezier(0.22, 1, 0.36, 1) ${d_venue}ms, transform 1400ms cubic-bezier(0.22, 1, 0.36, 1) ${d_venue}ms, filter 1400ms cubic-bezier(0.22, 1, 0.36, 1) ${d_venue}ms`,
            }}
          >
            {VENUE_TEXT}
          </p>
        </div>
      </div>
    </section>
  );
}
