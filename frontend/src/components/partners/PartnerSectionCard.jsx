import React from "react";

export default function PartnerSectionCard({ title, description, children }) {
  return (
    <section className="rounded-[2rem] border bg-white p-8 space-y-5">
      <div>
        <div className="text-2xl font-bold text-[#20364D]">{title}</div>
        {description ? <div className="text-slate-600 mt-2">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}
