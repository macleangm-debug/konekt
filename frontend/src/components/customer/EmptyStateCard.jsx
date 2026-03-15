import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function EmptyStateCard({
  icon: Icon,
  title,
  text,
  description,
  ctaLabel,
  actionLabel,
  ctaHref,
  actionHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  onAction,
  testId = "empty-state",
}) {
  const label = ctaLabel || actionLabel;
  const href = ctaHref || actionHref;
  const desc = text || description;

  return (
    <div
      className="rounded-3xl border bg-white p-10 text-center"
      data-testid={testId}
    >
      <div className="max-w-2xl mx-auto">
        {Icon && (
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
            <Icon className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <h3 className="text-3xl font-bold text-[#2D3E50]">{title}</h3>
        {desc && (
          <p className="text-slate-600 mt-3">{desc}</p>
        )}

        <div className="flex flex-wrap gap-3 justify-center mt-7">
          {(label && href) && (
            <Link
              to={href}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold hover:bg-[#1e2d3d] transition-colors"
              data-testid={`${testId}-action`}
            >
              <span>{label}</span>
              <ArrowRight size={16} />
            </Link>
          )}
          
          {(label && onAction && !href) && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold hover:bg-[#1e2d3d] transition-colors"
              data-testid={`${testId}-action`}
            >
              <span>{label}</span>
              <ArrowRight size={16} />
            </button>
          )}

          {(secondaryCtaLabel && secondaryCtaHref) && (
            <Link
              to={secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold hover:bg-slate-50 transition-colors"
              data-testid={`${testId}-secondary-action`}
            >
              <span>{secondaryCtaLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
