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
        {/* Hero assets are above the fold and gate the loading overlay —
            preload kicks off their network fetch before React hydrates.
            signature.png is intentionally not preloaded; it appears below
            the body copy and isn't on the loading-screen critical path. */}
        <link
          rel="preload"
          as="image"
          href="/media/hero/dust-figure.webp"
          type="image/webp"
        />
        <link rel="preload" as="image" href="/media/hero/unitel-20-lockup.svg" />
      </head>
      <body>
        <LumaAlphaFilter />
        <Providers>{children}</Providers>
        <LoadingOverlay />
      </body>
    </html>
  );
}
