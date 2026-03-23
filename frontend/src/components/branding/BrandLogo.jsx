import React from "react";
import useBrandingSettings from "../../hooks/useBrandingSettings";

export default function BrandLogo({ variant = "full", className = "" }) {
  const { data } = useBrandingSettings();
  const src = variant === "icon" ? data?.icon_url : data?.logo_url;
  const alt = data?.company_name || "Konekt";
  
  // Default styling based on variant
  const defaultClass = variant === "icon" ? "h-10 w-10" : "h-10 w-auto";
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className || defaultClass}
      onError={(e) => {
        // Fallback to text if image fails to load
        e.target.style.display = 'none';
        e.target.nextSibling?.classList.remove('hidden');
      }}
    />
  );
}

// Fallback text logo component
export function BrandLogoFallback({ variant = "full", className = "" }) {
  const { data } = useBrandingSettings();
  
  if (variant === "icon") {
    return (
      <div className={`w-10 h-10 rounded-xl bg-[#20364D] flex items-center justify-center text-white font-bold ${className}`}>
        {(data?.company_name || "K").charAt(0)}
      </div>
    );
  }
  
  return (
    <div className={`text-2xl font-bold text-[#20364D] ${className}`}>
      {data?.company_name || "Konekt"}
    </div>
  );
}
