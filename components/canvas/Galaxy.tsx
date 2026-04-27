"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneRef } from "@/hooks/useScrollProgress";
import { useGPUTier } from "@/hooks/useGPUTier";

/**
 * Black-galaxy / green-star nebula shader by Matthias Hurrle (@atzedent).
 *
 * Used as a HEADER-ONLY effect: it's fully visible during the hero scroll
 * window and fades out as the page moves into `dissolve`. Once invisible
 * the mesh toggles off so the fullscreen fragment shader stops sampling
 * and the GPU is free for the particle field and tubes cursor.
 *
 * Loop counts are baked at compile time via shader defines, picked from
 * the GPU tier — fragment cost dominates because the shader rasterises the
 * full viewport, so dropping octaves is the cheapest meaningful win.
 */
export default function Galaxy() {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { size, viewport } = useThree();
  const profile = useGPUTier();

  // Tier 1 and below skip the shader entirely — the particle field alone
  // already carries the hero stage on those devices.
  const skip = profile.tier <= 1;

  const { fbmOct, starOct } = useMemo(() => {
    if (profile.tier >= 3) return { fbmOct: 5, starOct: 12 };
    return { fbmOct: 3, starOct: 8 };
  }, [profile.tier]);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
      fade: { value: 1 },
    }),
    [],
  );

  const defines = useMemo(
    () => ({ FBM_OCT: String(fbmOct), STAR_OCT: starOct.toFixed(1) }),
    [fbmOct, starOct],
  );

  // Maps scroll progress → fade target. Pulled in earlier than the original
  // 0.08–0.18 so the expensive fragment pass shuts off before the hero copy
  // is fully read — the field has visually receded by 0.13 anyway.
  const targetForProgress = (p: number): number => {
    if (p <= 0.06) return 1;
    if (p >= 0.13) return 0;
    return 1 - (p - 0.06) / 0.07;
  };

  useFrame((_, delta) => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh) return;

    const u = mat.uniforms;

    // Scroll-driven fade — lerped so cross-fades stay smooth.
    const target = targetForProgress(sceneRef.current.progress);
    u.fade.value += (target - u.fade.value) * Math.min(1, delta * 6);

    // Skip the fullscreen shader pass entirely once it's effectively dark.
    mesh.visible = u.fade.value > 0.003;
    if (!mesh.visible) return;

    u.time.value += delta;
    const dpr = viewport.dpr;
    u.resolution.value.set(size.width * dpr, size.height * dpr);
  });

  if (skip) return null;

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-1000}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3]}
          count={3}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        defines={defines}
        depthTest={false}
        depthWrite={false}
        transparent={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2  resolution;
  uniform float time;
  uniform float fade;

  #ifndef FBM_OCT
  #define FBM_OCT 5
  #endif
  #ifndef STAR_OCT
  #define STAR_OCT 12.0
  #endif

  #define FC gl_FragCoord.xy
  #define T  time
  #define R  resolution
  #define MN min(R.x, R.y)

  float rnd(vec2 p) {
    p = fract(p * vec2(12.9898, 78.233));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
  }

  float noise(in vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = rnd(i);
    float b = rnd(i + vec2(1.0, 0.0));
    float c = rnd(i + vec2(0.0, 1.0));
    float d = rnd(i + 1.0);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float t = 0.0, a = 1.0;
    mat2 m = mat2(1.0, -0.5, 0.2, 1.2);
    for (int i = 0; i < FBM_OCT; i++) {
      t += a * noise(p);
      p *= 2.0 * m;
      a *= 0.5;
    }
    return t;
  }

  float clouds(vec2 p) {
    float d = 1.0, t = 0.0;
    for (float i = 0.0; i < 3.0; i++) {
      float a = d * fbm(i * 10.0 + p.x * 0.2 + 0.2 * (1.0 + i) * p.y + d + i * i + p);
      t = mix(t, d, a);
      d = a;
      p *= 2.0 / (i + 1.0);
    }
    return t;
  }

  void main() {
    vec2 uv = (FC - 0.5 * R) / MN;
    vec2 st = uv * vec2(2.0, 1.0);

    vec3 col = vec3(0.0);
    float bg = clouds(vec2(st.x + T * 0.5, -st.y));

    uv *= 1.0 - 0.3 * (sin(T * 0.2) * 0.5 + 0.5);

    // Deliberately dim — this is an ambient header glow, not a star field.
    // Values are ~3x fainter than the original demo so the hero reads as a
    // clean dark stage with a hint of green depth underneath.
    vec3 starTint  = vec3(0.06, 0.30, 0.13);
    vec3 glowTint  = vec3(0.03, 0.22, 0.08);
    vec3 cloudTint = vec3(0.003, 0.017, 0.007);

    for (float i = 1.0; i < STAR_OCT; i++) {
      uv += 0.1 * cos(i * vec2(0.1 + 0.01 * i, 0.8) + i * i + T * 0.5 + 0.1 * uv.x);
      vec2 p = uv;
      float d = length(p);

      col += 0.00125 / d * starTint * (cos(sin(i) * vec3(0.4, 0.2, 0.6)) + 1.0);

      float b = noise(i + p + bg * 1.731);
      col += 0.002 * b / length(max(p, vec2(b * p.x * 0.02, p.y))) * glowTint;

      col = mix(col, cloudTint * bg, d);
    }

    // 0.4 is an additional global cap — at full fade the output is still
    // gentle enough that DOM text sits cleanly on top.
    gl_FragColor = vec4(col * fade * 0.4, 1.0);
  }
`;
