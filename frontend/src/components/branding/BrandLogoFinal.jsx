import React from "react";

/**
 * BrandLogoFinal - Single logo component, no variant switching.
 * Uses CSS `brightness-0 invert` for dark backgrounds.
 * 
 * @param {string} size - "sm" | "md" | "lg" | "xl"
 * @param {boolean} light - true for dark backgrounds (inverts to white)
 * @param {string} className - additional CSS
 */
export default function BrandLogoFinal({ size = "md", light = false, className = "" }) {
  const sizeMap = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-24",
  };

  return (
    <img
      src="/branding/konekt-logo-full.png"
      alt="Konekt"
      className={`${sizeMap[size] || sizeMap.md} w-auto object-contain ${light ? "brightness-0 invert" : ""} ${className}`}
      data-testid="brand-logo"
    />
  );
}
