import Image from "next/image";

// The small "UNITEL" wordmark that sits at the top of every slide
// except the hero (which uses the full Unitel | 20th lockup in the centre).
// Anchored top-centre on every breakpoint to match the Figma frames —
// `inset-x-0 + flex justify-center` keeps it perfectly centred without
// the half-pixel rounding `left-1/2 -translate-x-1/2` introduces.
export default function TopMark() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-40 flex justify-center md:top-8 lg:top-10">
      <Image
        src="/media/common/unitel-wordmark.svg"
        alt="Unitel"
        width={120}
        height={28}
        priority
        className="h-[16px] w-auto md:h-[22px] lg:h-[26px]"
      />
    </div>
  );
}
