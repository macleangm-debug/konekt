import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Service Hero — Full-width dark hero with service title, description, and CTAs.
 */
export function ServiceHero({ title, description, groupName, slug }) {
  const navigate = useNavigate();
  const goToRequest = () =>
    navigate(`/request-quote?type=service_quote&service=${encodeURIComponent(slug)}`);

  return (
    <section className="relative bg-[#20364D] overflow-hidden" data-testid="service-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(212,168,67,0.08)_0%,_transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative">
        {groupName && (
          <p className="text-[#D4A843] text-xs font-bold tracking-widest uppercase mb-3">
            {groupName}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-3xl leading-[1.1]">
          {title}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/65 max-w-2xl leading-relaxed">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={goToRequest}
            className="rounded-xl bg-white text-[#20364D] px-6 py-3 font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
            data-testid="service-hero-request-btn"
          >
            Request Quote <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToRequest}
            className="rounded-xl border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
            data-testid="service-hero-pricing-btn"
          >
            Get Business Pricing
          </button>
        </div>
      </div>
    </section>
  );
}

export default ServiceHero;
