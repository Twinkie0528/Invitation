"use client";

import { useEffect, useState } from "react";
import { getGPUTier, type TierResult } from "detect-gpu";

export type GpuProfile = {
  tier: 0 | 1 | 2 | 3;
  isMobile: boolean;
  gpgpuSize: number; // side length of the square particle texture
  particleCount: number;
  postFx: "full" | "light" | "none";
  ready: boolean;
};

// Defaults — used during SSR and before detect-gpu resolves.
// Tier 2 is the safe middle so initial paint is close to the final state
// without hydration mismatches.
//
// Counts kept deliberately low so each particle reads as a discrete
// twinkling star rather than fogging together into a dust haze.
const DEFAULT: GpuProfile = {
  tier: 2,
  isMobile: false,
  gpgpuSize: 58, // ~3,400 particles
  particleCount: 58 * 58,
  postFx: "light",
  ready: false,
};

function resolveProfile(t: TierResult): GpuProfile {
  const { tier, isMobile } = t;
  // Treat narrow viewports as mobile too — UA-based isMobile misses
  // desktops resized to phone widths and tablets in portrait. Doing the
  // viewport check here keeps the particle-count decision in one place.
  const narrowViewport =
    typeof window !== "undefined" && window.innerWidth < 768;
  const phoneLike = isMobile || narrowViewport;

  if (phoneLike || tier <= 1) {
    return {
      tier: tier as GpuProfile["tier"],
      isMobile: !!isMobile || narrowViewport,
      // Extra-sparse on phone-sized viewports so the cosmos reads as a
      // distant starfield, not a dense field competing with the dust
      // figure mascot above the copy.
      gpgpuSize: 32, // ~1,000 particles
      particleCount: 32 * 32,
      postFx: "none",
      ready: true,
    };
  }
  if (tier === 2) {
    return {
      tier: 2,
      isMobile: false,
      gpgpuSize: 58, // ~3,400 particles
      particleCount: 58 * 58,
      postFx: "light",
      ready: true,
    };
  }
  return {
    tier: 3,
    isMobile: false,
    gpgpuSize: 80, // ~6,400 particles
    particleCount: 80 * 80,
    postFx: "full",
    ready: true,
  };
}

export function useGPUTier(): GpuProfile {
  const [profile, setProfile] = useState<GpuProfile>(DEFAULT);

  useEffect(() => {
    let mounted = true;
    getGPUTier()
      .then((t) => {
        if (mounted) setProfile(resolveProfile(t));
      })
      .catch(() => {
        if (mounted) setProfile({ ...DEFAULT, ready: true });
      });
    return () => {
      mounted = false;
    };
  }, []);

  return profile;
}
