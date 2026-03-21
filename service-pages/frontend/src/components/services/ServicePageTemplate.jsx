import React from "react";
import { useNavigate } from "react-router-dom";
import ServiceProcessSteps from "./ServiceProcessSteps";
import ServiceFaqBlock from "./ServiceFaqBlock";

export default function ServicePageTemplate({
  service,
  isLoggedIn = false,
  onGuestLeadClick,
  accountMode = false,
}) {
  const navigate = useNavigate();

  const requestService = () => {
    if (accountMode || isLoggedIn) {
      navigate(`/dashboard/service-requests/new?service=${service.key}`);
      return;
    }
    if (onGuestLeadClick) {
      onGuestLeadClick();
      return;
    }
    navigate(`/login/customer?next=${encodeURIComponent(`/dashboard/service-requests/new?service=${service.key}`)}`);
  };

  const requestQuote = () => {
    if (accountMode || isLoggedIn) {
      navigate(`/dashboard/business-pricing?service=${service.key}`);
      return;
    }
    if (onGuestLeadClick) {
      onGuestLeadClick();
      return;
    }
    navigate(`/login/customer?next=${encodeURIComponent(`/dashboard/business-pricing?service=${service.key}`)}`);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-12">
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
            onClick={requestService}
            className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold"
          >
            Start Service Request
          </button>

          <button
            type="button"
            onClick={requestQuote}
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white"
          >
            Request Quote
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">What this service includes</div>
          <ul className="space-y-3 mt-5 text-slate-700">
            {(service.includes || []).map((item, idx) => (
              <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Who this is for</div>
          <ul className="space-y-3 mt-5 text-slate-700">
            {(service.for_who || []).map((item, idx) => (
              <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <ServiceProcessSteps steps={service.process_steps || []} />

      <section className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Why choose Konekt</div>
          <ul className="space-y-3 mt-5 text-slate-700">
            {(service.why_konekt || []).map((item, idx) => (
              <li key={idx} className="rounded-2xl bg-slate-50 px-4 py-3">{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Pricing guidance</div>
          <p className="text-slate-600 mt-4 leading-7">
            {service.pricing_guidance || "Pricing depends on scope, quantity, site conditions, materials, and execution requirements."}
          </p>

          <div className="rounded-2xl border bg-slate-50 px-4 py-4 mt-6 text-sm text-slate-600">
            Logged-in users submit structured requests inside their account. Guests can leave contact details for follow-up.
          </div>
        </div>
      </section>

      <ServiceFaqBlock faqs={service.faqs || []} />

      <section className="rounded-[2rem] border bg-white p-8">
        <div className="text-3xl font-bold text-[#20364D]">Ready to proceed?</div>
        <p className="text-slate-600 mt-4 text-lg">
          Move into the request or quote workflow and let Konekt coordinate the next steps.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={requestService}
            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            Start Service Request
          </button>

          <button
            type="button"
            onClick={requestQuote}
            className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
          >
            Request Quote
          </button>
        </div>
      </section>
    </div>
  );
}
