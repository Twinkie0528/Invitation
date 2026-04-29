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
  // Mount window — within scroll-progress preload margin of this
  // section's reveal window.  Hero starts within range on page load
  // (start - preloadMargin ≤ 0); other sections wait until the user
  // scrolls toward them.
  //
  // The previous version of this component additionally gated the
  // <video> mount behind a global "first user gesture" flag so iOS
  // Safari's tap-to-play overlay would never paint.  In practice
  // that gate broke the hero on real iOS / Android phones: a user
  // who opened the page and didn't immediately scroll/tap stared at
  // a black box because the <video> hadn't mounted yet.  We now
  // mount the video as soon as the section enters its preload
  // range and rely on muted+playsInline+autoplay (plus the
  // onLoadedMetadata force-decode trick and the gesture retry
  // below) to actually start it.  The risk in exchange: iOS users
  // with Low Power Mode on may briefly see the autoplay-block
  // overlay, but the overwhelmingly common case (autoplay allowed)
  // now works without a required gesture.
  const [mounted, setMounted] = useState(() => start - preloadMargin <= 0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const apply = (p: number) => {
      const inWindow = p >= start - preloadMargin && p <= end + preloadMargin;
      if (inWindow) setMounted(true);

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

  // Mobile-browser autoplay hardening.  Some Android engines (Mi Browser,
  // MIUI, Samsung Internet, in-app webviews) silently refuse muted +
  // playsInline autoplay under data-saver / low-battery modes — the
  // first frame never paints and the section reads as a black box.  When
  // the video element mounts, set Tencent X5 hints so the tag isn't
  // hijacked into a native fullscreen player, and arm a one-shot retry
  // on the first user gesture (touch/scroll/click) which counts as the
  // activation needed for the autoplay policy to relent.
  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (!v) return;

    v.setAttribute("x5-video-player-type", "h5-page");
    v.setAttribute("x5-video-player-fullscreen", "false");
    v.setAttribute("x5-playsinline", "true");
    v.setAttribute("webkit-playsinline", "true");

    const onGesture = () => {
      // Only retry if the video element is supposed to be playing right
      // now — i.e. we're in the section's scroll window.
      if (!playingRef.current) return;
      const result = v.play();
      if (result && typeof result.catch === "function") result.catch(() => {});
    };
    document.addEventListener("touchstart", onGesture, { passive: true, once: true });
    document.addEventListener("click", onGesture, { once: true });
    document.addEventListener("scroll", onGesture, { passive: true, once: true });

    return () => {
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click", onGesture);
      document.removeEventListener("scroll", onGesture);
    };
  }, [mounted]);

  // Wrapper structure: the poster (or dark placeholder) is always
  // rendered as a base layer at the bottom of the stack.  The <video>
  // element sits on top of it once the gates open and starts at
  // opacity 0 — it only fades in when the engine confirms playback
  // has begun (`onPlaying`), so if autoplay is blocked the user sees
  // the static poster forever instead of an iOS tap-to-play overlay.
  // Critically, the video element does NOT receive a `poster`
  // attribute: iOS Safari paints its tap-to-play triangle over the
  // poster image when autoplay is blocked, but with no poster on the
  // <video> the element stays invisible and the engine has nothing
  // to draw the overlay on.
  return (
    <div className={className} style={{ overflow: "hidden", backgroundColor: "#030308" }}>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit,
            backgroundColor: "#030308",
          }}
        />
      ) : null}
      {mounted ? (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          // controlsList + disablePictureInPicture + disableRemotePlayback
          // strip every chrome surface the engines might otherwise add
          // (download / fullscreen / AirPlay / cast / PiP).  Belt-and-
          // suspenders against a future browser deciding our muted
          // autoplay video deserves a control overlay.
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit,
            backgroundColor: "#030308",
            transform: "translateZ(0)",
            willChange: "transform, opacity",
            opacity: 0,
            transition: "opacity 320ms ease-out",
          }}
          onPlaying={(e) => {
            // Engine confirmed the decoder is feeding frames — fade
            // the video in over the poster.  If this never fires
            // (autoplay blocked despite our gestures), the poster
            // stays visible and the user sees a clean static frame
            // instead of a tap-to-play overlay.
            e.currentTarget.style.opacity = "1";
          }}
          onLoadedMetadata={(e) => {
            // "Force-decode the first frame" trick — seeking to a
            // tiny non-zero offset triggers a decode → frame paint
            // without needing play() to succeed.  Then issue play()
            // so animation kicks in once the decoder is warm.  Both
            // calls are guarded by the gesture gate above (the
            // <video> only mounts after a gesture), so the play()
            // here is generally inside the gesture's relaxed
            // autoplay window even on iOS Low Power Mode.
            const v = e.currentTarget;
            try {
              v.currentTime = 0.01;
            } catch {
              /* no-op — some streams disallow seeking before canplay */
            }
            const result = v.play();
            if (result && typeof result.catch === "function") result.catch(() => {});
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
      ) : null}
    </div>
  );
}
