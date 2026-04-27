// Hidden SVG filter that maps luminance to alpha. Applied via
// `filter: url(#luma-alpha)` to GIFs that ship with an opaque dark
// background — converts the dark pixels to transparent so the canvas
// behind shows through, regardless of the section's stacking context.
//
// Tuning rationale (the chess-queen dust figure):
// The figure itself is mostly DARK GREY particles (luma ~0.08–0.4)
// against a near-black backdrop (luma ~0.02–0.05). That's a tiny
// contrast window — any aggressive threshold deletes the figure with
// the backdrop. So the curve below is intentionally GENTLE: it just
// nudges true-black to alpha 0 and lifts the rest with a smooth gamma.
// The remaining backdrop residue (the GIF's near-black pixels coming
// out at low alpha) is mopped up by `mix-blend-mode: lighten` on the
// <Image> itself — that combo gives a clean PNG-like cutout without
// killing the dim particle silhouette.
//
// Three-pass design:
//   1. feGaussianBlur:      sub-pixel smoothing to kill palette flicker
//   2. feColorMatrix:       Rec. 709 luma → alpha (RGB unchanged)
//   3. feComponentTransfer: gamma + offset; offset shaves true-black
export default function LumaAlphaFilter() {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <filter id="luma-alpha" colorInterpolationFilters="sRGB">
          {/* Step 1 — gentle blur. stdDeviation 0.7 smooths palette
              dithering frame-to-frame (the source of the "glitch" the
              user reported) without softening the particle silhouette. */}
          <feGaussianBlur stdDeviation="0.7" />
          {/* Step 2 — pull luminance into the alpha channel; RGB is
              left untouched so the figure keeps its native palette. */}
          <feColorMatrix
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0.299 0.587 0.114 0 0"
          />
          {/* Step 3 — gentle gamma curve with a small negative offset.
              alpha = clamp(1.2 * luma^0.55 - 0.06, 0, 1)
                luma 0    → 0      (true-black backdrop fully transparent)
                luma 0.05 → ~0.21  (5%-grey GIF backdrop ~21% alpha,
                                    further killed by lighten blend)
                luma 0.10 → ~0.32  (dim particle, visible)
                luma 0.30 → ~0.60
                luma 0.50 → ~0.79
                luma 1.00 → 1.00   (bright particle, fully opaque)
              No table steps = no edge shimmer = no flicker. */}
          <feComponentTransfer>
            <feFuncA
              type="gamma"
              amplitude="1.2"
              exponent="0.55"
              offset="-0.06"
            />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
