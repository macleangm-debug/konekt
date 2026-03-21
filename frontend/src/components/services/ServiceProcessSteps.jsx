import React from "react";

export default function ServiceProcessSteps({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="service-process-steps">
      <div className="text-3xl font-bold text-[#20364D]">How it works</div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {steps.map((step, idx) => (
          <div key={idx} className="rounded-2xl bg-slate-50 p-5" data-testid={`process-step-${idx}`}>
            <div className="text-3xl font-bold text-[#20364D]">{idx + 1}</div>
            <div className="font-semibold text-[#20364D] mt-3">{step.title}</div>
            <div className="text-sm text-slate-600 mt-2 leading-6">{step.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
