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
    <div className="rounded-3xl border bg-white p-10 text-center" data-testid="premium-empty-state">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 mb-5 flex items-center justify-center">
        <Package className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-[#20364D]">{title}</h3>
      <p className="text-slate-600 mt-3 max-w-xl mx-auto">{description}</p>
      {ctaLabel && ctaHref ? (
        <div className="mt-6">
          <BrandButton href={ctaHref} variant="primary">
            {ctaLabel}
          </BrandButton>
        </div>
      ) : null}
    </div>
  );
}
