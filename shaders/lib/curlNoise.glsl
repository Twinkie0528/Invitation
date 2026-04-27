// Analytic curl of simplex noise — divergence-free, gives organic swirl.
// Requires snoise() from simplexNoise.glsl to be concatenated first.

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p_x0 = vec3(snoise(p - dx), snoise(p + vec3(10.0) - dx), snoise(p + vec3(20.0) - dx));
  vec3 p_x1 = vec3(snoise(p + dx), snoise(p + vec3(10.0) + dx), snoise(p + vec3(20.0) + dx));
  vec3 p_y0 = vec3(snoise(p - dy), snoise(p + vec3(10.0) - dy), snoise(p + vec3(20.0) - dy));
  vec3 p_y1 = vec3(snoise(p + dy), snoise(p + vec3(10.0) + dy), snoise(p + vec3(20.0) + dy));
  vec3 p_z0 = vec3(snoise(p - dz), snoise(p + vec3(10.0) - dz), snoise(p + vec3(20.0) - dz));
  vec3 p_z1 = vec3(snoise(p + dz), snoise(p + vec3(10.0) + dz), snoise(p + vec3(20.0) + dz));

  float x = (p_y1.z - p_y0.z) - (p_z1.y - p_z0.y);
  float y = (p_z1.x - p_z0.x) - (p_x1.z - p_x0.z);
  float z = (p_x1.y - p_x0.y) - (p_y1.x - p_y0.x);

  const float divisor = 1.0 / (2.0 * e);
  return normalize(vec3(x, y, z) * divisor);
}
