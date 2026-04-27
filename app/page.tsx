import dynamic from "next/dynamic";
import EdgeGradient from "@/components/ui/EdgeGradient";
import ScrollRunway from "@/components/ui/ScrollRunway";
import ScrollHud from "@/components/ui/ScrollHud";
import CustomCursor from "@/components/ui/CustomCursor";
import TubesCursor from "@/components/ui/TubesCursor";
import HeroSection from "@/components/sections/HeroSection";
import ImmersiveSection from "@/components/sections/ImmersiveSection";
import GalaSection from "@/components/sections/GalaSection";
import UrtuuSection from "@/components/sections/UrtuuSection";
import RsvpSection from "@/components/sections/RsvpSection";

// Dynamic import keeps three.js out of the initial SSR bundle. The fullscreen
// LoadingOverlay covers the brief moment before this chunk evaluates.
const MainScene = dynamic(() => import("@/components/canvas/MainScene"), {
  ssr: false,
});

export default function Page() {
  return (
    <>
      {/* persistent WebGL canvas (z=0) — also renders DustFigure inside
          its stacking context so mix-blend-mode composites cleanly. */}
      <MainScene />
      {/* right-edge gradient overlay (z=5) */}
      <EdgeGradient />

      {/* each section is position:fixed (z=20) and fades via scroll */}
      <HeroSection />
      <ImmersiveSection />
      <GalaSection />
      <UrtuuSection />
      <RsvpSection />

      {/* scroll height provider — must exist so Lenis has range */}
      <ScrollRunway />

      {/* dev HUD — hidden in production */}
      <ScrollHud />

      {/* follow-cursor tubes effect (dim palette) — fills the screen under
          the dot/ring, mix-blend-screen against the scene */}
      <TubesCursor />

      {/* custom cursor — self-disables on touch devices */}
      <CustomCursor />
    </>
  );
}
