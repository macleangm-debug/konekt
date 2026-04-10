import React from "react";
import { Lightbulb } from "lucide-react";

/**
 * Service Use Cases — Where this service applies.
 */
export function ServiceUseCases({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16" data-testid="service-use-cases">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
        Common use cases
      </h2>
      <p className="text-slate-500 mb-8 max-w-xl">
        Real scenarios where businesses use this service.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-[#20364D]/5 flex items-center justify-center mb-3">
              <Lightbulb className="w-4 h-4 text-[#20364D]" />
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServiceUseCases;
