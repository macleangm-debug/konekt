import React from "react";
import { Link } from "react-router-dom";
import { Globe, Users } from "lucide-react";

export default function ExpansionSection({ availability }) {
  return (
    <section className="bg-[#20364D] text-white py-16" data-testid="expansion-section">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium mb-4">
            <Globe className="w-4 h-4" />
            Multi-Country Expansion
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Built to scale across Africa</h2>
          <p className="text-slate-200 mt-3 text-lg">
            Konekt supports multi-country expansion through strong local fulfillment and controlled ecosystem growth.
          </p>
        </div>

        <div className="rounded-3xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-[#D4A843]" />
            <div className="text-lg font-semibold">Interested in becoming a local operating partner?</div>
          </div>
          <p className="text-slate-200">
            We work with qualified distributors and service operators to strengthen country coverage.
          </p>
          <div className="mt-5">
            <Link
              to="/launch-country"
              className="inline-block rounded-2xl bg-[#D4A843] text-slate-900 px-5 py-3 font-bold hover:opacity-95 transition"
              data-testid="expansion-cta"
            >
              Explore Country Expansion
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
