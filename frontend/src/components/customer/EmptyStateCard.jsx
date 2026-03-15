import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";

export default function EmptyStateCard({
  icon: Icon,
  title,
  text,
  description,
  ctaLabel,
  actionLabel,
  ctaHref,
  actionHref,
  onAction,
  testId = "empty-state",
}) {
  const label = ctaLabel || actionLabel;
  const href = ctaHref || actionHref;
  const desc = text || description;

  return (
    <div
      className="rounded-3xl border bg-white p-8 text-center"
      data-testid={testId}
    >
      {Icon && (
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {desc && (
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{desc}</p>
      )}
      {(label && href) && (
        <Link to={href}>
          <Button
            className="mt-6 bg-[#D4A843] hover:bg-[#c49a3d]"
            data-testid={`${testId}-action`}
          >
            {label}
          </Button>
        </Link>
      )}
      {(label && onAction && !href) && (
        <Button
          onClick={onAction}
          className="mt-6 bg-[#D4A843] hover:bg-[#c49a3d]"
          data-testid={`${testId}-action`}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
