// Particle fragment shader. Circular point with soft alpha, color mixes
// from uColorA → uColorB → white as velocity rises.

precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uVelocityToColor;
uniform float uOpacity;
uniform float uSideOnly;     // 0 = uniform field, 1 = fully clear the centre
uniform float uSideInner;    // NDC |x| below which X-mask is dimmest
uniform float uSideOuter;    // NDC |x| above which X-mask is at full brightness
uniform float uSideInnerY;   // NDC |y| below which Y-mask is dimmest
uniform float uSideOuterY;   // NDC |y| above which Y-mask is at full brightness

varying float vVelMag;
varying float vLife;
varying float vNdcX;
varying float vNdcY;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);

  // Hard reject outside the circle.
  if (d > 0.5) discard;

  // Core bright, soft falloff at rim.
  float alpha = smoothstep(0.5, 0.0, d);
  alpha = pow(alpha, 1.6);

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

  gl_FragColor = vec4(col, alpha * uOpacity * clamp(vLife, 0.0, 1.0) * sideMask);
}
