// Position update pass. Reads previous position + freshly-updated velocity,
// integrates forward. Tiny per-UV oscillation keeps the field alive even
// when velocity approaches zero (prevents dead-looking particles).

precision highp float;

uniform sampler2D uPosTex;
uniform sampler2D uVelTex;

uniform float uTime;
uniform float uDt;
uniform float uOscAmp;   // per-particle shimmer amplitude

varying vec2 vUv;

void main() {
  vec4 pos = texture2D(uPosTex, vUv);
  vec3 vel = texture2D(uVelTex, vUv).xyz;

  // Deterministic per-particle phase so each point gets its own shimmer.
  float phase = (vUv.x * 12.9898 + vUv.y * 78.233) * 43.758;
  vec3 osc = uOscAmp * vec3(
    sin(uTime * 1.1 + phase),
    sin(uTime * 1.3 + phase * 1.7),
    sin(uTime * 0.9 + phase * 2.3)
  );

  pos.xyz += vel * uDt + osc * uDt;

  gl_FragColor = pos;
}
