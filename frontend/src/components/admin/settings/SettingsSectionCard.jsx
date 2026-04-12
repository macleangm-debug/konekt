import React from "react";
export default function SettingsSectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
      <div>
        <div className="text-lg font-bold text-[#20364D]">{title}</div>
        {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
      </div>
      {children}
    </section>
  );
}
