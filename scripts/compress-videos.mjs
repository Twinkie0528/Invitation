// One-shot mp4 compression for public/media — re-encodes every section
// background to libx264 CRF 23 (visually lossless for our particle / bloom
// sources because of the dark backdrops + blend modes that hide
// compression artifacts), strips the audio track (every video is muted in
// the page), and rewrites the moov atom to the front via faststart so
// playback can begin while bytes are still streaming.
//
// Run:  npm run compress-videos
//
// Outputs replace the originals.  A copy of the source is written to
// public/media/_originals/ first so we can A/B compare or restore if
// something looks worse than expected.
//
// Re-encoding is idempotent for the purposes of git: running this on an
// already-compressed file just re-encodes it again at CRF 23.  If the
// originals folder already exists for a given file, we treat that as the
// source of truth (so the script can be re-run safely without compounding
// quality loss).

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MEDIA_DIR = resolve(ROOT, "public/media");
const ORIGINALS_DIR = resolve(MEDIA_DIR, "_originals");
const FFMPEG = ffmpegInstaller.path;

// Quality settings.  CRF 23 = "high" preset — visually indistinguishable
// from the source on dark/atmospheric content (every video here is a
// particle figure or bloom glow against a black plate, plus most are
// rendered with mix-blend-mode: screen which further hides any blocky
// fallback).  preset=slow trades encode time for ~10 % smaller files.
//
// CRF_LADDER is tried in order: if the first CRF produces a file LARGER
// than the source (rare but possible when the original is already well-
// compressed), we step up to the next CRF.  The script never replaces a
// file unless the result is genuinely smaller.
const CRF_LADDER = ["23", "26", "28"];
const PRESET = "slow";
// Cap height so a portrait 1842×2304 source like mascot.mp4 doesn't
// keep its print-resolution dimensions on the web.  Both width and
// height are explicitly forced to even numbers via `trunc(... /2)*2`
// because libx264 rejects odd dimensions and `scale=-2` alone does not
// always round correctly when combined with conditional expressions.
// Smaller sources are NOT upscaled (the min() guard keeps the original
// height).
const MAX_HEIGHT = 1080;
const SCALE_FILTER = `scale='trunc(iw*min(1\\,${MAX_HEIGHT}/ih)/2)*2':'trunc(min(ih\\,${MAX_HEIGHT})/2)*2'`;

function findMp4s(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip the originals backup — those are the source of truth.
      if (full === ORIGINALS_DIR) continue;
      out.push(...findMp4s(full));
    } else if (extname(name).toLowerCase() === ".mp4") {
      out.push(full);
    }
  }
  return out;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, {
    stdio: ["ignore", "ignore", "pipe"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const tail = (result.stderr ?? "").split(/\r?\n/).slice(-12).join("\n");
    throw new Error(`ffmpeg exit ${result.status}\n${tail}`);
  }
}

if (!existsSync(MEDIA_DIR)) {
  console.error(`ERROR: ${MEDIA_DIR} not found.`);
  process.exit(1);
}

const sources = findMp4s(MEDIA_DIR);
if (sources.length === 0) {
  console.error("No mp4 files found.");
  process.exit(1);
}

mkdirSync(ORIGINALS_DIR, { recursive: true });

console.log(`Found ${sources.length} mp4 files. CRF ladder ${CRF_LADDER.join("→")}, preset ${PRESET}, max height ${MAX_HEIGHT}px, no audio.\n`);

let totalBefore = 0;
let totalAfter = 0;
const summary = [];

for (const src of sources) {
  const rel = relative(MEDIA_DIR, src);
  const backupPath = join(ORIGINALS_DIR, rel);
  mkdirSync(dirname(backupPath), { recursive: true });

  // If we already have a backup, treat THAT as the source so the
  // script is idempotent (re-running won't double-encode).
  const sourceForEncode = existsSync(backupPath) ? backupPath : src;
  if (sourceForEncode === src) {
    copyFileSync(src, backupPath);
  }

  const beforeBytes = statSync(sourceForEncode).size;
  const tmpOut = `${src}.tmp.mp4`;

  process.stdout.write(`  ${rel.padEnd(30)} ${fmtBytes(beforeBytes).padStart(10)} → `);

  let afterBytes = -1;
  let usedCrf = "";

  for (const crf of CRF_LADDER) {
    if (existsSync(tmpOut)) unlinkSync(tmpOut);
    try {
      runFfmpeg([
        "-y",
        "-i", sourceForEncode,
        "-vf", SCALE_FILTER,
        "-c:v", "libx264",
        "-crf", crf,
        "-preset", PRESET,
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        tmpOut,
      ]);
    } catch (err) {
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      process.stdout.write(`FAILED at CRF ${crf}\n`);
      console.error(`    ${err.message}`);
      afterBytes = -1;
      break;
    }

    const candidate = statSync(tmpOut).size;
    if (candidate < beforeBytes) {
      afterBytes = candidate;
      usedCrf = crf;
      break;
    }
    // Else loop and try the next CRF.
  }

  if (afterBytes < 0) {
    if (existsSync(tmpOut)) unlinkSync(tmpOut);
    if (afterBytes === -1) {
      // Already logged the failure above for the caught case.  For the
      // "every CRF grew" case we log here.
      process.stdout.write(`(skipped — every CRF would grow the file)\n`);
    }
    continue;
  }

  // Swap into place.
  unlinkSync(src);
  renameSync(tmpOut, src);

  const pct = (100 * (1 - afterBytes / beforeBytes)).toFixed(1);
  const crfTag = usedCrf === CRF_LADDER[0] ? "" : `  (CRF ${usedCrf})`;
  process.stdout.write(`${fmtBytes(afterBytes).padStart(10)}  -${pct}%${crfTag}\n`);

  totalBefore += beforeBytes;
  totalAfter += afterBytes;
  summary.push({ rel, beforeBytes, afterBytes, crf: usedCrf });
}

console.log(`\n  ${"TOTAL".padEnd(30)} ${fmtBytes(totalBefore).padStart(10)} → ${fmtBytes(totalAfter).padStart(10)}  -${(100 * (1 - totalAfter / totalBefore)).toFixed(1)}%`);
console.log(`\nOriginals backed up to:`);
console.log(`  ${ORIGINALS_DIR}`);
console.log(`(Add public/media/_originals to .gitignore to keep them out of git.)`);
