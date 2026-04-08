import React from "react";

export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm" data-testid={`section-card-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
