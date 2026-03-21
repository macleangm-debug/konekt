import React from "react";
import { Link } from "react-router-dom";

export default function ServiceHeroPanel({ accountMode = false }) {
  return (
    <section className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-[1fr_0.95fr] gap-10 items-center">
          <div>
            <div className="text-xs tracking-[0.22em] uppercase text-slate-500 font-semibold">
              {accountMode ? "Account Services" : "Business Services"}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-[#20364D] mt-4 leading-tight">
              Discover business services with clearer categories, better guidance, and faster next steps
            </h1>
            <p className="text-slate-600 mt-5 text-lg max-w-3xl">
              Browse categories, understand each service clearly, and move into quote or request flow without confusion.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/request-quote" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
                Request Quote
              </Link>
              <Link to={accountMode ? "/dashboard/business-pricing" : "/services"} className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]">
                {accountMode ? "Request Business Pricing" : "Explore Public Services"}
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white border p-6">
              <div className="text-lg font-bold text-[#20364D]">Clear discovery</div>
              <p className="text-slate-600 mt-3 text-sm">Featured services, category tabs, and premium cards.</p>
            </div>
            <div className="rounded-3xl bg-white border p-6">
              <div className="text-lg font-bold text-[#20364D]">Guest + account flow</div>
              <p className="text-slate-600 mt-3 text-sm">Guests can show interest, logged-in users submit structured requests.</p>
            </div>
            <div className="rounded-3xl bg-white border p-6">
              <div className="text-lg font-bold text-[#20364D]">B2B support</div>
              <p className="text-slate-600 mt-3 text-sm">Business pricing and account-mode handling for serious clients.</p>
            </div>
            <div className="rounded-3xl bg-white border p-6">
              <div className="text-lg font-bold text-[#20364D]">Operational visibility</div>
              <p className="text-slate-600 mt-3 text-sm">Service requests move into trackable workflows with notifications.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
