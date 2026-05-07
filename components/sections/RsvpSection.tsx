"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useGuest } from "@/lib/guestContext";
import { useSequentialDelays } from "@/hooks/useSequentialDelays";
import TopMark from "@/components/ui/TopMark";
import BackgroundVideoFrame from "@/components/ui/BackgroundVideoFrame";

// Cosmos backdrop — galloping rider silhouette built from drifting
// stars.  Both mobile and desktop now play the mp4 (cosmos.png is
// the poster fallback for data-saver / pre-decode states).
const COSMOS_SRC = "/media/rsvp/cosmos.mp4";
const COSMOS_POSTER = "/media/rsvp/cosmos.png";

const VENUE_LINE_1 = "Temporary Exhibition Hall";
const VENUE_LINE_2 = "Outdoor of the State Academic Drama Theatre";

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
    start: 0.82,
    peak: 0.86,
    hold: 1.0,
    end: 1.05,
  });
  const entered = useSceneEntered(0.84);
  const guest = useGuest();
  const parsed = parseGuestDate(guest?.date);
  // Reveal cadence — preamble (1.6 s convergence) → details block
  // (1.6 s convergence, all rows share the same delay so the list
  // lands as one unit).
  const [d_preamble, d_details] = useSequentialDelays(
    [1600, 1600],
    { stagger: 8, duration: 220, pause: 200, initialDelay: 100 },
  );
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

      {/* Foreground stack — preamble at the top, EVENT DETAILS list
          in the middle, confirmation line at the bottom.  Each block
          carries its own blur+scale convergence on the shared
          `entered` gate so the three groups land in cadence. */}
      <div className="absolute inset-x-0 top-0 flex h-full w-full flex-col items-center justify-start px-6 pt-[16vh] sm:pt-[18vh]">
        {/* Preamble — note about non-transferability.  Figma spec
            (node 4:177): Manrope, 20 px / 102.04 % line-height, fixed
            318×67 px box, white base.  "non-transferable" lands at
            font-weight 700 (bold) and "especially for you" at 800
            (extra-bold) — both in UNITEL green (#46C800), and the
            trailing period inherits the green at weight 400 so the
            statement closes on brand.  Desktop drifts up to 24 px to
            keep parity with the larger pillar. */}
        <p
          className="max-w-[318px] text-center font-sans text-[20px] font-normal leading-[1.3] text-white sm:max-w-[420px] sm:text-[22px] md:text-[24px]"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.96)",
            filter: entered ? "blur(0px)" : "blur(8px)",
            transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${d_preamble}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_preamble}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${d_preamble}ms`,
          }}
        >
          Kindly note that this invitation is{" "}
          <span className="font-bold text-unitel-green">non-transferable</span>
          , as it has been reserved{" "}
          <span className="font-extrabold text-unitel-green">
            especially for you
          </span>
          <span className="text-unitel-green">.</span>
        </p>

        {/* Event details block — label + 5 detail rows, all sharing a
            single delay so the list reads as one unit. */}
        <div
          className="mt-12 flex flex-col items-center text-center sm:mt-16"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.94)",
            filter: entered ? "blur(0px)" : "blur(12px)",
            transition: `opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1) ${d_details}ms, transform 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_details}ms, filter 2400ms cubic-bezier(0.16, 1, 0.3, 1) ${d_details}ms`,
          }}
        >
          <p className="font-sans text-[16px] font-bold uppercase tracking-[0.2em] text-white sm:text-[18px]">
            Event Details
          </p>
          {/* Time + date capsule — the time row sits between two
              horizontal hairlines that frame it as a self-contained
              detail card; the date row drops below the lower hairline
              so the eye reads "Event Details → time → date" as a tidy
              vertical stack instead of a flat list of <p> rows. */}
          <div className="mt-4 w-44 border-y border-white/30 py-2.5 sm:mt-5 sm:w-56 sm:py-3">
            <p className="font-sans text-[18px] font-normal leading-[1.5] text-white sm:text-[22px]">
              {EVENT_TIME}
            </p>
          </div>
          <p className="mt-2.5 font-sans text-[18px] font-normal leading-[1.5] text-white sm:mt-3 sm:text-[22px]">
            {month} {day}, {EVENT_YEAR}
          </p>
          {/* Venue — Figma spec (node 4:177): Manrope 16 px / 100 %
              line-height, fixed 259×50 px box centred on the column.
              The two address strings are printed in a single <p> so the
              constrained max-width auto-wraps "Outdoor of the State
              Academic Drama Theatre" onto a second + third line at
              "Academic" / "Drama Theatre", matching the design's 3-line
              cadence.  `<br />` separates the two semantic lines so a
              very wide viewport can never collapse them onto one row. */}
          <p className="mt-6 max-w-[259px] text-center font-sans text-[16px] font-normal leading-[1.25] text-white sm:mt-8 sm:max-w-[340px] sm:text-[18px]">
            {VENUE_LINE_1}
            <br />
            {VENUE_LINE_2}
          </p>
          <p className="mt-6 font-sans text-[15px] font-normal leading-[1.5] text-white sm:mt-8 sm:text-[18px]">
            <span className="font-bold">Dress code:</span> Cocktail attire
          </p>
        </div>

      </div>
    </section>
  );
}
