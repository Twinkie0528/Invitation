"use client";

import ParticleField from "./ParticleField";

// Everything that lives inside the persistent R3F canvas. The hero opens
// on a clean particle field — the previous Galaxy nebula shader has been
// retired so the dust-figure GIF reads against an unembellished backdrop.
export default function SceneContent() {
  return (
    <>
      <ParticleField />
    </>
  );
}
