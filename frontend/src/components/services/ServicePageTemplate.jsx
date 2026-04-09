import React from "react";
import { useNavigate } from "react-router-dom";
import ServiceProcessSteps from "./ServiceProcessSteps";
import ServiceFaqBlock from "./ServiceFaqBlock";

export default function ServicePageTemplate({
  service,
}) {
  const navigate = useNavigate();

  const slug = service.slug || service.key || "";

  const requestQuote = () => {
    navigate(`/request-quote?type=service_quote&service=${encodeURIComponent(slug)}&category=${encodeURIComponent(service.group_key || "")}`);
  };

  return (
    <div className="space-y-8" data-testid="service-page-template">
      {/* Hero Section */}
      <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-12" data-testid="service-hero">
        <div className="text-xs tracking-[0.22em] uppercase text-slate-300 font-semibold">
          {service.group_name || "Service"}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mt-4 leading-tight">
          {service.name}
        </h1>
        <p className="text-slate-200 mt-5 text-lg max-w-4xl">
          {service.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={requestQuote}
            className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition"
            data-testid="start-service-request-btn"
          >
            Request a Quote
          </button>
        </div>
      </section>

      {/* What's Included & Who It's For */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {(service.includes || []).length > 0 && (
          <div className="rounded-[2rem] border bg-white p-8" data-testid="service-includes">
            <div className="text-2xl font-bold text-[#20364D]">What this service includes</div>
            <ul className="space-y-3 mt-5 text-slate-700">
              {service.includes.map((item, idx) => (
                <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(service.for_who || []).length > 0 && (
          <div className="rounded-[2rem] border bg-white p-8" data-testid="service-for-who">
            <div className="text-2xl font-bold text-[#20364D]">Who this is for</div>
            <ul className="space-y-3 mt-5 text-slate-700">
              {service.for_who.map((item, idx) => (
                <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Process Steps */}
      {(service.process_steps || []).length > 0 && (
        <ServiceProcessSteps steps={service.process_steps} />
      )}

      {/* Why Choose Us & Pricing */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {(service.why_konekt || []).length > 0 && (
          <div className="rounded-[2rem] border bg-white p-8" data-testid="why-konekt">
            <div className="text-2xl font-bold text-[#20364D]">Why choose us</div>
            <ul className="space-y-3 mt-5 text-slate-700">
              {service.why_konekt.map((item, idx) => (
                <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-[2rem] border bg-white p-8" data-testid="pricing-guidance">
          <div className="text-2xl font-bold text-[#20364D]">Pricing guidance</div>
          <p className="text-slate-600 mt-4 leading-7">
            {service.pricing_guidance || "Pricing depends on scope, quantity, site conditions, materials, and execution requirements."}
          </p>

          <div className="rounded-2xl border bg-slate-50 px-4 py-4 mt-6 text-sm text-slate-600">
            Submit a request and our team will prepare a detailed quote with turnaround times.
          </div>
        </div>
      </section>

      {/* FAQ */}
      {(service.faqs || []).length > 0 && (
        <ServiceFaqBlock faqs={service.faqs} />
      )}

      {/* Bottom CTA */}
      <section className="rounded-[2rem] border bg-white p-8" data-testid="service-cta-bottom">
        <div className="text-3xl font-bold text-[#20364D]">Ready to proceed?</div>
        <p className="text-slate-600 mt-4 text-lg">
          Submit your requirements and let our team coordinate the next steps.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={requestQuote}
            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition"
            data-testid="bottom-request-quote-btn"
          >
            Request a Quote
          </button>
        </div>
      </section>
    </div>
  );
}
