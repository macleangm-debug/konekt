import React from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Service Includes — Grid of what's included in the service.
 */
export function ServiceIncludes({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16" data-testid="service-includes">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
        What this service includes
      </h2>
      <p className="text-slate-500 mb-8 max-w-xl">
        Everything covered when you work with us on this service.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => {
          const isObj = typeof item === "object";
          const title = isObj ? item.title : item;
          const desc = isObj ? item.description : null;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#20364D]">{title}</p>
                  {desc && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ServiceIncludes;
