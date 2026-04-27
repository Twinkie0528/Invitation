"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  src: string | null;
  title?: string;
  onClose: () => void;
};

export default function VideoLightbox({ open, src, title, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Autoplay muted — browsers disallow with-audio autoplay, user can unmute.
    videoRef.current?.play().catch(() => {});
    // Lock background scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          key="lb"
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          role="dialog"
          aria-modal
          aria-label={title ?? "Video"}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-black/85 backdrop-blur-[14px]"
          />
          <motion.div
            className="relative mx-auto w-[90vw] max-w-[1180px]"
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-[0_40px_160px_rgba(0,64,185,0.35)]">
              <video
                ref={videoRef}
                src={src}
                controls
                playsInline
                className="h-full w-full"
              />
            </div>
            {title && (
              <div className="mt-3 text-[11px] uppercase tracking-[0.32em] text-white/60">
                {title}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-10 right-0 font-sans text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
              aria-label="Close video"
            >
              Close &times;
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
