"use client";

import { useEffect, useRef, useState } from "react";
import { sceneRef, subscribeScene } from "@/hooks/useScrollProgress";

type Props = {
  src: string;
  // Optional static-frame fallback shown until the video has mounted +
  // decoded its first frame.  Omit when the section bg is already a
  // solid colour and a poster would just duplicate that.
  poster?: string;
  // Scroll-progress range during which the video should be playing.
  start: number;
  end: number;
  // How much earlier (in scroll-progress units) to mount the <video> tag
  // so it can buffer before play() is called. Larger = smoother first frame
  // at the cost of a slightly earlier network fetch.
  preloadMargin?: number;
  className?: string;
  // How the video fills its container.  "cover" (default) crops the
  // video to fill — best for full-bleed cinematic backdrops where the
  // exact framing doesn't matter.  "contain" letterboxes so the entire
  // video frame is visible — use it when the asset is a mascot/figure
  // that needs to be seen in full, against a black section base.
  objectFit?: "cover" | "contain";
};

// Cinematic background video, mounted lazily and paused while out of the
// active scroll window. Decoupled from useSectionReveal so the section's
// own opacity fade can stay smooth (one DOM mutation per frame max).
//
// Loop strategy: instead of the native `loop` attribute (which Chromium
// has historically rendered with a single black frame at the boundary as
// the decoder rewinds), we listen for `timeupdate` and seek a few frames
// BEFORE the EOS marker. The seek is short enough that the decoder keeps
// streaming without a visible gap. Combined with a dark `background-color`
// on the video element, any one-frame fallback paints to black instead of
// white — no flash on either end.
export default function BackgroundVideoFrame({
  src,
  poster,
  start,
  end,
  preloadMargin = 0.06,
  className,
  objectFit = "cover",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const apply = (p: number) => {
      const inMountWindow = p >= start - preloadMargin && p <= end + preloadMargin;
      if (inMountWindow) setMounted(true);

      const v = videoRef.current;
      if (!v) return;

      const shouldPlay = p >= start && p <= end;
      if (shouldPlay && !playingRef.current) {
        const result = v.play();
        if (result && typeof result.catch === "function") result.catch(() => {});
        playingRef.current = true;
      } else if (!shouldPlay && playingRef.current) {
        v.pause();
        playingRef.current = false;
      }
    };

    apply(sceneRef.current.progress);
    return subscribeScene((s) => apply(s.progress));
  }, [start, end, preloadMargin]);

  // Static poster (or plain dark stand-in) until the section approaches
  // view — zero network/decode cost on initial page load.
  if (!mounted) {
    if (!poster) {
      return (
        <div
          aria-hidden
          className={className}
          style={{ backgroundColor: "#030308" }}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        aria-hidden
        className={className}
        style={{ objectFit, backgroundColor: "#030308" }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden
      className={className}
      style={{
        objectFit,
        // Dark fallback so any one-frame gap during the loop seek paints
        // black instead of the browser's default white/transparent.
        backgroundColor: "#030308",
        // Pin to a GPU compositor layer so the decoder writes straight
        // into a texture that the page composites without re-laying out.
        transform: "translateZ(0)",
        willChange: "transform",
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        // Seek a few frames before the EOS marker to avoid the native
        // loop boundary glitch. Threshold tuned for ~30fps source — at
        // the next timeupdate (≤250ms later) we're back near t=0.
        if (v.duration && v.duration - v.currentTime < 0.18) {
          v.currentTime = 0;
        }
      }}
      onEnded={(e) => {
        // Belt-and-suspenders: if the timeupdate seek missed (rare on
        // very short videos), restart explicitly here.
        const v = e.currentTarget;
        v.currentTime = 0;
        const result = v.play();
        if (result && typeof result.catch === "function") result.catch(() => {});
      }}
    />
  );
}
