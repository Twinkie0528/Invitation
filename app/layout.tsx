import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import localFont from "next/font/local";
import Providers from "./providers";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import LumaAlphaFilter from "@/components/ui/LumaAlphaFilter";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Hand-script display face used for the personalised guest name in the
// Hero section. Self-hosted from /public/fonts so we own the cadence
// of the typeface and avoid the FOUT a remote handwriting font would
// introduce on first paint.
const ingkar = localFont({
  src: "../public/fonts/IngkarJanji.ttf",
  variable: "--font-ingkar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unitel 20 · The Urtuu — An Immersive Invitation",
  description:
    "Unitel Group's 20th anniversary immersive invitation. Where past and present converge within Urtuu.",
  openGraph: {
    title: "Unitel 20 · The Urtuu",
    description:
      "An immersive experience celebrating 20 years of Unitel Group.",
    type: "website",
  },
};

// Lock pinch-zoom and address-bar resize behaviour on mobile so the
// scroll-driven scenes don't get jolted by viewport-height jumps when the
// browser chrome shows/hides. `viewportFit: cover` lets the canvas extend
// under the iOS notch/home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#030308",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${ingkar.variable}`}
    >
      <head>
        {/* Critical hero — gate the FLIP handoff on the SVG lockup
            and pre-warm the hero MP4 so its first frame is decoded
            by the time the LoadingOverlay finishes flying.  The mp4
            preload uses `as="video"` (Chromium / Edge / modern Safari)
            with `type` so older browsers that don't recognise the
            hint just ignore it.  `fetchpriority="high"` lifts both
            assets above other late-discovered resources on Chromium
            engines so the hero never queues behind a third-party
            font CSS or analytics tag. */}
        <link rel="preload" as="image" href="/media/hero/unitel-20-lockup.svg" fetchPriority="high" />
        <link rel="preload" as="video" href="/media/hero/first.mp4" type="video/mp4" fetchPriority="high" />

        {/* Below-the-fold scenes — `prefetch` (not `preload`) tells
            the browser these are needed soon but at lower priority,
            so they only consume bandwidth once the critical hero
            assets above are in flight.  By the time the user
            scrolls past the hero, every section's mp4 / poster /
            shader is already cached and enters via `loadeddata`. */}
        <link rel="prefetch" as="video" href="/media/urtuu/urtuu-script.mp4" type="video/mp4" />
        <link rel="prefetch" as="video" href="/media/common/gala-bloom.mp4" type="video/mp4" />
        <link rel="prefetch" as="video" href="/media/ceo/mascot.mp4" type="video/mp4" />
        <link rel="prefetch" as="video" href="/media/rsvp/cosmos.mp4" type="video/mp4" />
        <link rel="prefetch" as="image" href="/media/urtuu/floor.jpg" />
        <link rel="prefetch" as="image" href="/media/common/shader.png" />
        <link rel="prefetch" as="image" href="/media/hero/shader.png" />
        <link rel="prefetch" as="image" href="/media/rsvp/cosmos.png" />
        <link rel="prefetch" as="image" href="/media/rsvp/invitation-title.png" />
        <link rel="prefetch" as="image" href="/media/rsvp/full.png" />
        <link rel="prefetch" as="image" href="/media/ceo/signature.svg" />
      </head>
      <body>
        <LumaAlphaFilter />
        <Providers>{children}</Providers>
        <LoadingOverlay />
      </body>
    </html>
  );
}
