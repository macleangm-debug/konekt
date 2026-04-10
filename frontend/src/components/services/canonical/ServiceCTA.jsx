import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Service CTA — Final conversion block.
 */
export function ServiceCTA({ slug, title = "Ready to get started?" }) {
  const navigate = useNavigate();
  const goToRequest = () =>
    navigate(`/request-quote?type=service_quote&service=${encodeURIComponent(slug)}`);

  return (
    <section className="bg-[#20364D]" data-testid="service-cta">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{title}</h2>
        <p className="mt-3 text-white/55 max-w-md mx-auto">
          Submit a request and our sales team will follow up with pricing within 24 hours.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={goToRequest}
            className="rounded-xl bg-white text-[#20364D] px-6 py-3 font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
            data-testid="service-cta-request-btn"
          >
            Request Quote <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToRequest}
            className="rounded-xl border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
          >
            Talk to Sales
          </button>
        </div>
      </div>
    </section>
  );
}

export default ServiceCTA;
