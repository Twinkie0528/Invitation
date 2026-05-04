"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useGuest } from "@/lib/guestContext";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import TopMark from "@/components/ui/TopMark";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";

// Title copy — rendered as live Manrope text inside the same
// 306×113 (mobile) / 600px-wide (desktop) box the Figma export used.
// The wrapper still drives the blur 12 → 0 + scale 0.94 → 1 entry
// transition; only the inner element changed from <Image> to <h2>.
const INVITATION_TITLE_TEXT = "This invitation is reserved exclusively for you.";
// Cosmos backdrop — galloping rider silhouette built from drifting
// stars.  Both mobile and desktop now play the mp4 (cosmos.png is
// the poster fallback for data-saver / pre-decode states).
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
    start: 0.79,
    peak: 0.85,
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
      {/* ---------- Background — cosmos rider mp4.
          Mobile and desktop each render a single BackgroundVideoFrame
          inside a positioning wrapper.  The wrapper carries explicit
          top / left / width (and height on desktop / aspectRatio on
          mobile) so the cosmos box can be nudged or resized without
          touching the inner video.

            Mobile (md:hidden) — Figma `Mobile` artboard 440 × 956
            spec, translated to viewport-relative units.  cosmos.png
            is wired as the poster fallback for data-saver users.

            Desktop (hidden md:block) — wrapper sized to nudge the
            video box down/left/right; `object-bottom` (set on the
            inner <video> via the `[&>video]:!object-bottom`
            Tailwind descendant) keeps the rider anchored to the
            box's bottom edge.

          Animation overlays were removed when the static cosmos.png
          was replaced with the mp4: the previous wrapper-level
          `cosmos-drift` / `cosmos-drift-mobile` transforms plus the
          `cosmos-shimmer` / `cosmos-pulse` light overlays were
          authored to give a static plate cinematic life, but the
          mp4 already has its own internal motion and lighting, so
          layering them on top fought the video at the compositor
          and broke the "river of stars flowing smoothly" feel.

          Colour treatment — both viewports apply
          `brightness-120 contrast-130 saturate-150` to the inner
          <video> + <img> via Tailwind descendant selectors so the
          rider's blue→silver palette reads vivid and cinematic
          instead of muted. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="pointer-events-none absolute md:hidden"
          style={{
            width: "281.13vw",
            aspectRatio: "1550 / 550",
            top: "50.33vh",
            left: "-85.64vw",
          }}
        >
          <BackgroundVideoFrame
            src={COSMOS_SRC}
            poster={COSMOS_POSTER}
            start={0.85}
            end={1.05}
            objectFit="cover"
            className="absolute inset-0 h-full w-full [&>video]:brightness-120 [&>video]:contrast-130 [&>video]:saturate-150 [&>img]:brightness-120 [&>img]:contrast-130 [&>img]:saturate-150"
          />
        </div>
        <div
          className="pointer-events-none absolute hidden md:block"
          style={{
            top: "15vh",
            left: "-4vw",
            width: "106vw",
            height: "104vh",
          }}
        >
          <BackgroundVideoFrame
            src={COSMOS_SRC}
            poster={COSMOS_POSTER}
            start={0.85}
            end={1.05}
            objectFit="cover"
            className="absolute inset-0 h-full w-full [&>video]:!object-bottom [&>video]:brightness-120 [&>video]:contrast-130 [&>video]:saturate-150 [&>img]:!object-bottom [&>img]:brightness-120 [&>img]:contrast-130 [&>img]:saturate-150"
          />
        </div>
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
            Live Manrope text rendered inside the same 306×113 (mobile)
            / 600 px-wide (desktop) box the Figma export used.  The
            wrapper drives the blur 12 → 0 + scale 0.94 → 1 entry
            transition exactly as before. */}
        <div
          className="w-[306px] sm:w-[600px]"
          style={{
            opacity: entered ? 1 : 0,
            // Header rule — blur 12 px → 0 + scale 0.94 → 1 over 2 s
            // on a smooth no-overshoot curve, matching the Urtuu /
            // Gala / CEO title treatment.
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_title}ms`,
          }}
        >
          <h2 className="text-center font-sans text-[30px] font-normal leading-[1.02] tracking-normal text-white sm:text-[58px]">
            {INVITATION_TITLE_TEXT}
          </h2>
        </div>

        {/* ---------- Mobile-only date stack ----------
            Three values flanked by two hairline rules.  This is the
            mobile Figma frame's vertical layout — desktop swaps to
            an inline single-line render below.  `sm:hidden` keeps
            this block out of the desktop layout entirely. */}
        <div
          className="mt-10 flex flex-col items-center sm:hidden"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms`,
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
          className="hidden font-sans font-bold leading-none tracking-tight sm:order-2 sm:mt-16 sm:flex sm:items-baseline sm:justify-center sm:gap-3"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_date}ms`,
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
          className="mt-10 font-sans text-[16px] font-normal leading-[1.55] text-white sm:order-3 sm:mt-14 sm:text-[22px]"
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
            transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_dress}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_dress}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_dress}ms`,
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
        <div className="mt-6 sm:order-4 sm:mt-12">
          <p
            className="w-[259px] text-center font-sans text-[16px] font-normal leading-[1.55] text-white sm:w-auto sm:max-w-[420px] sm:text-[22px] md:max-w-[540px]"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1)" : "scale(0.96)",
              filter: entered ? "blur(0px)" : "blur(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_venue}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_venue}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_venue}ms`,
            }}
          >
            {VENUE_TEXT}
          </p>
        </div>
      </div>
    </section>
  );
}
