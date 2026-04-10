import React from "react";
import { ArrowRight } from "lucide-react";

/**
 * Service Audience — Who this service is for.
 */
export function ServiceAudience({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="bg-white border-y border-slate-200" data-testid="service-audience">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
          Who this is for
        </h2>
        <p className="text-slate-500 mb-8 max-w-xl">
          This service is designed for these types of businesses and use cases.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-[#D4A843]/10 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#D4A843]" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServiceAudience;
