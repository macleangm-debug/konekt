import React, { useState, useEffect } from "react";

/**
 * AppLauncher — Premium full-screen entry animation.
 * Uses the exact Connected Triad logo geometry.
 * Shows on every website launch / hard refresh.
 * Skips on internal SPA navigation (React state persists).
 *
 * Animation sequence (~2.5s total):
 *   1. Nodes appear one by one (fade + scale)
 *   2. Connector lines draw in (stroke-dashoffset)
 *   3. Subtle glow travels through connections
 *   4. Wordmark "Konekt" fades in
 *   5. Tagline fades in
 *   6. Fade out → app visible
 */

export default function AppLauncher({ onComplete, brandName = "Konekt", tagline = "Everything Your Business Needs" }) {
  const [phase, setPhase] = useState("intro"); // intro → fading → done

  useEffect(() => {
    // Animation timeline — premium pacing (~2.5s)
    const fadeTimer = setTimeout(() => setPhase("fading"), 2500);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 2750);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] transition-opacity ${phase === "fading" ? "opacity-0 duration-200" : "opacity-100"}`}
      data-testid="app-launcher"
    >
      {/* Animated Triad SVG */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-6"
        aria-hidden="true"
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connectors — draw-in animation via stroke-dashoffset */}
        <line
          x1="69.6" y1="15.6" x2="14.4" y2="98.4"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="launcher-line launcher-line-1"
        />
        <path
          d="M69.6,15.6 Q76.8,33.6 108,86.4"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className="launcher-line launcher-line-2"
        />
        <line
          x1="14.4" y1="98.4" x2="108" y2="86.4"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="launcher-line launcher-line-3"
        />

        {/* Glow traveling along connections */}
        <circle r="4" fill="#D4A843" opacity="0" filter="url(#glow)" className="launcher-glow">
          <animateMotion
            path="M69.6,15.6 L14.4,98.4 L108,86.4 L69.6,15.6"
            dur="1.3s"
            begin="1.0s"
            fill="freeze"
            repeatCount="1"
          />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="1.3s" begin="1.0s" fill="freeze" />
        </circle>

        {/* Nodes — appear one by one */}
        <circle cx="69.6" cy="15.6" r="9" fill="#D4A843" className="launcher-node launcher-node-1" />
        <circle cx="14.4" cy="98.4" r="7" fill="#FFFFFF" className="launcher-node launcher-node-2" />
        <circle cx="108" cy="86.4" r="7" fill="#FFFFFF" className="launcher-node launcher-node-3" />
      </svg>

      {/* Wordmark */}
      <h1
        className="text-3xl font-bold text-white tracking-tight launcher-text-1"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        {brandName}
      </h1>

      {/* Tagline */}
      <p
        className="text-sm text-white/50 mt-2 font-medium tracking-wide launcher-text-2"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        {tagline}
      </p>

      {/* CSS animations scoped via class names */}
      <style>{`
        /* ── Nodes: appear one by one (slightly delayed sequence) ── */
        .launcher-node {
          opacity: 0;
          transform-origin: center;
          animation: launcherNodeIn 380ms ease-out forwards;
        }
        .launcher-node-1 { animation-delay: 50ms; }
        .launcher-node-2 { animation-delay: 300ms; }
        .launcher-node-3 { animation-delay: 550ms; }

        @keyframes launcherNodeIn {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Lines: smoother draw-in ── */
        .launcher-line {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: launcherLineDraw 600ms ease-in-out forwards;
        }
        .launcher-line-1 { animation-delay: 400ms; }
        .launcher-line-2 { animation-delay: 620ms; }
        .launcher-line-3 { animation-delay: 840ms; }

        @keyframes launcherLineDraw {
          to { stroke-dashoffset: 0; }
        }

        /* ── Text: fade in with longer hold ── */
        .launcher-text-1 {
          opacity: 0;
          animation: launcherFadeIn 450ms ease-out forwards;
          animation-delay: 1550ms;
        }
        .launcher-text-2 {
          opacity: 0;
          animation: launcherFadeIn 450ms ease-out forwards;
          animation-delay: 1850ms;
        }

        @keyframes launcherFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
