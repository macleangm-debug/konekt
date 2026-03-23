import React from "react";
import BrandButton from "./BrandButton";
import { Package } from "lucide-react";

export default function PremiumEmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white py-16 px-6 text-center" data-testid="premium-empty-state">
      <div className="w-12 h-12 mx-auto rounded-xl bg-[#f8fafc] mb-4 flex items-center justify-center">
        <Package className="w-6 h-6 text-[#94a3b8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0f172a]">{title}</h3>
      <p className="text-sm text-[#64748b] mt-2 max-w-md mx-auto">{description}</p>
      {ctaLabel && ctaHref ? (
        <div className="mt-5">
          <BrandButton href={ctaHref} variant="primary">
            {ctaLabel}
          </BrandButton>
        </div>
      ) : null}
    </div>
  );
}
