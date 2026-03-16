import React from "react";
import SectionShell from "./SectionShell";
import { Shield, MapPin, Users, Award } from "lucide-react";

export default function TrustSignalsGrid() {
  const items = [
    {
      title: "Clear commercial workflow",
      text: "Quotes, invoices, statements, and service coordination in one ecosystem.",
      icon: Shield,
    },
    {
      title: "Location-aware fulfillment",
      text: "Country and region selection helps surface the most relevant availability.",
      icon: MapPin,
    },
    {
      title: "Built for companies and individuals",
      text: "Support both personal buyers and business procurement needs.",
      icon: Users,
    },
    {
      title: "Konekt-controlled experience",
      text: "Customers interact with one trusted platform, even as fulfillment scales.",
      icon: Award,
    },
  ];

  return (
    <section className="bg-slate-50 py-16" data-testid="trust-signals-grid">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">
            Built for trust, clarity, and scale
          </h2>
          <p className="text-slate-600 mt-3 text-lg">
            Strong business platforms reduce friction before the first order is placed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border bg-white p-6 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-[#20364D]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#20364D]" />
                </div>
                <div className="text-xl font-bold text-[#20364D]">{item.title}</div>
                <div className="text-slate-600 mt-3">{item.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
