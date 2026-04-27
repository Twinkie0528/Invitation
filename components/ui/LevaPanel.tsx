"use client";

import dynamic from "next/dynamic";

// Only mount in development. Leva bundle is ~30 KB and useless in prod.
const Leva = dynamic(() => import("leva").then((m) => m.Leva), { ssr: false });

export default function LevaPanel() {
  if (process.env.NODE_ENV === "production") return null;
  return <Leva collapsed oneLineLabels titleBar={{ title: "Unitel 20 · dev" }} />;
}
