import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";

export default function ServicePageTemplateV2({
  slug,
  title,
  overview,
  included = [],
  idealFor = [],
  benefits = [],
  howItWorks = ["Submit request", "Sales contacts you", "Scope and quote", "Delivery / execution"],
  faqs = [],
}) {
  const navigate = useNavigate();

  const goToRequest = () =>
    navigate(`/request-quote?type=service_quote&service=${encodeURIComponent(slug)}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8" data-testid="service-page-template">
      {/* Hero */}
      <section className="rounded-3xl border bg-white p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-[#20364D]">{title}</h1>
        <p className="mt-4 max-w-3xl text-slate-600 leading-relaxed">{overview}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={goToRequest}
            className="rounded-xl bg-[#20364D] px-5 py-3 text-white font-semibold hover:bg-[#2d4a66] transition flex items-center gap-2"
            data-testid="service-request-btn"
          >
            Request Service <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToRequest}
            className="rounded-xl border border-[#D4A843] text-[#D4A843] px-5 py-3 font-semibold hover:bg-[#D4A843]/10 transition"
            data-testid="service-pricing-btn"
          >
            Request Business Pricing
          </button>
        </div>
      </section>

      {/* What's Included + Who It's For */}
      {(included.length > 0 || idealFor.length > 0) && (
        <section className="grid gap-6 md:grid-cols-2">
          {included.length > 0 && (
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-semibold text-[#20364D] mb-4">What's Included</h2>
              <ul className="space-y-2.5">
                {included.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {idealFor.length > 0 && (
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-semibold text-[#20364D] mb-4">Who It's For</h2>
              <ul className="space-y-2.5">
                {idealFor.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* How It Works */}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold text-[#20364D] mb-4">How It Works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {howItWorks.map((step, idx) => (
            <div key={idx} className="rounded-xl border bg-slate-50 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#20364D] text-white flex items-center justify-center text-sm font-bold mx-auto mb-2">
                {idx + 1}
              </div>
              <p className="text-sm text-slate-700 font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      {benefits.length > 0 && (
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold text-[#20364D] mb-4">Outcomes & Benefits</h2>
          <ul className="grid md:grid-cols-2 gap-3">
            {benefits.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold text-[#20364D] mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <details key={idx} className="rounded-xl border p-4 group">
                <summary className="font-medium text-sm cursor-pointer flex items-center gap-2 text-[#20364D]">
                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  {item.question}
                </summary>
                <p className="mt-3 text-sm text-slate-600 pl-6">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="rounded-3xl bg-[#20364D] p-8 text-white">
        <h2 className="text-2xl font-semibold">Need pricing or a custom scope?</h2>
        <p className="mt-2 text-sm text-slate-300">Submit a request and the sales team will follow up within 24 hours.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={goToRequest}
            className="rounded-xl bg-white text-[#20364D] px-5 py-3 font-semibold hover:bg-slate-100 transition"
            data-testid="service-bottom-cta"
          >
            Request Service
          </button>
          <button
            onClick={goToRequest}
            className="rounded-xl border border-white/50 text-white px-5 py-3 font-semibold hover:bg-white/10 transition"
          >
            Talk to Sales
          </button>
        </div>
      </section>
    </div>
  );
}
