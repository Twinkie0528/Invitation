"use client";

import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useSceneEntered } from "@/hooks/useScrollProgress";
import { useGuest } from "@/lib/guestContext";
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
// Cosmos backdrop — galloping rider silhouette built from drifting
// stars.  Replaced the static PNG with the new MP4 export so the rider
// actually moves; cosmos.png stays around as the poster fallback shown
// while the video is buffering / out of scroll range.
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
      {/* ---------- Background — cosmos rider PNG anchored at the
            bottom edge.  Two-layer wrapper:
              outer layer pins the image full-bleed at the bottom and
              centres it in the horizontal axis,
              inner layer carries `bloom-drift` (the slow translate+scale
              loop the gala bloom uses).
            Splitting the duties means `bloom-drift`'s keyframe
            `transform` doesn't clobber the centring transform — both
            properties stay live, the image stays centred, and the
            drift still animates. */}
      {/* Cosmos rider mp4 — fills the bottom 50% of the viewport edge-
          to-edge so the silhouette reads at the same scale as the
          Figma frame.  `objectFit="cover"` keeps the rider centred
          regardless of the source's authored aspect; the soft top fade
          dissolves the upper edge of the video into the section's
          black header area for a seamless transition. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[50%]"
      >
        <BackgroundVideoFrame
          src={COSMOS_SRC}
          poster={COSMOS_POSTER}
          start={0.83}
          end={1.05}
          objectFit="cover"
          className="absolute inset-0 h-full w-full opacity-90 sm:opacity-30"
        />
        <div className="absolute inset-x-0 top-0 h-[25%] bg-gradient-to-b from-black to-transparent" />
      </div>

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
          className="w-[306px] sm:w-[420px]"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 300ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 300ms",
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
            transform: entered ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 900ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 900ms",
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
            stack above).  `sm:order-3` places this AFTER the dress
            code on desktop without changing DOM order. */}
        <h2
          className="hidden font-sans font-bold leading-none tracking-tight sm:order-3 sm:mt-8 sm:flex sm:items-baseline sm:justify-center sm:gap-3"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 900ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 900ms",
          }}
        >
          <span
            className="text-[48px] md:text-[58px] lg:text-[64px]"
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
          <span className="text-[42px] text-white md:text-[52px] lg:text-[56px]">
            {month} {day},
          </span>
          <span className="text-[42px] text-white md:text-[52px] lg:text-[56px]">
            {EVENT_YEAR}
          </span>
        </h2>

        {/* ---------- Dress code ----------
            "Dress code:" is bold per the Figma; the rest stays
            regular.  Hand-faded so the inline <span> bold weight
            survives.  Desktop reorders to position 2 (between title
            and date) via `sm:order-2`, with the gap to the title
            tightened down from the mobile `mt-7`. */}
        <p
          className="mt-7 font-sans text-[12px] font-normal leading-[1.4] text-white sm:order-2 sm:mt-5 sm:text-[14px] md:text-[16px]"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(6px)",
            transition:
              "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) 1700ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 1700ms",
          }}
        >
          <span className="font-bold">Dress code:</span> Cocktail attire
        </p>

        {/* ---------- Venue ----------
            Mobile Figma spec: 259×50 box, three lines.  At 12 px font-
            size with 1.4 line-height the text wraps to exactly three
            rows.  Desktop pinned to the last position via `sm:order-4`. */}
        <div className="mt-3 sm:order-4 sm:mt-5">
          <RevealText
            as="p"
            className="w-[259px] text-center font-sans text-[12px] font-normal leading-[1.4] text-white sm:w-auto sm:max-w-[420px] sm:text-[14px] md:max-w-[540px] md:text-[16px]"
            stagger={22}
            duration={650}
            delay={1950}
            trigger={entered}
          >
            {"Temporary Exhibition Hall, Outdoor of the State Academic Drama Theatre."}
          </RevealText>
        </div>
      </div>
    </section>
  );
}
