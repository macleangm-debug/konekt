import React from "react";

export default function ServiceFaqBlock({ faqs = [] }) {
  if (!faqs.length) return null;

  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="service-faq-block">
      <div className="text-3xl font-bold text-[#20364D]">Frequently asked questions</div>
      <div className="space-y-5 mt-6">
        {faqs.map((item, idx) => (
          <div key={idx} className="rounded-2xl bg-slate-50 p-5" data-testid={`faq-item-${idx}`}>
            <div className="font-semibold text-[#20364D]">{item.q}</div>
            <div className="text-slate-600 mt-3 leading-7">{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
