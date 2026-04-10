import React from "react";
import PublicNavbarV2 from "./PublicNavbarV2";
import PremiumFooterV2 from "./PremiumFooterV2";

/**
 * Shared outer shell for all public-facing pages.
 * Provides consistent navigation, footer, and background.
 */
export default function PublicPageShell({ children, className = "" }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicNavbarV2 />
      <main className={`flex-1 ${className}`}>{children}</main>
      <PremiumFooterV2 />
    </div>
  );
}
