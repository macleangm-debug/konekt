import React from "react";
import BrandLogo from "../branding/BrandLogo";

export default function AccountBrandHeader({ right = null }) {
  return (
    <div className="flex items-center justify-between border-b bg-white px-6 py-4" data-testid="account-brand-header">
      <BrandLogo variant="full" className="h-10 w-auto" />
      <div>{right}</div>
    </div>
  );
}
