"use client";

import { useEffect, useRef } from "react";

// 4px pure-white core + 40px trailing soft glow. The glow lerps toward the
// cursor each frame so moving quickly leaves a short tail. On clickable
// hover the glow expands and tints toward Unitel green. Hidden on touch.

const ACCENT = "0, 217, 95"; // Unitel green as "r, g, b"

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Skip entirely on coarse pointers (touch / pen). Those devices keep the
    // OS cursor; the body-level `cursor: auto` override in globals.css
    // already handles the visual.
    const coarse = window.matchMedia("(pointer: coarse)");
    if (coarse.matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let isOverInteractive = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;

      // Detect interactive element under cursor — drives the expand+tint.
      const el = e.target instanceof Element ? e.target : null;
      const hit =
        !!el &&
        !!el.closest(
          'a, button, [role="button"], input, select, textarea, [data-cursor="hit"]',
        );
      if (hit !== isOverInteractive) {
        isOverInteractive = hit;
        ring.dataset.hit = hit ? "1" : "0";
      }
    };

    const onDown = () => {
      ring.dataset.press = "1";
    };
    const onUp = () => {
      ring.dataset.press = "0";
    };

    const tick = () => {
      // Lerp the ring toward the cursor. 0.18 produces a gentle tail without
      // feeling laggy.
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // Hide OS cursor only when the custom one is wired up — this way users
    // on touch devices or with JS disabled still see a cursor.
    document.documentElement.dataset.customCursor = "on";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(raf);
      delete document.documentElement.dataset.customCursor;
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        data-hit="0"
        data-press="0"
        className="cursor-ring pointer-events-none fixed left-0 top-0 z-[99999] h-10 w-10 rounded-full transition-[width,height,background,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
        style={{
          border: "1px solid rgba(255,255,255,0.55)",
          background: "rgba(255,255,255,0.03)",
          mixBlendMode: "screen",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed left-0 top-0 z-[100000] h-[4px] w-[4px] rounded-full bg-white will-change-transform"
      />
      {/* hover / press state styling — driven by data-attrs set in JS */}
      <style jsx global>{`
        html[data-custom-cursor="on"],
        html[data-custom-cursor="on"] body,
        html[data-custom-cursor="on"] * {
          cursor: none !important;
        }
        .cursor-ring[data-hit="1"] {
          width: 72px !important;
          height: 72px !important;
          border-color: rgba(${ACCENT}, 0.9) !important;
          background: rgba(${ACCENT}, 0.08) !important;
          box-shadow: 0 0 28px rgba(${ACCENT}, 0.35);
        }
        .cursor-ring[data-press="1"] {
          transform: translate3d(var(--cx, 0), var(--cy, 0), 0)
            translate(-50%, -50%) scale(0.82) !important;
        }
      `}</style>
    </>
  );
}
