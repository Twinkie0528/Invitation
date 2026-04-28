"use client";

import { useId, useMemo } from "react";

type Props = {
  className?: string;
  /** Random seed for star placement — keeps SSR/CSR output identical. */
  seed?: number;
  /** How densely the rider silhouette is filled (default 380). */
  particleCount?: number;
  /** How many background stars to scatter (default 220). */
  starCount?: number;
};

type Particle = {
  x: number;
  y: number;
  r: number;
  opacity: number;
};

// Tiny seedable PRNG (mulberry32) — gives deterministic output across
// SSR + CSR so React doesn't hydrate-mismatch when the same seed is
// passed in.
function makeRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stuff `count` particles into a rotated ellipse.  Used for blob-shaped
// body parts (rider torso, horse barrel, head, etc).
function fillEllipse(
  rng: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  rotation = 0,
  rMin = 0.5,
  rMax = 1.1,
  opacityMin = 0.7,
): Particle[] {
  const out: Particle[] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  for (let i = 0; i < count; i++) {
    const t = Math.sqrt(rng()); // bias slightly toward the edge
    const a = rng() * Math.PI * 2;
    const ex = Math.cos(a) * rx * t;
    const ey = Math.sin(a) * ry * t;
    out.push({
      x: cx + ex * cos - ey * sin,
      y: cy + ex * sin + ey * cos,
      r: rMin + rng() * (rMax - rMin),
      opacity: opacityMin + rng() * (1 - opacityMin),
    });
  }
  return out;
}

// Particles strewn along a Bézier curve — used for legs, neck, tail
// strokes that read better as flowing lines than as filled blobs.
function strokeCurve(
  rng: () => number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  count: number,
  thickness = 6,
  rMin = 0.4,
  rMax = 0.9,
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const t = rng();
    const u = 1 - t;
    // Cubic Bézier sample.
    const x =
      u * u * u * p0[0] +
      3 * u * u * t * p1[0] +
      3 * u * t * t * p2[0] +
      t * t * t * p3[0];
    const y =
      u * u * u * p0[1] +
      3 * u * u * t * p1[1] +
      3 * u * t * t * p2[1] +
      t * t * t * p3[1];
    // Perpendicular jitter so particles fan out around the curve
    // rather than drawing a hairline.  The 0.6 factor keeps the
    // strokes tight enough that the silhouette reads as a horse,
    // not as a smudge.
    const dx = (rng() - 0.5) * thickness * 0.6;
    const dy = (rng() - 0.5) * thickness * 0.6;
    out.push({
      x: x + dx,
      y: y + dy,
      r: rMin + rng() * (rMax - rMin),
      opacity: 0.78 + rng() * 0.22,
    });
  }
  return out;
}

// Build the horse + rider in a single galloping pose.  Coordinates are
// in the SVG's 800×500 viewBox, sitting roughly mid-frame.
function buildHorseRider(rng: () => number, total: number): Particle[] {
  const ps: Particle[] = [];

  // ---------- Horse barrel (main body) ----------
  ps.push(...fillEllipse(rng, 410, 285, 110, 42, Math.round(total * 0.20), -0.05, 0.55, 1.1));

  // ---------- Chest / shoulder mass ----------
  ps.push(...fillEllipse(rng, 510, 290, 38, 50, Math.round(total * 0.06), 0.18));

  // ---------- Neck — curves up from chest to head ----------
  ps.push(
    ...strokeCurve(
      rng,
      [515, 270], [555, 220], [595, 195], [625, 195],
      Math.round(total * 0.07),
      18,
    ),
  );

  // ---------- Head ----------
  ps.push(...fillEllipse(rng, 645, 200, 30, 16, Math.round(total * 0.05), 0.05));
  // Muzzle tip — a few particles trailing forward.
  ps.push(...fillEllipse(rng, 678, 207, 8, 5, Math.round(total * 0.012), 0));
  // Mane — flowing along the top of the neck.
  ps.push(
    ...strokeCurve(
      rng,
      [620, 192], [600, 178], [575, 196], [545, 220],
      Math.round(total * 0.04),
      14,
      0.4,
      0.85,
    ),
  );

  // ---------- Front legs — reaching forward in gallop ----------
  // Front-near leg.
  ps.push(
    ...strokeCurve(
      rng,
      [505, 320], [535, 350], [560, 360], [585, 380],
      Math.round(total * 0.04),
      6,
    ),
  );
  // Front-far leg (slightly behind, smaller).
  ps.push(
    ...strokeCurve(
      rng,
      [490, 320], [515, 360], [540, 380], [555, 400],
      Math.round(total * 0.035),
      5,
      0.4,
      0.8,
    ),
  );

  // ---------- Back legs — pushing off, folded under ----------
  // Back-near leg.
  ps.push(
    ...strokeCurve(
      rng,
      [330, 320], [305, 360], [285, 365], [270, 395],
      Math.round(total * 0.04),
      6,
    ),
  );
  // Back-far leg.
  ps.push(
    ...strokeCurve(
      rng,
      [320, 318], [298, 348], [278, 360], [255, 388],
      Math.round(total * 0.035),
      5,
      0.4,
      0.8,
    ),
  );

  // ---------- Tail — flowing behind ----------
  ps.push(
    ...strokeCurve(
      rng,
      [302, 258], [262, 244], [220, 246], [185, 268],
      Math.round(total * 0.05),
      14,
      0.4,
      0.95,
    ),
  );

  // ---------- Rider torso — leaning forward ----------
  ps.push(...fillEllipse(rng, 430, 232, 18, 28, Math.round(total * 0.06), -0.30));

  // ---------- Rider arm — reaching toward the reins ----------
  ps.push(
    ...strokeCurve(
      rng,
      [438, 222], [475, 218], [510, 210], [545, 218],
      Math.round(total * 0.025),
      5,
    ),
  );

  // ---------- Rider head ----------
  ps.push(...fillEllipse(rng, 418, 198, 13, 15, Math.round(total * 0.025), 0));

  // ---------- Rider leg / kit fold against horse ----------
  ps.push(
    ...strokeCurve(
      rng,
      [420, 260], [430, 280], [438, 300], [430, 320],
      Math.round(total * 0.02),
      5,
    ),
  );

  // ---------- A few drifting "speed dust" particles trailing the
  //            gallop, fading off behind the tail / hooves. ----------
  ps.push(
    ...fillEllipse(rng, 150, 320, 70, 30, Math.round(total * 0.05), 0, 0.3, 0.75, 0.25),
  );

  return ps;
}

// Background star field — sparse, multi-size dots scattered across the
// whole viewBox.  Some twinkle (subset chosen by index parity) so the
// scene feels alive without burning paint cycles.
function buildStarField(rng: () => number, count: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rng() * 800,
      y: rng() * 500,
      r: 0.25 + rng() * 1.0,
      opacity: 0.15 + rng() * 0.65,
    });
  }
  return out;
}

// Cosmos-style particle silhouette — a hero on a galloping horse,
// sketched out of small white dots over a starfield.  Rendered as
// pure SVG so it scales crisply at any size and weighs nothing
// compared to a full canvas.  Dropped behind the RSVP card to echo
// the Figma "stars + figure" treatment.
export default function HorseRiderParticles({
  className,
  seed = 7,
  particleCount = 900,
  starCount = 130,
}: Props) {
  const id = useId();

  // Generate the two particle sets once per (seed, count) tuple.  The
  // arrays survive re-renders so React isn't redoing 600 random draws
  // every frame the parent fades in.
  const { stars, figure } = useMemo(() => {
    const starsRng = makeRandom(seed);
    const figureRng = makeRandom(seed + 999);
    return {
      stars: buildStarField(starsRng, starCount),
      figure: buildHorseRider(figureRng, particleCount),
    };
  }, [seed, particleCount, starCount]);

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        {/* Soft halo behind the rider so the silhouette pops on
            black without a hard outline. */}
        <radialGradient id={`${id}-halo`} cx="50%" cy="58%" r="60%">
          <stop offset="0%" stopColor="#9CC0FF" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#73A4FF" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo — keeps the figure from feeling pasted on. */}
      <ellipse cx="420" cy="290" rx="340" ry="180" fill={`url(#${id}-halo)`} />

      {/* Background stars — twinkle on every 9th star so the
          motion is sparse enough to read as ambient. */}
      <g>
        {stars.map((s, i) => {
          const twinkle = i % 9 === 0;
          return (
            <circle
              key={`s-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="white"
              opacity={s.opacity}
            >
              {twinkle && (
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${Math.min(1, s.opacity + 0.5)};${s.opacity}`}
                  dur={`${2.4 + (i % 5) * 0.6}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          );
        })}
      </g>

      {/* Horse + rider silhouette particles.  Slight blue tint on the
          brighter dots gives the figure a moonlit feel without
          drowning it. */}
      <g>
        {figure.map((p, i) => (
          <circle
            key={`f-${i}`}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={i % 13 === 0 ? "#cfe0ff" : "white"}
            opacity={p.opacity}
          />
        ))}
      </g>
    </svg>
  );
}
