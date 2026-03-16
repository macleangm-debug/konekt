import React from "react";
import SectionShell from "./SectionShell";

export default function ClientTrustStrip() {
  const logos = [
    "Trusted by growing businesses",
    "Procurement teams",
    "Corporate operations",
    "Creative and print clients",
    "Service-driven organizations",
  ];

  return (
    <SectionShell className="border-y" containerClassName="py-8" data-testid="client-trust-strip">
      <div className="text-center text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
        Built for businesses that value reliability
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
        {logos.map((item) => (
          <div
            key={item}
            className="h-16 rounded-2xl border bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500 text-center px-3"
          >
            {item}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
