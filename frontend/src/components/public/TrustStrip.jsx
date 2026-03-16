import React from "react";

export default function TrustStrip() {
  const items = [
    "Business-focused marketplace",
    "Country-aware availability",
    "Trusted service workflows",
    "Centralized ordering & support",
  ];

  return (
    <section className="border-y bg-slate-50" data-testid="trust-strip">
      <div className="max-w-7xl mx-auto px-6 py-5 grid md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item} className="text-center md:text-left text-sm font-semibold text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
