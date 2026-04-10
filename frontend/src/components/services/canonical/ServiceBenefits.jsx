import React from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Service Benefits — Why choose this service.
 */
export function ServiceBenefits({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="bg-white border-y border-slate-200" data-testid="service-benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
          Why choose this service
        </h2>
        <p className="text-slate-500 mb-8 max-w-xl">
          The outcomes and advantages you get by working with us.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl p-4"
            >
              <div className="w-7 h-7 rounded-lg bg-[#D4A843]/10 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843]" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServiceBenefits;
