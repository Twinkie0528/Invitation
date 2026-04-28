"use client";

// Aurora atmospherics — wide soft curtains hugging the left and right
// margins plus a mid-screen flowing band that drifts diagonally. All
// keyframes only animate `transform` and `opacity`, both of which the
// browser's GPU compositor handles without invalidating layout — so the
// effect feels alive without costing layout/paint work each frame.
//
// Marked as a client component because styled-jsx requires it.
export default function EdgeGradient() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {/* Right primary — wide cool blue curtain. */}
      <div
        aria-hidden
        className="absolute right-0 top-0 h-full w-[42vw] aurora-right"
        style={{
          background:
            "radial-gradient(ellipse 75% 100% at 100% 50%, rgba(0, 84, 220, 0.5) 0%, rgba(0, 57, 255, 0.18) 30%, rgba(80, 30, 180, 0.10) 55%, rgba(0,0,0,0) 80%)",
          filter: "blur(32px)",
        }}
      />
      {/* Right secondary — cyan/green high band, offset timing for swirl. */}
      <div
        aria-hidden
        className="absolute right-0 top-0 h-full w-[32vw] aurora-right-alt"
        style={{
          background:
            "radial-gradient(ellipse 65% 90% at 100% 25%, rgba(0, 217, 95, 0.22) 0%, rgba(0, 200, 200, 0.10) 38%, rgba(0,0,0,0) 80%)",
          filter: "blur(40px)",
        }}
      />

      {/* Mid-screen flowing aurora band — slow diagonal drift across the
          centre of the viewport, the "polar light" the design references.
          Stays subtle so the section copy still reads cleanly above it. */}
      <div
        aria-hidden
        className="absolute -top-[18vh] -left-[12vw] h-[140vh] w-[80vw] aurora-mid"
        style={{
          background:
            "radial-gradient(ellipse 38% 92% at 50% 50%, rgba(80, 200, 255, 0.10) 0%, rgba(0, 217, 95, 0.07) 38%, rgba(160, 90, 255, 0.05) 62%, rgba(0,0,0,0) 80%)",
          filter: "blur(60px)",
          transform: "rotate(14deg)",
        }}
      />
      {/* Mid secondary — softer warm tail, opposite drift cadence. */}
      <div
        aria-hidden
        className="absolute -bottom-[20vh] right-[10vw] h-[120vh] w-[60vw] aurora-mid-alt"
        style={{
          background:
            "radial-gradient(ellipse 40% 85% at 50% 50%, rgba(255, 175, 120, 0.06) 0%, rgba(120, 90, 220, 0.05) 45%, rgba(0,0,0,0) 78%)",
          filter: "blur(70px)",
          transform: "rotate(-22deg)",
        }}
      />

      {/* Left primary — mirrors the right curtain so the page reads
          symmetrically. */}
      <div
        aria-hidden
        className="absolute left-0 top-0 h-full w-[42vw] aurora-left"
        style={{
          background:
            "radial-gradient(ellipse 75% 100% at 0% 50%, rgba(0, 84, 220, 0.5) 0%, rgba(0, 57, 255, 0.18) 30%, rgba(80, 30, 180, 0.10) 55%, rgba(0,0,0,0) 80%)",
          filter: "blur(32px)",
        }}
      />
      {/* Left secondary — mirrors the right cyan/green high band. */}
      <div
        aria-hidden
        className="absolute left-0 top-0 h-full w-[32vw] aurora-left-alt"
        style={{
          background:
            "radial-gradient(ellipse 65% 90% at 0% 25%, rgba(0, 217, 95, 0.22) 0%, rgba(0, 200, 200, 0.10) 38%, rgba(0,0,0,0) 80%)",
          filter: "blur(40px)",
        }}
      />

      <style jsx>{`
        @keyframes aurora-flow-a {
          0%   { opacity: 0.85; transform: translate3d(0,  0%, 0) scale(1, 1); }
          50%  { opacity: 1.0;  transform: translate3d(0, -5%, 0) scale(0.96, 1.08); }
          100% { opacity: 0.92; transform: translate3d(0,  4%, 0) scale(1.04, 0.96); }
        }
        @keyframes aurora-flow-b {
          0%   { opacity: 0.7;  transform: translate3d(0,  3%, 0) scale(1.02, 0.97); }
          50%  { opacity: 1.0;  transform: translate3d(0, -4%, 0) scale(0.97, 1.06); }
          100% { opacity: 0.85; transform: translate3d(0,  5%, 0) scale(1, 1.02); }
        }
        @keyframes aurora-mid-drift {
          0%   { opacity: 0.55; transform: translate3d(-3%,  2%, 0) rotate(14deg); }
          50%  { opacity: 0.95; transform: translate3d( 4%, -3%, 0) rotate(18deg); }
          100% { opacity: 0.7;  transform: translate3d(-1%,  4%, 0) rotate(11deg); }
        }
        @keyframes aurora-mid-alt-drift {
          0%   { opacity: 0.5;  transform: translate3d( 2%, -2%, 0) rotate(-22deg); }
          50%  { opacity: 0.85; transform: translate3d(-3%,  3%, 0) rotate(-18deg); }
          100% { opacity: 0.65; transform: translate3d( 1%, -4%, 0) rotate(-25deg); }
        }
        .aurora-right {
          animation: aurora-flow-a 22s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .aurora-right-alt {
          animation: aurora-flow-b 26s ease-in-out infinite alternate-reverse;
          will-change: transform, opacity;
        }
        .aurora-left {
          animation: aurora-flow-b 28s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .aurora-left-alt {
          animation: aurora-flow-a 24s ease-in-out infinite alternate-reverse;
          will-change: transform, opacity;
        }
        .aurora-mid {
          animation: aurora-mid-drift 32s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .aurora-mid-alt {
          animation: aurora-mid-alt-drift 38s ease-in-out infinite alternate-reverse;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .aurora-right,
          .aurora-right-alt,
          .aurora-left,
          .aurora-left-alt,
          .aurora-mid,
          .aurora-mid-alt {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
