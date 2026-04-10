import React from "react";

/**
 * Service Process — How it works step-by-step flow.
 */
export function ServiceProcess({
  steps = ["Submit request", "Get quote", "Approve & pay", "Fulfillment & delivery"],
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16" data-testid="service-process">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
        How it works
      </h2>
      <p className="text-slate-500 mb-10 max-w-xl">
        A clear, structured process from start to finish.
      </p>
      <div className="relative">
        {/* Connector line */}
        <div className="hidden md:block absolute top-6 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-slate-200" />
        <div className="grid md:grid-cols-4 gap-6 md:gap-4">
          {steps.map((step, idx) => {
            const isObj = typeof step === "object";
            const title = isObj ? step.title : step;
            const desc = isObj ? step.description : null;
            return (
              <div key={idx} className="text-center relative">
                <div className="w-12 h-12 rounded-full bg-[#20364D] text-white flex items-center justify-center text-lg font-bold mx-auto mb-4 relative z-10 ring-4 ring-white">
                  {idx + 1}
                </div>
                <h3 className="text-sm font-bold text-[#20364D] mb-1">{title}</h3>
                {desc && <p className="text-xs text-slate-500 leading-relaxed max-w-[180px] mx-auto">{desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ServiceProcess;
