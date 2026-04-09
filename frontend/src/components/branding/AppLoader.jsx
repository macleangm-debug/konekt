import React from "react";

/**
 * AppLoader — Reusable branded loading component.
 * Simplified triad logo with continuous pulse animation.
 * Replaces generic spinners throughout the system.
 *
 * Usage:
 *   <AppLoader />                  — Default
 *   <AppLoader text="Loading..." /> — With message
 *   <AppLoader size="sm" />        — Small variant
 */

const SIZE_MAP = { sm: 40, md: 64, lg: 96 };

export default function AppLoader({ text, size = "md", className = "" }) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} data-testid="app-loader">
      <svg
        width={s}
        height={s}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="loader-triad"
        aria-hidden="true"
      >
        {/* Connectors */}
        <line x1="37.1" y1="8.3" x2="7.7" y2="52.5" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M37.1,8.3 Q41,18 57.6,46.1" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <line x1="7.7" y1="52.5" x2="57.6" y2="46.1" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />

        {/* Glow travel */}
        <circle r="2.5" fill="#D4A843" opacity="0.7" className="loader-glow">
          <animateMotion
            path="M37.1,8.3 L7.7,52.5 L57.6,46.1 L37.1,8.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Nodes with pulse */}
        <circle cx="37.1" cy="8.3" r="5" fill="#D4A843" className="loader-node" />
        <circle cx="7.7" cy="52.5" r="3.8" fill="#20364D" className="loader-node" />
        <circle cx="57.6" cy="46.1" r="3.8" fill="#20364D" className="loader-node" />
      </svg>

      {text && (
        <p className="mt-4 text-sm font-medium text-slate-400 tracking-wide">{text}</p>
      )}

      <style>{`
        .loader-triad {
          animation: loaderPulse 2s ease-in-out infinite;
        }
        .loader-node {
          animation: loaderNodePulse 2s ease-in-out infinite;
        }
        @keyframes loaderPulse {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
        @keyframes loaderNodePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
