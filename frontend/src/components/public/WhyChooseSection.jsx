import React from "react";
import { Check } from "lucide-react";

export default function WhyChooseSection() {
  const items = [
    "One platform for products and services",
    "Better visibility for business ordering",
    "Country-aware availability and expansion model",
    "Strong support for companies and individuals",
    "Scalable operations with internal sourcing and delivery",
    "Designed for modern African business operations",
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10 items-start" data-testid="why-choose">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">Why businesses choose Konekt</h2>
        <p className="text-slate-600 mt-3 text-lg">
          We combine sourcing, support, delivery, and service coordination in one trusted experience.
        </p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border bg-slate-50 px-5 py-4 font-medium text-slate-700 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#20364D] flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
