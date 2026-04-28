// Particle fragment shader. Each point is rendered as a shining star —
// a tight bright core wrapped in a softer halo, modulated by a per-
// particle twinkle so the field reads as a living constellation rather
// than uniform dust.

precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uVelocityToColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSideOnly;     // 0 = uniform field, 1 = fully clear the centre
uniform float uSideInner;    // NDC |x| below which X-mask is dimmest
uniform float uSideOuter;    // NDC |x| above which X-mask is at full brightness
uniform float uSideInnerY;   // NDC |y| below which Y-mask is dimmest
uniform float uSideOuterY;   // NDC |y| above which Y-mask is at full brightness

varying float vVelMag;
varying float vLife;
varying float vNdcX;
varying float vNdcY;
varying float vTwinklePhase;
varying float vTwinkleSpeed;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);

  // Hard reject outside the circle.
  if (d > 0.5) discard;

  // Two-zone falloff: a tight pin-point core (high power) plus a softer
  // wide halo. Adding them together gives the "shining star" silhouette
  // — sharp center, glowing rim — that pure smoothstep cannot produce.
  // Core punched harder + halo widened so each star throws a real glow.
  float core = pow(1.0 - smoothstep(0.0, 0.16, d), 2.4);
  float halo = pow(1.0 - smoothstep(0.0, 0.5, d), 1.5);
  float intensity = core * 2.2 + halo * 0.85;

  // Per-particle twinkle — biased sine pulse with hashed phase + speed
  // so each star spends most of its time at a moderate glow but flashes
  // sharply on the upbeat. The curve `pow((sin+1)/2, 3)` gives that
  // "scintillating starlight" feel: long quiet troughs, brief bright
  // peaks. Range ≈ [0.20, 1.55].
  float tw = sin(uTime * vTwinkleSpeed + vTwinklePhase);
  float pulse = pow(0.5 + 0.5 * tw, 3.0);
  float twinkle = 0.20 + 1.35 * pulse;

  float t = clamp(vVelMag * uVelocityToColor, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, t);
  // High-velocity particles clamp toward white.
  col = mix(col, vec3(1.0), pow(t, 3.0));

  // Rectangular content mask — particles fade out inside the centre
  // rectangle defined by (uSideInner..uSideOuter) × (uSideInnerY..uSideOuterY).
  // max() of the two smoothsteps means a point renders if it is past the
  // edge on EITHER axis (top/bottom rows, left/right columns + corners),
  // and only the central rectangle is fully cleared. When uSideOnly = 0
  // the mask collapses to 1 (uniform field everywhere).
  float sideX = smoothstep(uSideInner, uSideOuter, abs(vNdcX));
  float sideY = smoothstep(uSideInnerY, uSideOuterY, abs(vNdcY));
  float sides = max(sideX, sideY);
  float sideMask = mix(1.0, sides, uSideOnly);

  float alpha = intensity * twinkle * uOpacity * clamp(vLife, 0.0, 1.0) * sideMask;
  gl_FragColor = vec4(col, alpha);
}
