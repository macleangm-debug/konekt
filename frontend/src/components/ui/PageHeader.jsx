import React from "react";

export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6 ${className}`} data-testid="page-header">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-[#64748b] mt-1 text-sm">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
