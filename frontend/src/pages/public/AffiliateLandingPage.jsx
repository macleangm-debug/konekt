import React from "react";
import { Link } from "react-router-dom";

function Step({ number, title, desc }) {
  return (
    <div className="flex gap-4" data-testid={`step-${number}`}>
      <div className="h-12 w-12 rounded-full bg-[#D4A843] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
        {number}
      </div>
      <div>
        <div className="text-xl font-bold text-[#20364D]">{title}</div>
        <p className="text-slate-600 mt-2">{desc}</p>
      </div>
    </div>
  );
}

export default function AffiliateLandingPage() {
  return (
    <div className="bg-slate-50 min-h-screen" data-testid="affiliate-landing-page">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-10">
          <div className="max-w-4xl">
            <div className="text-xs tracking-[0.25em] uppercase text-slate-300">
              Affiliate Program
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mt-4 leading-tight">
              Earn with Konekt
            </h1>
            <p className="text-slate-200 mt-5 text-lg max-w-3xl">
              Share products and services businesses already need. Earn on successful qualifying orders through your referral link and campaigns.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/register/affiliate"
                className="rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C] text-center"
                data-testid="join-affiliate-btn"
              >
                Join as Affiliate
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white text-center"
                data-testid="affiliate-login-btn"
              >
                Affiliate Login
              </Link>
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-2 gap-6 mt-12">
          <div className="rounded-3xl border bg-white p-8">
            <div className="text-3xl font-bold text-[#20364D]">How it works</div>
            <div className="space-y-8 mt-8">
              <Step
                number="1"
                title="Share your link"
                desc="Send your affiliate link or campaign links to colleagues, companies, and friends."
              />
              <Step
                number="2"
                title="They sign up and order"
                desc="When they complete a qualifying order, the system tracks the attribution."
              />
              <Step
                number="3"
                title="Earn controlled commission"
                desc="Earnings are tracked clearly and protected by Konekt margin rules."
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-8">
            <div className="text-3xl font-bold text-[#20364D]">Why join?</div>
            <div className="space-y-4 mt-8 text-slate-700">
              <div className="rounded-2xl bg-slate-50 px-5 py-4">Promote real business products and services</div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4">See campaigns and earnings clearly</div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4">Use promo links without managing inventory</div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4">Get paid only on valid, successful sales</div>
            </div>

            <div className="mt-8 rounded-2xl bg-[#20364D] text-white p-6">
              <div className="text-xl font-bold">Important</div>
              <p className="text-slate-200 mt-3">
                Affiliate commissions are controlled by business rules so promotional activity does not break Konekt margin protection.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
