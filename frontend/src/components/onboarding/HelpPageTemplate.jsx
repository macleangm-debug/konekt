import React from "react";
import OnboardingWizard from "./OnboardingWizard";

export default function HelpPageTemplate({ title, subtitle, role, bullets = [] }) {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">{title}</div>
        <div className="text-slate-600 mt-2">{subtitle}</div>
      </div>

      <OnboardingWizard role={role} />

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">How to use this area</div>
        <ul className="space-y-3 mt-5 text-slate-700">
          {bullets.map((b, i) => (
            <li key={i} className="rounded-2xl bg-slate-50 px-4 py-3">{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
