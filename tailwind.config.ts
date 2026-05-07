import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unitel: {
          green: "#46C800",
          dark: "#030308",
          ink: "#0A0A12",
        },
        muted: {
          DEFAULT: "#6B7280",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        script: ["var(--font-ingkar)", "cursive"],
        lora: ["var(--font-lora)", "serif"],
      },
      letterSpacing: {
        ultra: "0.3em",
        extra: "0.2em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-cine": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
