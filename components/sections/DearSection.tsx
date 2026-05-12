"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useLoadGate } from "@/hooks/useLoadGate";
import { formatGuestName, useGuestName } from "@/lib/guestContext";
import { lockDearAnimation } from "@/lib/sceneLock";
import { LineFade, estimateLineCount } from "@/components/ui/LineFade";

// TEST MODE — the stage-1 ambient loop video has been removed; the
// 8 s STAGE2_VIDEO now starts auto-playing as soon as the splash
// hand-off finishes, without a scroll trigger.  The dear lock still
// fires when the animation begins so the user is pinned through
// the 8 s playback + invitation cascade.
const STAGE2_VIDEO = "/media/dear/final-invitation-animation.mp4";

// Reveal range — Dear is scene 1 of 4 (Hero was absorbed into
// stage 3 so its slot is gone; CEO was removed).  Hold extends to
// 0.21 (matching the lock cap) so stage-3 stays fully visible until
// the user is freed to scroll.  Fade-out 0.21-0.25 and Urtuu's
// fade-in (0.24-0.29) share only a 0.01 overlap zone at intermediate
// opacities — the two scenes' DOM content stops cross-bleeding
// during the handoff.
const REVEAL_RANGE = {
  start: -0.02,
  peak: 0.0,
  hold: 0.21,
  end: 0.25,
};

// Stage-1 sequential reveal cadence (after introDone):
//   1. "Dear" eyebrow fades in           — DEAR_DELAY_MS
//   2. Name letters type in left-to-right — start NAME_START_DELAY_MS,
//      each letter offset by NAME_LETTER_STAGGER_MS
//   3. Envelope (loop video) fades in    — once name typing has
//      settled + ENVELOPE_AFTER_NAME_MS breathing room
//   4. Chevron + helper text fade in     — last, ~600 ms after envelope
const DEAR_DELAY_MS = 600;
const DEAR_FADE_MS = 1200;
const NAME_START_DELAY_MS = 1500;
const NAME_LETTER_STAGGER_MS = 85;
const NAME_LETTER_FADE_MS = 420;
const ENVELOPE_AFTER_NAME_MS = 350;
const CHEVRON_AFTER_ENVELOPE_MS = 600;

// Stage-3 cascade timing — JP-style stagger fade, smoothed.
// Per-line fade trimmed slightly (1.6 → 1.2 s, title 1.2 → 0.9 s)
// for a snappier reveal — same easing, same translateY, just less
// per-element settle time.  Stagger 120 ms keeps the heavy overlap
// so the cascade still reads as a continuous silky wave.
const TITLE_FADE_MS = 400;
const TITLE_TO_BODY_MS = 120;
const BODY_LINE_STAGGER_MS = 50;
const BODY_LINE_FADE_MS = 2000;

// Pre-roll the cascade BEFORE the stage-2 video ends so the
// INVITATION letter starts revealing while the envelope is still
// finishing its open animation — without this the user sees a
// fully-open envelope sitting empty for a beat before the text
// fades in.  Triggered from the stage-2 onTimeUpdate handler.
const CASCADE_PREROLL_S = 1.2;

// Mobile-only delay before the stage-2 mp4 starts playing.  The
// video element is mounted + visible (paused on its first frame)
// the moment phase flips to "playing", but we hold off on calling
// play() until the guest name has had its solo beat.  Without this
// the personalised name overlaps the unfolding envelope flap and
// looks crowded on small screens.  Desktop has more horizontal
// breathing room so it doesn't need the delay.
const MOBILE_ASSET_PLAY_DELAY_MS = 2000;

// Independent scene-lock durations per viewport — measured from the
// moment phase flips to "playing".  Lock pins the user at the dear
// scene cap until it releases, so this needs to cover the asset
// playback (8 s) + cascade settle on each viewport.  Tune each in
// isolation by editing its own constant.
const LOCK_MS_DESKTOP = 10500;
const LOCK_MS_MOBILE = 11500;

// Tailwind's default `md` breakpoint is 768 px, so mobile is
// anything below that.  Used to gate MOBILE_ASSET_PLAY_DELAY_MS
// and shift the name fade-out + scene-lock durations on phones.
const MOBILE_QUERY = "(max-width: 767px)";

const BODY_PARA_1 =
  "Unitel group invites you to an exclusive evening where you become part of the story.";
const BODY_PARA_2 =
  "An evening where stories unfold, and you are not just a guest.";
const BODY_PARA_3 = "But drawn into every moment.";

type Phase = "loop" | "playing" | "ended";

// Three-stage scene:
//   loop    — Default invitation video loops behind the personalised
//             name + scroll cue.  Reveal cadence: Dear eyebrow →
//             name typewriter → envelope → chevron.
//   playing — Final invitation animation plays once (8 s).  Loop
//             video crossfades out underneath; centre name + scroll
//             cue fade out together.  Lockup stays put.
//   ended   — Stage-2 video paused on its last frame as the static
//             backdrop.  INVITATION title + 3 body paragraphs cascade
//             in line-by-line.  Helper text below the chevron switches
//             to "Discover what awaits".
export default function DearSection() {
  const ref = useSectionReveal<HTMLElement>(REVEAL_RANGE);
  const { introDone } = useLoadGate();

  const rawGuestName = useGuestName();
  const guestName = rawGuestName
    ? formatGuestName(rawGuestName)
    : "Esteemed Guest";

  // Total ms from introDone to the moment the name's final letter
  // has finished its opacity transition — drives the envelope's
  // fade-in delay.
  const nameTypeEndMs =
    NAME_START_DELAY_MS +
    Math.max(0, guestName.length - 1) * NAME_LETTER_STAGGER_MS +
    NAME_LETTER_FADE_MS;
  const envelopeDelayMs = nameTypeEndMs + ENVELOPE_AFTER_NAME_MS;
  const chevronDelayMs = envelopeDelayMs + CHEVRON_AFTER_ENVELOPE_MS;

  // --- Mobile viewport detection -------------------------------------
  // Drives MOBILE_ASSET_PLAY_DELAY_MS (paused first frame for 2 s
  // before play()) and the +2 s offsets on the name fade-out timer
  // and scene-lock duration so the name's solo beat doesn't collide
  // with the envelope flap on small screens.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // --- Phase machine -------------------------------------------------
  const [phase, setPhase] = useState<Phase>("loop");
  const phaseRef = useRef<Phase>("loop");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // TEST MODE — auto-advance loop → playing the moment the splash
  // hand-off finishes.  The stage-1 ambient loop has been removed,
  // so there's nothing to watch for; we simply kick the 8 s mp4
  // immediately so the lock + cascade run their normal course.
  useEffect(() => {
    if (!introDone) return;
    if (phase !== "loop") return;
    setPhase("playing");
  }, [introDone, phase]);

  // --- Scroll lock during animation + cascade ------------------------
  // Trigger a manual scroll lock the moment the user kicks off the
  // stage-2 animation.  Duration covers the 8 s mp4 plus the
  // snappier cascade (title 0.9 s + 250 ms breath + 5 × 120 ms
  // stagger + 1.2 s last-line fade ≈ 2.95 s) plus a small buffer
  // so the user can't skip past dear before the cascade settles.
  // Mobile pads MOBILE_ASSET_PLAY_DELAY_MS on top because the asset
  // sits paused on its first frame for those 2 s before playback.
  useEffect(() => {
    if (phase !== "playing") return;
    lockDearAnimation(isMobile ? LOCK_MS_MOBILE : LOCK_MS_DESKTOP);
  }, [phase, isMobile]);

  // --- Stage-2 video --------------------------------------------------
  const stage2Ref = useRef<HTMLVideoElement | null>(null);
  const [stage2Visible, setStage2Visible] = useState(false);

  // Kick the one-shot animation playing the moment phase flips.
  // Set X5 hints + arm a one-shot retry on first gesture so MIUI /
  // Samsung Internet / iOS Low-Power Mode don't refuse autoplay.
  // On mobile we hold the video paused on its first frame for
  // MOBILE_ASSET_PLAY_DELAY_MS so the personalised name has a solo
  // beat before the envelope flap unfolds underneath it.
  useEffect(() => {
    if (phase !== "playing") return;
    const v = stage2Ref.current;
    if (!v) return;
    v.setAttribute("x5-video-player-type", "h5-page");
    v.setAttribute("x5-video-player-fullscreen", "false");
    v.setAttribute("x5-playsinline", "true");
    v.setAttribute("webkit-playsinline", "true");
    try {
      v.currentTime = 0;
    } catch {
      /* no-op */
    }
    const attempt = () => {
      const r = v.play();
      if (r && typeof r.catch === "function") {
        r.catch(() => {
          const retry = () => attempt();
          document.addEventListener("touchstart", retry, {
            passive: true,
            once: true,
          });
          document.addEventListener("click", retry, { once: true });
          document.addEventListener("scroll", retry, {
            passive: true,
            once: true,
          });
        });
      }
    };
    const startDelay = isMobile ? MOBILE_ASSET_PLAY_DELAY_MS : 0;
    if (startDelay <= 0) {
      attempt();
      return;
    }
    const t = window.setTimeout(attempt, startDelay);
    return () => window.clearTimeout(t);
  }, [phase, isMobile]);

  // --- Chevron mounted gate (last in the stage-1 cadence) ------------
  const [chevronReady, setChevronReady] = useState(false);
  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => setChevronReady(true), chevronDelayMs);
    return () => window.clearTimeout(t);
  }, [introDone, chevronDelayMs]);

  // --- Cascade trigger -----------------------------------------------
  // Primary trigger: stage-2 video's onTimeUpdate flips cascadeOn
  // CASCADE_PREROLL_S before the clip ends, so INVITATION starts
  // revealing while the envelope is still finishing its open frames.
  // This effect is the safety net — if the video onEnded fires
  // without timeUpdate having tripped (seek, very short clips,
  // throttled tabs), make sure the cascade still kicks off.
  const [cascadeOn, setCascadeOn] = useState(false);
  useEffect(() => {
    if (phase !== "ended") return;
    if (cascadeOn) return;
    const t = window.setTimeout(() => setCascadeOn(true), 15);
    return () => window.clearTimeout(t);
  }, [phase, cascadeOn]);

  // --- Stage-1 name fade-out gate ------------------------------------
  // The 8 s animation opens the envelope and stretches it upward —
  // the guest name overlaps the unfolding flap badly.  Hold the name
  // for ~4 s after the animation starts (the envelope is still
  // closed/early-morphing then) and then fade it out gently before
  // the flap reaches the name's territory.
  // Independent fade timers per viewport — both measured from the
  // moment phase flips to "playing" (NOT from actual asset playback).
  // Desktop: asset plays immediately, so 4500 ms = name fades 4.5 s
  // into the envelope animation.
  // Mobile: asset is held paused MOBILE_ASSET_PLAY_DELAY_MS first,
  // so 6500 ms here ≈ 4.5 s into the actual flap unfold.  Tune each
  // viewport in isolation by editing its own constant.
  const NAME_FADE_AFTER_PLAYING_MS_DESKTOP = 4500;
  const NAME_FADE_AFTER_PLAYING_MS_MOBILE = 4300;
  const [nameFadeOut, setNameFadeOut] = useState(false);
  useEffect(() => {
    if (phase !== "playing") return;
    const fadeMs = isMobile
      ? NAME_FADE_AFTER_PLAYING_MS_MOBILE
      : NAME_FADE_AFTER_PLAYING_MS_DESKTOP;
    const t = window.setTimeout(() => setNameFadeOut(true), fadeMs);
    return () => window.clearTimeout(t);
  }, [phase, isMobile]);

  const linesP1 = estimateLineCount(BODY_PARA_1);
  const linesP2 = estimateLineCount(BODY_PARA_2);
  const bodyDelay = TITLE_FADE_MS + TITLE_TO_BODY_MS;

  // Spanize the guest name letter-by-letter so the typewriter
  // cascade can stagger their opacity reveal LTR.
  const nameChars = Array.from(guestName);

  // ENVELOPE_FRAME_CLASSES — the source mp4 places the envelope
  // graphic ~45 % from the LEFT of its own frame (not 50 %), so
  // simply centring the container with `left-1/2` ends up shifting
  // the visible envelope off-screen to one side.  Instead we use an
  // EMPIRICAL `left` offset tuned so the envelope lands at viewport
  // centre.  Original Figma reference is 175 vw wide @ left -28.5
  // vw; we scale up by ~1.3× to make the envelope read bigger and
  // recompute `left` proportionally so the envelope stays centred:
  //     new_left = 50 − (new_width / 175) × 78.5
  // Used for BOTH the stage-1 loop video and the stage-2 animation
  // so they share one on-screen position — the morph between them
  // reads as one continuous envelope rather than a jump.
  const ENVELOPE_FRAME_CLASSES =
    "pointer-events-none absolute w-[290vw] left-[-91vw] top-[1vh] " +
    "md:w-[106vw] md:left-[0vw] md:top-[-2vh] " +
    "lg:w-[95vw] lg:left-[3vw] lg:top-[-5vh]";

  return (
    <section
      ref={ref}
      data-reveal
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* Background dressing (radial shader + cosmic plate) was
          retired in update3 — the envelope mp4 + the section's
          plain `bg-black` is now the entire visual floor. */}

      {/* ---------- Stage-2/3 envelope (animation video) ----------
          Sits in the SAME positioned frame as the stage-1 loop so
          the morph between videos reads as one continuous envelope
          rather than a jump.  Mounted as soon as the splash hand-off
          finishes so the bytes are buffered before the user scrolls.
          Hidden until phase flips to "playing", then fades in over
          the loop crossfade.  On `onEnded` we pause (do NOT seek to
          0) so the browser holds the final frame as the static
          stage-3 backdrop. */}
      {introDone ? (
        <div
          aria-hidden
          className={ENVELOPE_FRAME_CLASSES}
          style={{
            aspectRatio: "183 / 145",
            opacity: stage2Visible ? 1 : 0,
            transition: "opacity 500ms ease-out",
          }}
        >
          <video
            ref={stage2Ref}
            src={STAGE2_VIDEO}
            muted
            playsInline
            preload="auto"
            aria-hidden
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            onPlaying={() => {
              if (!stage2Visible) setStage2Visible(true);
            }}
            onLoadedData={() => {
              if (phaseRef.current !== "loop" && !stage2Visible) {
                setStage2Visible(true);
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (
                v.duration &&
                v.duration - v.currentTime <= CASCADE_PREROLL_S
              ) {
                setCascadeOn((prev) => (prev ? prev : true));
              }
            }}
            onEnded={() => {
              const v = stage2Ref.current;
              if (v && !v.paused) v.pause();
              if (phaseRef.current !== "ended") setPhase("ended");
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "transparent",
              transform: "translateZ(0)",
              willChange: "opacity, transform",
            }}
          />
        </div>
      ) : null}

      {/* ---------- Foreground content ---------- */}
      <div className="relative z-10 flex h-full w-full">
        {/* TOP — anniversary lockup.  Persists across all three
            phases.  Shrunk ~40 % in update3 (h-8 → h-5, w-30vw →
            w-18vw) per user feedback that the previous treatment
            dominated the page.  The id="hero-lockup" stayed in
            place for legacy compatibility — it's no longer a FLIP
            target now that the splash fades out in place. */}
        <div className="absolute inset-x-0 top-[5vh] flex justify-center sm:top-[6vh] md:top-[5vh]">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            className="h-5 w-auto sm:h-auto sm:w-[28vw]"
            style={{
              opacity: introDone ? 1 : 0,
              transform: introDone ? "scale(1)" : "scale(0.92)",
              filter: introDone ? "blur(0px)" : "blur(8px)",
              transformOrigin: "center center",
              transition:
                "opacity 700ms ease-out, transform 2800ms cubic-bezier(0.22, 1, 0.36, 1), filter 2600ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "opacity, transform, filter",
            }}
          />
        </div>

        {/* Stage-1 centre — "Dear" eyebrow above Lora typewriter name.
            Mobile parks at 29vh — sits below the anniversary lockup
            with breathing room above the envelope. */}
        <div
          aria-hidden={phase === "ended" || nameFadeOut}
          className="absolute inset-x-0 top-[26vh] flex flex-col items-center justify-center gap-3 px-4 text-center md:top-[31vh] md:gap-4 lg:top-[27vh]"
          style={{
            opacity: phase === "ended" || nameFadeOut ? 0 : 1,
            transition: "opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Dear eyebrow — first beat of the cadence.  Effect
              mirrors the Urtuu "Introducing" eyebrow — scale 0.96
              → 1, blur 8 → 0, opacity 0 → 1 over 1800–2000 ms — so
              the entry reads as a slow, deliberate convergence
              rather than a fast slide-in. */}
          <div
            className="font-sans text-[16px] font-light tracking-[0.18em] text-white/85 md:text-[1.6vw]"
            style={{
              opacity: introDone ? 1 : 0,
              transform: introDone ? "scale(1)" : "scale(0.96)",
              filter: introDone ? "blur(0px)" : "blur(8px)",
              transition: `opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1) ${DEAR_DELAY_MS}ms, transform 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${DEAR_DELAY_MS}ms, filter 2000ms cubic-bezier(0.16, 1, 0.3, 1) ${DEAR_DELAY_MS}ms`,
            }}
          >
            Dear
          </div>

          {/* Name — Lora 40px white, types in letter-by-letter LTR.
              Per Figma node 19-240 spec: Lora 400, 40 px, 100 % line
              height, 0 letter-spacing, white, centred. */}
          <div
            className="font-lora whitespace-pre text-[40px] font-normal leading-none text-white md:text-[4vw] lg:text-[3.2vw]"
            style={{ letterSpacing: 0 }}
          >
            {nameChars.map((char, i) => {
              const delay = NAME_START_DELAY_MS + i * NAME_LETTER_STAGGER_MS;
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: introDone ? 1 : 0,
                    transform: introDone ? "translateY(0)" : "translateY(6px)",
                    transition: `opacity ${NAME_LETTER_FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${NAME_LETTER_FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                  }}
                >
                  {char === " " ? " " : char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Stage-3 centre — INVITATION + body cascade.  Constrained
            column (max-w-[48vw] mobile) so the text stays inside the
            envelope's green letter area instead of spilling onto the
            dark outer envelope frame.  Cascade nudged down a touch
            (21 -> 25 vh mobile, 17 -> 21 vh desktop) per user
            feedback so the block sits more comfortably inside the
            envelope's letter area instead of crowding the upper
            edge. */}
        <div
          aria-hidden={!cascadeOn}
          className="absolute inset-x-0 top-[25vh] flex flex-col items-center px-6 text-center md:top-[31vh] lg:top-[33vh]"
          style={{
            opacity: cascadeOn ? 1 : 0,
            transition: "opacity 500ms ease-out",
          }}
        >
          <h2
            className="font-lora text-[22px] font-normal text-white sm:text-[24px] md:text-[2.4vw]"
            style={{
              letterSpacing: "0.04em",
              opacity: cascadeOn ? 1 : 0,
              transform: cascadeOn ? "translateY(0)" : "translateY(10px)",
              transition: `opacity ${TITLE_FADE_MS}ms ease, transform ${TITLE_FADE_MS}ms ease`,
              willChange: "opacity, transform",
            }}
          >
            INVITATION
          </h2>

          <p className="mt-3 max-w-[50vw] font-sans text-[12px] font-normal leading-[1.55] text-white/80 md:max-w-[26vw] md:text-[1.1vw]">
            <LineFade
              text={BODY_PARA_1}
              delay={bodyDelay}
              lineOffset={0}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
              slide
            />
          </p>

          <p className="mt-4 max-w-[50vw] font-sans text-[12px] font-normal leading-[1.55] text-white/80 md:max-w-[26vw] md:text-[1.1vw]">
            <LineFade
              text={BODY_PARA_2}
              delay={bodyDelay}
              lineOffset={linesP1}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
              slide
            />
          </p>

          <p className="mt-4 max-w-[50vw] font-sans text-[12px] font-normal leading-[1.55] text-white/80 md:max-w-[26vw] md:text-[1.1vw]">
            <LineFade
              text={BODY_PARA_3}
              delay={bodyDelay}
              lineOffset={linesP1 + linesP2}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
              slide
            />
          </p>
        </div>

        {/* BOTTOM — chevron + helper text.  Helper text label switches
            from "Scroll down to see more" (loop) to "Discover what
            awaits" (ended).  Hidden during the playing animation so
            the user's eyes stay on the centre transition. */}
        <div
          className="absolute inset-x-0 bottom-[6vh] flex flex-col items-center gap-2 text-white/60 md:bottom-[8vh]"
          style={{
            opacity: chevronReady && phase !== "playing" ? 1 : 0,
            transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span className="font-sans text-[11px] font-light tracking-[0.14em] md:text-[0.78vw]">
            {phase === "ended"
              ? "Discover what awaits"
              : "Scroll down to see more"}
          </span>
          <ChevronDown />
        </div>
      </div>
    </section>
  );
}

function ChevronDown() {
  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 22 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="opacity-80"
    >
      <path
        d="M1 1L11 11L21 1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
