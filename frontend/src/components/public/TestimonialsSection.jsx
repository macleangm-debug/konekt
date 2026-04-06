import React from "react";
import { Quote } from "lucide-react";

export default function TestimonialsSection() {
  const items = [
    {
      quote: "Konekt makes it easier to coordinate supplies, services, and delivery without running through multiple channels.",
      name: "Operations Manager",
      company: "Growing SME",
    },
    {
      quote: "The platform has the potential to simplify business sourcing and execution in a very practical way.",
      name: "Procurement Lead",
      company: "Corporate Client",
    },
    {
      quote: "It feels like a system built for how African businesses actually operate.",
      name: "Business Founder",
      company: "Regional Brand",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 space-y-6" data-testid="testimonials">
      <div className="max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">Built for trust and business confidence</h2>
        <p className="text-slate-600 mt-3 text-lg">
          Strong platforms feel reliable before the first order is placed.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {items.map((item) => (
          <div key={item.name + item.company} className="rounded-3xl border bg-white p-6 hover:shadow-md transition">
            <Quote className="w-8 h-8 text-[#D4A843] mb-4" />
            <div className="text-slate-700 leading-7">"{item.quote}"</div>
            <div className="mt-5 pt-4 border-t">
              <div className="font-bold text-[#20364D]">{item.name}</div>
              <div className="text-sm text-slate-500">{item.company}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
