// Build premium-quality animated assets (WebP) from the dark-backdrop
// GIFs that ship in /public/media.
//
// Why animated WebP and not APNG?
//   APNG has no inter-frame compression — each frame is a full PNG.
//   At the resolution we need for a premium hero (1500 px wide,
//   truecolor RGBA, ~50 frames), APNG output lands at 25–40 MB.  Far
//   too heavy for a landing page.
//   Animated WebP uses VP8/VP8L with inter-frame prediction; the
//   identical input compresses to roughly 2–4 MB at visually
//   indistinguishable quality.  Every target browser (Safari 14+,
//   Chrome 90+, Firefox 65+) supports it.  We keep the old APNGs
//   shipping as a graceful fallback for the long-tail of legacy
//   browsers via a `<picture>` source.
//
// Pipeline (per source GIF):
//   1. Decode every frame with gifuct-js (handles disposal + LZW).
//   2. Composite each frame onto a running RGBA canvas.
//   3. 2×2 super-sampled bilinear downscale → smooth alpha edges.
//   4. Per-pixel alpha from Rec. 709 luma with a smoothstep curve
//      (soft knees on both ends so dim halos breathe and bright
//      cores stay sharp).
//   5. RGB gain + saturation boost so the figure reads bright and
//      chromatic against the dark page.
//   6. Encode each frame as a static WebP via node-webpmux's bundled
//      libwebp WASM.  Then mux them into one animated WebP with the
//      original per-frame delays preserved exactly.
//
// Usage:  node scripts/build-anim.mjs [name]
//   name = "bloom" | "urtuu" | "all" (default: "all")

import { readFileSync, statSync } from "node:fs";
import { parseGIF, decompressFrames } from "gifuct-js";
import WebP from "node-webpmux";
import sharp from "sharp";

// Per-asset tuning ---------------------------------------------------
const ASSETS = {
  bloom: {
    src: "public/media/common/gala-bloom.gif",
    out: "public/media/common/gala-bloom.webp",
    outWidth: 1500,
    blackFloor: 14,
    whiteCeil: 130,
    rgbGain: 2.2,
    saturation: 1.35,
    frameStride: 2,
    quality: 88,
    alphaQuality: 100,
  },
  // Urtuu reveal backdrop — the figure GIF behind "Introducing The Urtuu".
  // Matches the dust-figure tuning since both are dark-backdrop particle
  // animations punched through with `mix-blend-screen`.
  urtuu: {
    src: "public/media/urtuu/urtuu-script.gif",
    out: "public/media/urtuu/urtuu-script.webp",
    outWidth: 1500,
    blackFloor: 8,
    whiteCeil: 110,
    rgbGain: 3.0,
    saturation: 1.25,
    frameStride: 2,
    quality: 88,
    alphaQuality: 100,
  },
};

// Bilinear sample at fractional source coords.
function bilinear(buf, srcW, srcH, fx, fy) {
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(srcW - 1, x0 + 1);
  const y1 = Math.min(srcH - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const i00 = (y0 * srcW + x0) * 4;
  const i10 = (y0 * srcW + x1) * 4;
  const i01 = (y1 * srcW + x0) * 4;
  const i11 = (y1 * srcW + x1) * 4;
  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;
  return [
    buf[i00] * w00 + buf[i10] * w10 + buf[i01] * w01 + buf[i11] * w11,
    buf[i00 + 1] * w00 + buf[i10 + 1] * w10 + buf[i01 + 1] * w01 + buf[i11 + 1] * w11,
    buf[i00 + 2] * w00 + buf[i10 + 2] * w10 + buf[i01 + 2] * w01 + buf[i11 + 2] * w11,
  ];
}

// 2×2 super-sampled bilinear: average four sub-samples per output
// pixel for clean anti-aliased alpha and smooth RGB gradients.
function superSample(buf, srcW, srcH, ox, oy, sx, sy) {
  const cx = (ox + 0.5) * sx;
  const cy = (oy + 0.5) * sy;
  const off = 0.25;
  const s1 = bilinear(buf, srcW, srcH, cx - off * sx, cy - off * sy);
  const s2 = bilinear(buf, srcW, srcH, cx + off * sx, cy - off * sy);
  const s3 = bilinear(buf, srcW, srcH, cx - off * sx, cy + off * sy);
  const s4 = bilinear(buf, srcW, srcH, cx + off * sx, cy + off * sy);
  return [
    (s1[0] + s2[0] + s3[0] + s4[0]) * 0.25,
    (s1[1] + s2[1] + s3[1] + s4[1]) * 0.25,
    (s1[2] + s2[2] + s3[2] + s4[2]) * 0.25,
  ];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function saturate(r, g, b, k) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return [r, g, b];
  const lum = (max + min) * 0.5;
  return [
    lum + (r - lum) * k,
    lum + (g - lum) * k,
    lum + (b - lum) * k,
  ];
}

async function buildOne(name, cfg) {
  console.log(`\n[${name}] reading ${cfg.src}…`);
  const buf = readFileSync(cfg.src);
  console.log(`  source size: ${(buf.byteLength / 1_000_000).toFixed(1)} MB`);

  const gif = parseGIF(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  );
  const frames = decompressFrames(gif, true);
  const W = gif.lsd.width;
  const H = gif.lsd.height;
  console.log(`  ${frames.length} frames @ ${W}×${H}`);

  // Never upsample.
  const OUT_W = Math.min(cfg.outWidth, W);
  const OUT_H = Math.round((H / W) * OUT_W);
  const sx = W / OUT_W;
  const sy = H / OUT_H;
  console.log(`  output canvas: ${OUT_W}×${OUT_H} (truecolor, animated WebP)`);

  // Running RGBA canvas — GIFs only ship dirty patches per frame.
  const canvas = new Uint8ClampedArray(W * H * 4);
  let prevState = null;

  const keptFrames = [];
  const delays = [];

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const { left, top, width, height } = frame.dims;
    const patch = frame.patch;

    if (frame.disposalType === 3) prevState = new Uint8ClampedArray(canvas);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = (y * width + x) * 4;
        const di = ((top + y) * W + (left + x)) * 4;
        if (patch[si + 3] > 0) {
          canvas[di] = patch[si];
          canvas[di + 1] = patch[si + 1];
          canvas[di + 2] = patch[si + 2];
          canvas[di + 3] = 255;
        }
      }
    }

    const skip = f % cfg.frameStride !== 0;
    if (!skip) {
      const out = Buffer.alloc(OUT_W * OUT_H * 4);
      for (let oy = 0; oy < OUT_H; oy++) {
        for (let ox = 0; ox < OUT_W; ox++) {
          let [r, g, b] = superSample(canvas, W, H, ox, oy, sx, sy);

          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const alpha = Math.round(
            smoothstep(cfg.blackFloor, cfg.whiteCeil, luma) * 255
          );

          r = Math.min(255, r * cfg.rgbGain);
          g = Math.min(255, g * cfg.rgbGain);
          b = Math.min(255, b * cfg.rgbGain);
          [r, g, b] = saturate(r, g, b, cfg.saturation);

          const di = (oy * OUT_W + ox) * 4;
          out[di] = Math.max(0, Math.min(255, Math.round(r)));
          out[di + 1] = Math.max(0, Math.min(255, Math.round(g)));
          out[di + 2] = Math.max(0, Math.min(255, Math.round(b)));
          out[di + 3] = alpha;
        }
      }
      keptFrames.push(out);
      delays.push(Math.max(20, (frame.delay || 80) * cfg.frameStride));
    }

    if (frame.disposalType === 2) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const di = ((top + y) * W + (left + x)) * 4;
          canvas[di] = canvas[di + 1] = canvas[di + 2] = canvas[di + 3] = 0;
        }
      }
    } else if (frame.disposalType === 3 && prevState) {
      canvas.set(prevState);
    }

    if ((f + 1) % 5 === 0) {
      process.stdout.write(`  decoded ${f + 1}/${frames.length}\r`);
    }
  }

  // Encode each frame as a static WebP using sharp (native libwebp,
  // fast — ~50 ms/frame) and then mux them into one animation with
  // node-webpmux (which is just chunk concatenation, no encoding).
  console.log(
    `\n  encoding ${keptFrames.length} static WebP frames at q=${cfg.quality}…`
  );

  const animFrames = [];
  for (let i = 0; i < keptFrames.length; i++) {
    const webpBuf = await sharp(keptFrames[i], {
      raw: { width: OUT_W, height: OUT_H, channels: 4 },
    })
      .webp({
        quality: cfg.quality,
        alphaQuality: cfg.alphaQuality,
        lossless: false,
        smartSubsample: true,
        effort: 6,
      })
      .toBuffer();

    const frame = await WebP.Image.generateFrame({
      buffer: webpBuf,
      delay: delays[i],
      blend: false,
      dispose: true,
    });
    animFrames.push(frame);

    if ((i + 1) % 5 === 0) {
      process.stdout.write(`  encoded ${i + 1}/${keptFrames.length}\r`);
    }
  }

  console.log(`\n  muxing animation…`);
  await WebP.Image.save(cfg.out, {
    frames: animFrames,
    width: OUT_W,
    height: OUT_H,
    bgColor: [0, 0, 0, 0],
    loops: 0,
  });

  const sizeMB = (statSync(cfg.out).size / 1_000_000).toFixed(2);
  console.log(`  wrote ${cfg.out} (${sizeMB} MB, ${OUT_W}×${OUT_H})`);
}

// CLI -----------------------------------------------------------------
const which = process.argv[2] || "all";
const targets =
  which === "all"
    ? Object.entries(ASSETS)
    : ASSETS[which]
      ? [[which, ASSETS[which]]]
      : null;

if (!targets) {
  console.error(`Unknown asset "${which}". Choices: ${Object.keys(ASSETS).join(", ")}, all`);
  process.exit(1);
}

for (const [name, cfg] of targets) await buildOne(name, cfg);
console.log("\nDone.");
