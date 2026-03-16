import React from "react";

export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8 ${className}`} data-testid="page-header">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#20364D]">{title}</h1>
        {subtitle ? (
          <p className="text-slate-600 mt-2 text-lg">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
