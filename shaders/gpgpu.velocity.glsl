// Velocity update pass. Reads current velocity + position, applies curl-noise force,
// drag, and max-speed clamp. Attractor + mouse forces are stubs until M3/M4.

precision highp float;

uniform sampler2D uPosTex;
uniform sampler2D uVelTex;

uniform float uTime;
uniform float uDt;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uDrag;
uniform float uMaxSpeed;

// Stubs — wired in later milestones.
uniform vec4 uAttractors[4];    // xyz = position, w = strength
uniform vec3 uMouse;             // xyz = world-projected mouse; w=0 disabled
uniform float uMouseStrength;

varying vec2 vUv;

// ---- noise lib (concatenated at load time) ----
#pragma NOISE_LIB

vec3 applyAttractors(vec3 pos) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 a = uAttractors[i];
    if (a.w == 0.0) continue;
    vec3 dir = a.xyz - pos;
    float d = length(dir) + 1e-3;
    // Soft falloff — 1/(1+d^2) so close particles pull hardest.
    sum += normalize(dir) * a.w / (1.0 + d * d);
  }
  return sum;
}

vec3 mouseForce(vec3 pos) {
  if (uMouseStrength == 0.0) return vec3(0.0);
  vec3 dir = uMouse - pos;
  float d = length(dir) + 1e-3;
  return normalize(dir) * uMouseStrength / (1.0 + d * d);
}

void main() {
  vec4 pos = texture2D(uPosTex, vUv);
  vec4 vel = texture2D(uVelTex, vUv);

  vec3 curl = curlNoise(pos.xyz * uNoiseScale + vec3(uTime * 0.05)) * uNoiseStrength;
  vec3 force = curl + applyAttractors(pos.xyz) + mouseForce(pos.xyz);

  vec3 v = (vel.xyz + force * uDt) * uDrag;

  float s = length(v);
  if (s > uMaxSpeed) v *= uMaxSpeed / s;

  gl_FragColor = vec4(v, vel.w);
}
