"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import particlesVert from "@/shaders/particles.vert.glsl";
import particlesFrag from "@/shaders/particles.frag.glsl";

import { createGpgpu, type GpgpuHandle } from "./gpgpu/createGpgpu";
import { seedField } from "./gpgpu/initParticles";
import { useGPUTier } from "@/hooks/useGPUTier";
import { sceneRef } from "@/hooks/useScrollProgress";
import { computeSceneUniforms } from "@/lib/sceneUniforms";
import { markReady } from "@/lib/loadGate";

// Flat (u, v) buffer — one per particle — so the vertex shader can sample
// its row/col in the GPGPU textures.
function makePidAttribute(size: number): Float32Array {
  const a = new Float32Array(size * size * 2);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const idx = (j * size + i) * 2;
      a[idx + 0] = (i + 0.5) / size;
      a[idx + 1] = (j + 0.5) / size;
    }
  }
  return a;
}

export default function ParticleField() {
  const profile = useGPUTier();
  const { gl, size: viewport } = useThree((s) => ({ gl: s.gl, size: s.size }));

  const size = profile.gpgpuSize;
  const gpgpuRef = useRef<GpgpuHandle | null>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particlesVert,
      fragmentShader: particlesFrag,
      uniforms: {
        uPosTex: { value: null },
        uVelTex: { value: null },
        uPointSize: { value: 4.0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.2) },
        uColorA: { value: new THREE.Color("#9fbaff") },
        uColorB: { value: new THREE.Color("#ffffff") },
        uVelocityToColor: { value: 1.2 },
        uOpacity: { value: 1.0 },
        // Drives the per-particle twinkle in the fragment shader.
        uTime: { value: 0 },
        uSideOnly: { value: 1.0 },
        uSideInner: { value: 0.28 },
        uSideOuter: { value: 0.62 },
        uSideInnerY: { value: 0.3 },
        uSideOuterY: { value: 0.7 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
  }, [gl]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pid = makePidAttribute(size);
    g.setAttribute("aPid", new THREE.BufferAttribute(pid, 2));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(size * size * 3), 3));
    return g;
  }, [size]);

  useEffect(() => {
    const { positions, velocities } = seedField(size);
    const sim = createGpgpu({
      size,
      initialPositions: positions,
      initialVelocities: velocities,
    });
    gpgpuRef.current = sim;
    return () => {
      sim.dispose();
      gpgpuRef.current = null;
    };
  }, [size]);

  useEffect(() => {
    material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 1.2);
  }, [viewport.width, viewport.height, gl, material]);

  // Latches once after the first successful GPGPU step so the loading overlay
  // can fade as soon as the particle field is actually rendering.
  const reportedReady = useRef(false);

  useFrame((state) => {
    const sim = gpgpuRef.current;
    if (!sim) return;

    const u = computeSceneUniforms(sceneRef.current.progress);

    // GPGPU velocity uniforms
    const vu = sim.uniforms.velocity;
    vu.uNoiseScale.value = u.noiseScale;
    vu.uNoiseStrength.value = u.noiseStrength;
    vu.uDrag.value = u.drag;
    vu.uMaxSpeed.value = u.maxSpeed;
    vu.uDt.value = 0.016;

    const attractorArr = vu.uAttractors.value as THREE.Vector4[];
    for (let i = 0; i < 4; i++) {
      const a = u.attractors[i];
      attractorArr[i].set(a.pos[0], a.pos[1], a.pos[2], a.strength);
    }

    const pu = sim.uniforms.position;
    pu.uDt.value = 0.016;
    pu.uOscAmp.value = u.oscAmp;

    sim.step(state.gl, state.clock.getElapsedTime());

    // Render uniforms
    material.uniforms.uPosTex.value = sim.positionTexture();
    material.uniforms.uVelTex.value = sim.velocityTexture();
    material.uniforms.uPointSize.value = u.pointSize;
    material.uniforms.uOpacity.value = u.opacity;
    material.uniforms.uVelocityToColor.value = u.velocityToColor;
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uSideOnly.value = u.sideOnly;
    material.uniforms.uSideInner.value = u.sideInner;
    material.uniforms.uSideOuter.value = u.sideOuter;
    material.uniforms.uSideInnerY.value = u.sideInnerY;
    material.uniforms.uSideOuterY.value = u.sideOuterY;
    (material.uniforms.uColorA.value as THREE.Color).setRGB(u.colorA[0], u.colorA[1], u.colorA[2]);
    (material.uniforms.uColorB.value as THREE.Color).setRGB(u.colorB[0], u.colorB[1], u.colorB[2]);

    if (!reportedReady.current) {
      reportedReady.current = true;
      markReady("particles");
    }
  });

  return (
    <points frustumCulled={false}>
      <primitive attach="geometry" object={geometry} />
      <primitive attach="material" object={material} />
    </points>
  );
}
