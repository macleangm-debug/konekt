import React from "react";
import { useBranding } from "../../contexts/BrandingContext";

/**
 * Brand Logo System — Connected Triad
 *
 * Variants: "dark" (dark text, light bg) | "light" (white text, dark bg)
 * Sizes:    "xs" | "sm" | "md" | "lg" | "xl"
 * Types:    "full" (icon+text+tagline) | "secondary" (icon+text) | "icon" (icon only)
 */

const SIZE_MAP = { xs: 24, sm: 32, md: 40, lg: 52, xl: 64 };

function TriadIcon({ size = 40, variant = "dark", primaryColor, accentColor: accent }) {
  const s = size;
  const isLight = variant === "light";
  const nodeColor = isLight ? "#FFFFFF" : (primaryColor || "#20364D");
  const accentColor = accent || "#D4A843";
  const connColor = isLight ? "rgba(229,231,235,0.85)" : `${nodeColor}73`;

  // Asymmetric node positions — gold node pushed off-center
  const topX = s * 0.58;
  const topY = s * 0.13;
  const leftX = s * 0.12;
  const leftY = s * 0.82;
  const rightX = s * 0.90;
  const rightY = s * 0.72;

  // Node sizes — gold is larger (visual anchor)
  const accentR = Math.max(2.8, s * 0.14);
  const nodeR = Math.max(2.2, s * 0.108);

  // Connector thickness — +10% for small-size clarity
  const sw = Math.max(2.0, s * 0.062);

  // Subtle outward curve on right connector
  const rightMidX = (topX + rightX) / 2 + s * 0.06;
  const rightMidY = (topY + rightY) / 2 - s * 0.04;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1={topX} y1={topY} x2={leftX} y2={leftY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />
      <path d={`M${topX},${topY} Q${rightMidX},${rightMidY} ${rightX},${rightY}`} stroke={connColor} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={topX} cy={topY} r={accentR} fill={accentColor} />
      <circle cx={leftX} cy={leftY} r={nodeR} fill={nodeColor} />
      <circle cx={rightX} cy={rightY} r={nodeR} fill={nodeColor} />
    </svg>
  );
}

export default function BrandLogo({
  variant = "dark",
  size = "md",
  type = "secondary",
  className = "",
}) {
  const b = useBranding();
  const iconSize = SIZE_MAP[size] || SIZE_MAP.md;
  const isLight = variant === "light";
  const primaryColor = b.primary_color || "#20364D";
  const accent = b.accent_color || "#D4A843";
  const textColor = isLight ? "#FFFFFF" : primaryColor;
  const tagColor = isLight ? "rgba(255,255,255,0.6)" : "#94a3b8";
  const fontSize = Math.max(12, iconSize * 0.46);
  const tagFontSize = Math.max(9, iconSize * 0.19);
  const gap = Math.max(6, iconSize * 0.25);
  const brandName = b.brand_name || "Konekt";
  const tagline = b.tagline || "One-stop shop for products, services & deals";
  const logoUrl = null; // Always use TriadIcon for nav/UI; documents use render-settings API

  return (
    <div
      className={`inline-flex items-center shrink-0 ${className}`}
      style={{ gap }}
      data-testid="brand-logo"
    >
      {logoUrl ? (
        <img src={logoUrl} alt={brandName} style={{ height: iconSize, width: "auto" }} />
      ) : (
        <>
          <TriadIcon size={iconSize} variant={variant} primaryColor={primaryColor} accentColor={accent} />
          {type !== "icon" && (
            <div className="flex flex-col justify-center" style={{ minWidth: 0 }}>
              <span
                style={{
                  fontSize,
                  fontWeight: 700,
                  color: textColor,
                  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                }}
              >
                {brandName}
              </span>
              {type === "full" && (
                <span
                  style={{
                    fontSize: tagFontSize,
                    fontWeight: 500,
                    color: tagColor,
                    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                    letterSpacing: "0.02em",
                    lineHeight: 1.3,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tagline}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { TriadIcon };
