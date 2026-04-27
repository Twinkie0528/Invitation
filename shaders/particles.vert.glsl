// Particle vertex shader. Each vertex is a zero-dimensional GL_POINT whose
// world position is sampled from the GPGPU position texture.

precision highp float;

uniform sampler2D uPosTex;
uniform sampler2D uVelTex;

uniform float uPointSize;
uniform float uPixelRatio;

attribute vec2 aPid;  // (u,v) coord in the GPGPU textures, 0..1

varying float vVelMag;
varying float vLife;
varying float vNdcX;
varying float vNdcY;

void main() {
  vec4 pos = texture2D(uPosTex, aPid);
  vec3 vel = texture2D(uVelTex, aPid).xyz;

  vLife = pos.w;
  vVelMag = length(vel);

  vec4 mv = modelViewMatrix * vec4(pos.xyz, 1.0);
  vec4 clip = projectionMatrix * mv;
  gl_Position = clip;

  // NDC x/y in [-1, 1] — the fragment shader uses both to clear a
  // rectangular content zone in the centre of the viewport.
  float w = max(clip.w, 1e-4);
  vNdcX = clip.x / w;
  vNdcY = clip.y / w;

  // Constant point size — independent of distance. Any perspective scaling
  // produced occasional bright "balloon" particles when a point drifted
  // toward the camera near-plane, which read as a bug against the calm
  // side rails.
  gl_PointSize = uPointSize * uPixelRatio;
}
