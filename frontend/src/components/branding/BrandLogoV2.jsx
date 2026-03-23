import React from "react";

/**
 * BrandLogoV2 - Context-aware logo component with light/dark variants
 * 
 * @param {string} variant - "dark" for light backgrounds, "light" for dark backgrounds
 * @param {string} kind - "full" for full logo, "icon" for icon only
 * @param {string} size - "xs" | "sm" | "md" | "lg" | "xl"
 * @param {string} className - Additional CSS classes
 */
export default function BrandLogoV2({ variant = "dark", kind = "full", size = "md", className = "" }) {
  const sizeMap = {
    xs: "h-5",
    sm: "h-7",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  const srcMap = {
    dark: {
      full: "/branding/konekt-logo-full.png",
      icon: "/branding/konekt-icon.png",
    },
    light: {
      full: "/branding/konekt-logo-white.png",
      icon: "/branding/konekt-icon-white.png",
    },
  };

  const src = srcMap[variant]?.[kind] || srcMap.dark.full;
  const alt = "Konekt";

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeMap[size] || sizeMap.md} w-auto object-contain ${className}`}
      data-testid="brand-logo"
    />
  );
}
