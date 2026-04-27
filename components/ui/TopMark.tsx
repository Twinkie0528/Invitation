import Image from "next/image";

// The small "UNITEL" wordmark that sits in the top-right of every slide
// except the hero (which uses the full Unitel | 20th lockup in the center).
// Smaller positioning + size on mobile so it doesn't crowd the heading.
export default function TopMark() {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-40 md:right-10 md:top-8 lg:right-12 lg:top-10">
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
