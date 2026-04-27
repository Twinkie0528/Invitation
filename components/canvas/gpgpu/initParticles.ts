// Seed RGBA float data for the GPGPU position + velocity textures.
// Returns two Float32Arrays of length size*size*4.

export type SeedResult = {
  positions: Float32Array;
  velocities: Float32Array;
};

// Uniform random point inside a sphere (rejection sampling — cheap, few iters).
function randomInSphere(r: number): [number, number, number] {
  while (true) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const z = Math.random() * 2 - 1;
    if (x * x + y * y + z * z <= 1) return [x * r, y * r, z * r];
  }
}

// Default "field" seed — particles scattered in a wide shell. This is the
// starfield starting state; later milestones swap the init via reseed().
export function seedField(size: number, radius = 2.8): SeedResult {
  const count = size * size;
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const [x, y, z] = randomInSphere(radius);
    positions[i * 4 + 0] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = 1.0; // life

    // Small initial jitter keeps the noise field from snapping awake.
    velocities[i * 4 + 0] = (Math.random() - 0.5) * 0.02;
    velocities[i * 4 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i * 4 + 2] = (Math.random() - 0.5) * 0.02;
    velocities[i * 4 + 3] = 0.0;
  }

  return { positions, velocities };
}
