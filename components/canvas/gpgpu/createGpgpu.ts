import * as THREE from "three";

import posFrag from "@/shaders/gpgpu.position.glsl";
import velFrag from "@/shaders/gpgpu.velocity.glsl";
import quadVert from "@/shaders/gpgpu.quad.vert.glsl";
import simplex from "@/shaders/lib/simplexNoise.glsl";
import curl from "@/shaders/lib/curlNoise.glsl";

// Concatenate noise libs into the velocity shader where the marker lives.
// This avoids pulling in a full glsl-include preprocessor just for two files.
const velFragFinal = velFrag.replace("#pragma NOISE_LIB", `${simplex}\n${curl}`);

export type GpgpuHandle = {
  size: number;
  count: number;
  positionTexture: () => THREE.Texture;
  velocityTexture: () => THREE.Texture;
  uniforms: {
    velocity: Record<string, THREE.IUniform>;
    position: Record<string, THREE.IUniform>;
  };
  step: (renderer: THREE.WebGLRenderer, time: number) => void;
  dispose: () => void;
};

export type GpgpuInit = {
  size: number;
  initialPositions: Float32Array; // length = size*size*4, RGBA
  initialVelocities: Float32Array; // length = size*size*4, RGBA
};

// Build a pair of ping-pong render targets.
function makeTargets(size: number): [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] {
  const opts: THREE.RenderTargetOptions = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  return [
    new THREE.WebGLRenderTarget(size, size, opts),
    new THREE.WebGLRenderTarget(size, size, opts),
  ];
}

function seedTargetWith(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  data: Float32Array,
  size: number,
): void {
  const seed = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  seed.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tSeed: { value: seed } },
    vertexShader: quadVert,
    fragmentShader: /* glsl */ `
      uniform sampler2D tSeed;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tSeed, vUv);
      }
    `,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const cam = new THREE.Camera();
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  mat.dispose();
  seed.dispose();
}

export function createGpgpu(init: GpgpuInit): GpgpuHandle {
  const { size, initialPositions, initialVelocities } = init;
  const count = size * size;

  const [posA, posB] = makeTargets(size);
  const [velA, velB] = makeTargets(size);
  let posRead = posA;
  let posWrite = posB;
  let velRead = velA;
  let velWrite = velB;
  let seeded = false;

  const velUniforms: Record<string, THREE.IUniform> = {
    uPosTex: { value: posRead.texture },
    uVelTex: { value: velRead.texture },
    uTime: { value: 0 },
    uDt: { value: 0.016 },
    uNoiseScale: { value: 0.8 },
    uNoiseStrength: { value: 0.22 },
    uDrag: { value: 0.97 },
    uMaxSpeed: { value: 0.35 },
    // Stubs — inactive until M3/M4.
    uAttractors: {
      value: [
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
      ],
    },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uMouseStrength: { value: 0 },
  };

  const posUniforms: Record<string, THREE.IUniform> = {
    uPosTex: { value: posRead.texture },
    uVelTex: { value: velWrite.texture }, // use freshly-updated velocity
    uTime: { value: 0 },
    uDt: { value: 0.016 },
    uOscAmp: { value: 0.05 },
  };

  const velMat = new THREE.ShaderMaterial({
    uniforms: velUniforms,
    vertexShader: quadVert,
    fragmentShader: velFragFinal,
  });
  const posMat = new THREE.ShaderMaterial({
    uniforms: posUniforms,
    vertexShader: quadVert,
    fragmentShader: posFrag,
  });

  const quad = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(quad, velMat);
  scene.add(mesh);
  const cam = new THREE.Camera();

  const step = (renderer: THREE.WebGLRenderer, time: number) => {
    if (!seeded) {
      seedTargetWith(renderer, posRead, initialPositions, size);
      seedTargetWith(renderer, velRead, initialVelocities, size);
      seeded = true;
    }

    const prevTarget = renderer.getRenderTarget();

    // --- velocity pass ---
    velUniforms.uPosTex.value = posRead.texture;
    velUniforms.uVelTex.value = velRead.texture;
    velUniforms.uTime.value = time;
    mesh.material = velMat;
    renderer.setRenderTarget(velWrite);
    renderer.render(scene, cam);

    // --- position pass ---
    posUniforms.uPosTex.value = posRead.texture;
    posUniforms.uVelTex.value = velWrite.texture;
    posUniforms.uTime.value = time;
    mesh.material = posMat;
    renderer.setRenderTarget(posWrite);
    renderer.render(scene, cam);

    renderer.setRenderTarget(prevTarget);

    // --- swap ---
    [posRead, posWrite] = [posWrite, posRead];
    [velRead, velWrite] = [velWrite, velRead];
  };

  const dispose = () => {
    posA.dispose();
    posB.dispose();
    velA.dispose();
    velB.dispose();
    velMat.dispose();
    posMat.dispose();
    quad.dispose();
  };

  return {
    size,
    count,
    positionTexture: () => posRead.texture,
    velocityTexture: () => velRead.texture,
    uniforms: { velocity: velUniforms, position: posUniforms },
    step,
    dispose,
  };
}
