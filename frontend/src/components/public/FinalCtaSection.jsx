import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, User } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="py-16" data-testid="final-cta">
      <div className="max-w-5xl mx-auto px-6">
        <div className="rounded-[32px] bg-gradient-to-br from-slate-900 to-[#20364D] text-white p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to source smarter for your business?
          </h2>
          <p className="text-slate-300 mt-4 text-lg max-w-2xl mx-auto">
            Explore products, request services, and manage business ordering through one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4A843] text-slate-900 px-6 py-4 font-bold hover:opacity-95 transition"
              data-testid="final-cta-browse"
            >
              Start Browsing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-semibold hover:bg-white/10 transition"
              data-testid="final-cta-account"
            >
              <User className="w-5 h-5" />
              Go to My Account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
