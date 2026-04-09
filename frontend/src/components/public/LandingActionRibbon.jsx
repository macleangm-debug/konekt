import React from "react";
import { Link } from "react-router-dom";

export default function LandingActionRibbon() {
  return (
    <div 
      className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] p-8 md:p-10 text-white"
      data-testid="landing-action-ribbon"
    >
      <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="text-3xl md:text-4xl font-bold">
            Ready to source smarter?
          </div>
          <p className="text-slate-200 mt-3 text-lg max-w-3xl">
            Explore products, request services, and move into a more reliable
            commercial workflow from one place.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/request-quote"
            className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold text-center hover:bg-[#c49a3d] transition"
            data-testid="ribbon-request-quote"
          >
            Request Quote
          </Link>
          <Link
            to="/services"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-center hover:bg-white/10 transition"
            data-testid="ribbon-explore-services"
          >
            Explore Services
          </Link>
          <Link
            to="/marketplace"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-center hover:bg-white/10 transition"
            data-testid="ribbon-browse-marketplace"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
