import dynamic from "next/dynamic";
import EdgeGradient from "@/components/ui/EdgeGradient";
import ScrollRunway from "@/components/ui/ScrollRunway";
import ScrollHud from "@/components/ui/ScrollHud";
import HeroSection from "@/components/sections/HeroSection";
import GalaSection from "@/components/sections/GalaSection";
import UrtuuSection from "@/components/sections/UrtuuSection";
import RsvpSection from "@/components/sections/RsvpSection";

const MainScene = dynamic(() => import("@/components/canvas/MainScene"), {
  ssr: false,
});

export default function InvitationLayout() {
  return (
    <>
      <MainScene />
      <EdgeGradient />

      <HeroSection />
      <GalaSection />
      <UrtuuSection />
      <RsvpSection />

      <ScrollRunway />
      <ScrollHud />
    </>
  );
}
