import React from "react";
import { MapPin, ShoppingBag, Truck } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      title: "Choose your country and region",
      text: "We localize availability, pricing, and service coverage based on your market.",
      icon: MapPin,
    },
    {
      title: "Browse products or request services",
      text: "Order business products, printing, creative work, and support from one platform.",
      icon: ShoppingBag,
    },
    {
      title: "Track orders in one place",
      text: "We manage the experience while the right sourcing is handled internally.",
      icon: Truck,
    },
  ];

  return (
    <section className="bg-slate-50 py-16" data-testid="how-it-works">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">How it works</h2>
          <p className="text-slate-600 mt-3 text-lg">
            A simpler way to source products and services for your business.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-3xl border bg-white p-6 hover:shadow-md transition">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#20364D] text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <Icon className="w-6 h-6 text-[#D4A843]" />
                </div>
                <div className="text-xl font-bold text-[#20364D]">{step.title}</div>
                <div className="text-slate-600 mt-3">{step.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
