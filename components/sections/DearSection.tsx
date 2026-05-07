"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useLoadGate } from "@/hooks/useLoadGate";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";
import { formatGuestName, useGuestName } from "@/lib/guestContext";
import { lockDearAnimation } from "@/lib/sceneLock";
import { LineFade, estimateLineCount } from "@/components/ui/LineFade";

// Two video assets carry the entire Dear scene:
//   1. LOOP_VIDEO    — 2 s ambient loop with the personalised name
//                      panel.  Sits as the resting state until the
//                      user scrolls.
//   2. STAGE2_VIDEO  — 8 s one-shot animation that morphs the loop
//                      framing into the final INVITATION envelope.
//                      Holds its last frame as the static backdrop
//                      for the stage-3 text cascade.
const LOOP_VIDEO = "/media/dear/default-final-invitation.mp4";
const STAGE2_VIDEO = "/media/dear/final-invitation-animation.mp4";

// Reveal range — Dear is now scene 1 of 5 (Hero was absorbed into
// stage 3 so its slot is gone).  Hold extends to 0.16 (matching the
// lock cap) so stage-3 stays fully visible until the user is freed
// to scroll.  Fade-out 0.16-0.19 and CEO's fade-in 0.18-0.22 share
// only a 0.01 overlap zone at intermediate opacities — the two
// scenes' DOM content stops cross-bleeding during the handoff.
const REVEAL_RANGE = {
  start: -0.02,
  peak: 0.0,
  hold: 0.16,
  end: 0.19,
};

// Tiny scroll threshold — any input past this flips loop → playing.
// Kept well below the lock cap (0.16) so the lock then pins the user
// while the 8 s mp4 plays through.
const SCROLL_TRIGGER_PROGRESS = 0.003;

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

// Stage-3 cascade timing — title settles quickly, then body
// flows top-to-bottom in a smooth elegant wave.  Each body line
// still breathes ~2.2 s but the gap between title and the first
// body line is short (200 ms), and the line-to-line stagger is
// tightened so the cascade reads as one fluid motion rather than
// independent beats.
const TITLE_FADE_MS = 1200;
const TITLE_TO_BODY_MS = 200;
const BODY_LINE_STAGGER_MS = 220;
const BODY_LINE_FADE_MS = 2200;

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

  // --- Phase machine -------------------------------------------------
  const [phase, setPhase] = useState<Phase>("loop");
  const phaseRef = useRef<Phase>("loop");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Watch scroll: any input past the threshold flips loop → playing
  // (provided the splash hand-off has finished).  One-way transition.
  useEffect(() => {
    if (!introDone) return;
    if (phase !== "loop") return;
    const check = (p: number) => {
      if (p > SCROLL_TRIGGER_PROGRESS && phaseRef.current === "loop") {
        setPhase("playing");
      }
    };
    check(sceneRef.current.progress);
    return subscribeScene((s) => check(s.progress));
  }, [introDone, phase]);

  // --- Scroll lock during animation + cascade ------------------------
  // Trigger a manual scroll lock the moment the user kicks off the
  // stage-2 animation.  Duration covers the 8 s mp4 plus the ~4.7 s
  // INVITATION cascade plus a small buffer so the user can't skip
  // past dear before the cascade has finished settling.
  useEffect(() => {
    if (phase !== "playing") return;
    lockDearAnimation(13500);
  }, [phase]);

  // --- Stage-1 loop video --------------------------------------------
  // Rendered inline (not via BackgroundVideoFrame) so the wrapper
  // stays transparent and the cosmic background image painted at the
  // section root is visible in the letterbox margins around the
  // envelope graphic.
  const loopRef = useRef<HTMLVideoElement | null>(null);

  // X5 hints + first-gesture autoplay retry, mirroring the
  // BackgroundVideoFrame iOS hardening (so MIUI / Samsung Internet /
  // iOS Low-Power Mode don't refuse the loop's autoplay).
  useEffect(() => {
    if (!introDone) return;
    const v = loopRef.current;
    if (!v) return;
    v.setAttribute("x5-video-player-type", "h5-page");
    v.setAttribute("x5-video-player-fullscreen", "false");
    v.setAttribute("x5-playsinline", "true");
    v.setAttribute("webkit-playsinline", "true");
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
    attempt();
  }, [introDone]);

  // Pause the loop when phase moves past "loop" so the decoder slot
  // is freed up while the stage-2 animation plays.
  useEffect(() => {
    const v = loopRef.current;
    if (!v) return;
    if (phase !== "loop") v.pause();
  }, [phase]);

  // --- Stage-2 video --------------------------------------------------
  const stage2Ref = useRef<HTMLVideoElement | null>(null);
  const [stage2Visible, setStage2Visible] = useState(false);

  // Kick the one-shot animation playing the moment phase flips.
  // Set X5 hints + arm a one-shot retry on first gesture so MIUI /
  // Samsung Internet / iOS Low-Power Mode don't refuse autoplay.
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
    attempt();
  }, [phase]);

  // --- Envelope reveal gate (after name typewriter settles) ----------
  const [envelopeReady, setEnvelopeReady] = useState(false);
  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => setEnvelopeReady(true), envelopeDelayMs);
    return () => window.clearTimeout(t);
  }, [introDone, envelopeDelayMs]);

  // --- Chevron mounted gate (last in the stage-1 cadence) ------------
  const [chevronReady, setChevronReady] = useState(false);
  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => setChevronReady(true), chevronDelayMs);
    return () => window.clearTimeout(t);
  }, [introDone, chevronDelayMs]);

  // --- Cascade trigger -----------------------------------------------
  const [cascadeOn, setCascadeOn] = useState(false);
  useEffect(() => {
    if (phase !== "ended") return;
    const t = window.setTimeout(() => setCascadeOn(true), 30);
    return () => window.clearTimeout(t);
  }, [phase]);

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
    "md:w-[106vw] md:left-[0vw] md:top-[22vh] " +
    "lg:w-[73vw] lg:left-[17vw] lg:top-[22vh]";

  return (
    <section
      ref={ref}
      data-reveal
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-black"
    >
      {/* ---------- Shader (BEHIND the envelope) ----------
          Full-screen atmospheric plate rendered in DOM-first
          position with no z-index so it sits BEHIND the envelope
          videos.  Radial mask centred on the envelope so the
          shader concentrates its tone behind the letter area —
          providing depth/anchor for the envelope without ever
          painting over it (the envelope's opaque mp4 covers the
          shader's centre).  Visible bleed happens only in the
          tiny margins beyond the envelope's bounding box, where
          it gives the cosmic decoration a soft atmospheric base. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/media/common/shader.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 45%, black 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 45%, black 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
          opacity: envelopeReady ? 1 : 0,
          transition: "opacity 3000ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* ---------- Cosmic background (OVER envelope) ----------
          Painted at z-[6] (above the envelope videos) but masked
          with a TIGHT vertical gradient so the cosmic decoration
          appears ONLY in the very top (~14 vh) and very bottom
          (~14 vh) strips of the viewport — never over the
          envelope itself.  No `mix-blend-mode` and no brightness
          filter so the envelope reads as fully opaque (the
          cosmic does not leak any luminance onto the envelope's
          dark mp4 frame). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          backgroundImage: "url(/media/dear/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 7%, transparent 14%, transparent 86%, rgba(0,0,0,0.65) 93%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 7%, transparent 14%, transparent 86%, rgba(0,0,0,0.65) 93%, rgba(0,0,0,1) 100%)",
          opacity: envelopeReady ? 1 : 0,
          transition: "opacity 3000ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* ---------- Stage-1 envelope (loop video) ----------
          Inline render (no BackgroundVideoFrame wrapper) so the
          element is a single <video> with no fallback bg colour.
          Held invisible until the name typewriter settles, then
          crossfades in.  Looping uses the seek-before-EOS trick to
          avoid the native loop's single-frame decoder glitch. */}
      <div
        aria-hidden
        className={ENVELOPE_FRAME_CLASSES}
        style={{
          aspectRatio: "183 / 145",
          opacity: phase === "loop" && envelopeReady ? 1 : 0,
          transition: "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        <video
          ref={loopRef}
          src={LOOP_VIDEO}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration && v.duration - v.currentTime < 0.18) {
              v.currentTime = 0;
            }
          }}
          onEnded={(e) => {
            const v = e.currentTarget;
            v.currentTime = 0;
            const r = v.play();
            if (r && typeof r.catch === "function") r.catch(() => {});
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
            phases.  The id="hero-lockup" preserves the LoadingOverlay
            FLIP target now that the Hero scene has been removed. */}
        <div className="absolute inset-x-0 top-[7vh] flex justify-center sm:top-[8vh] md:top-[6vh]">
          <Image
            id="hero-lockup"
            src="/media/hero/unitel-20-lockup.svg"
            alt="Unitel 20th Anniversary"
            width={520}
            height={58}
            priority
            className="h-8 w-auto sm:h-auto sm:w-[30vw]"
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
          aria-hidden={phase !== "loop"}
          className="absolute inset-x-0 top-[26vh] flex flex-col items-center justify-center gap-3 px-4 text-center md:top-[20vh] md:gap-4 lg:top-[16vh]"
          style={{
            opacity: phase === "loop" ? 1 : 0,
            transition: "opacity 600ms ease-out",
          }}
        >
          {/* Dear eyebrow — first beat of the cadence.  Effect
              mirrors the Urtuu "Introducing" eyebrow — scale 0.96
              → 1, blur 8 → 0, opacity 0 → 1 over 1800–2000 ms — so
              the entry reads as a slow, deliberate convergence
              rather than a fast slide-in. */}
          <div
            className="font-sans text-[16px] font-light tracking-[0.18em] text-white/85 md:text-[1.2vw]"
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
            className="font-lora whitespace-pre text-[40px] font-normal leading-none text-white md:text-[3vw] lg:text-[2.4vw]"
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
            dark outer envelope frame.  Cascade parked at 22vh so the
            INVITATION title lands near the upper edge of the letter
            opening. */}
        <div
          aria-hidden={phase !== "ended"}
          className="absolute inset-x-0 top-[21vh] flex flex-col items-center px-6 text-center md:top-[17vh]"
          style={{
            opacity: phase === "ended" ? 1 : 0,
            transition: "opacity 1000ms ease-out",
          }}
        >
          <h2
            className="font-lora text-[30px] font-normal text-white sm:text-[32px] md:text-[2.3vw]"
            style={{
              letterSpacing: "0.04em",
              opacity: cascadeOn ? 1 : 0,
              transition: `opacity ${TITLE_FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            INVITATION
          </h2>

          <p className="mt-6 max-w-[64vw] font-sans text-[14px] font-normal leading-[1.55] text-white/80 md:max-w-[22vw] md:text-[1vw]">
            <LineFade
              text={BODY_PARA_1}
              delay={bodyDelay}
              lineOffset={0}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
            />
          </p>

          <p className="mt-6 max-w-[64vw] font-sans text-[14px] font-normal leading-[1.55] text-white/80 md:max-w-[22vw] md:text-[1vw]">
            <LineFade
              text={BODY_PARA_2}
              delay={bodyDelay}
              lineOffset={linesP1}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
            />
          </p>

          <p className="mt-6 max-w-[64vw] font-sans text-[14px] font-normal leading-[1.55] text-white/80 md:max-w-[22vw] md:text-[1vw]">
            <LineFade
              text={BODY_PARA_3}
              delay={bodyDelay}
              lineOffset={linesP1 + linesP2}
              lineStagger={BODY_LINE_STAGGER_MS}
              duration={BODY_LINE_FADE_MS}
              trigger={cascadeOn}
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
