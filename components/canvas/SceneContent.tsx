"use client";

import ParticleField from "./ParticleField";

// Everything that lives inside the persistent R3F canvas.  The hero
// opens on a clean particle field — the heavier Galaxy nebula shader
// is retired and the dust-figure mascot has been removed entirely.
export default function SceneContent() {
  return (
    <>
      <ParticleField />
    </>
  );
}
