import React, { useEffect, useMemo, useState } from "react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/public/PublicFooter";
import ExpansionCountryCard from "../../components/public/ExpansionCountryCard";

const defaultCountries = [
  {
    code: "KE",
    name: "Kenya",
    status_label: "High-priority expansion",
    badge: "East Africa",
    description:
      "Strong business activity, regional connectivity, and demand for coordinated products and services.",
  },
  {
    code: "UG",
    name: "Uganda",
    status_label: "Expansion target",
    badge: "East Africa",
    description:
      "Growing cross-sector demand where Konekt can combine procurement, services, and account support.",
  },
  {
    code: "RW",
    name: "Rwanda",
    status_label: "Expansion target",
    badge: "East Africa",
    description:
      "High execution discipline and strong fit for a structured local operating partner model.",
  },
  {
    code: "GH",
    name: "Ghana",
    status_label: "Strategic growth market",
    badge: "West Africa",
    description:
      "A strong market for managed products, services, and country-level operating partnerships.",
  },
];

export default function ExpansionPremiumPage() {
  const [selectedCountry, setSelectedCountry] = useState("KE");
  const [interestForm, setInterestForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    country_code: "KE",
    region: "",
    interest_summary: "",
  });
  const [partnerForm, setPartnerForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country_code: "KE",
    local_presence_summary: "",
    commercial_capacity: "",
    operations_capacity: "",
  });

  useEffect(() => {
    setInterestForm((p) => ({ ...p, country_code: selectedCountry }));
    setPartnerForm((p) => ({ ...p, country_code: selectedCountry }));
  }, [selectedCountry]);

  const selected = useMemo(
    () => defaultCountries.find((x) => x.code === selectedCountry) || defaultCountries[0],
    [selectedCountry]
  );

  const submitInterest = (e) => {
    e.preventDefault();
    alert("Customer/business interest captured.");
  };

  const submitPartner = (e) => {
    e.preventDefault();
    alert("Local representative partner application captured.");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbarV2 />

      <main>
        <section className="bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white">
          <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <div className="text-xs tracking-[0.22em] uppercase text-slate-300 font-semibold">
                Africa Expansion
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mt-4 leading-tight">
                Bring Konekt to your market as a local operating partner
              </h1>
              <p className="text-slate-200 mt-6 text-lg max-w-3xl">
                Konekt is a digital procurement and service orchestration platform that combines
                products, services, structured quotes, invoices, orders, and regional execution into
                one coordinated system. We are looking for strong local representative partners to
                help launch and operate Konekt country by country.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                <div className="rounded-3xl bg-white/10 border border-white/10 p-5">
                  <div className="font-bold text-xl">What you get</div>
                  <p className="text-slate-200 mt-3 text-sm leading-6">
                    A structured commercial platform, centralized systems, demand capture, and a scalable
                    model for products, services, and account management.
                  </p>
                </div>
                <div className="rounded-3xl bg-white/10 border border-white/10 p-5">
                  <div className="font-bold text-xl">What we need</div>
                  <p className="text-slate-200 mt-3 text-sm leading-6">
                    Local market knowledge, commercial discipline, operational capacity, and the ability
                    to represent Konekt with quality and consistency.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white text-slate-900 p-8 shadow-xl">
              <div className="text-2xl font-bold text-[#20364D]">Why this model works</div>
              <div className="space-y-4 mt-6 text-slate-700">
                <div>• Unified products + services marketplace</div>
                <div>• Structured quote, invoice, and order workflows</div>
                <div>• Real-time operational visibility</div>
                <div>• Country and region-based routing</div>
                <div>• Controlled partner ecosystem with quality oversight</div>
                <div>• Business pricing and account support</div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10">
            <div>
              <div className="text-3xl font-bold text-[#20364D]">Choose a target country</div>
              <p className="text-slate-600 mt-3">
                Select the country you are interested in and see how Konekt plans to enter that market.
              </p>

              <div className="grid gap-4 mt-8">
                {defaultCountries.map((country) => (
                  <ExpansionCountryCard
                    key={country.code}
                    country={country}
                    selected={country.code === selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border bg-white p-8">
                <div className="text-3xl font-bold text-[#20364D]">
                  {selected.name}: who we want to meet
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="font-bold text-[#20364D]">Business / market interest</div>
                    <p className="text-slate-600 mt-2 text-sm">
                      Companies, institutions, and decision-makers who want Konekt available in their country.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="font-bold text-[#20364D]">Local representative partners</div>
                    <p className="text-slate-600 mt-2 text-sm">
                      Strong country-side operators with commercial and operational capacity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-6">
                <form onSubmit={submitInterest} className="rounded-[2rem] border bg-white p-8">
                  <div className="text-2xl font-bold text-[#20364D]">Business interest form</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Tell us about the products and services you would want in this market.
                  </p>

                  <div className="grid gap-4 mt-6">
                    <input className="border rounded-xl px-4 py-3" placeholder="Full name" value={interestForm.full_name} onChange={(e) => setInterestForm({ ...interestForm, full_name: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Email" value={interestForm.email} onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Phone" value={interestForm.phone} onChange={(e) => setInterestForm({ ...interestForm, phone: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Company name (optional)" value={interestForm.company_name} onChange={(e) => setInterestForm({ ...interestForm, company_name: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Region / city" value={interestForm.region} onChange={(e) => setInterestForm({ ...interestForm, region: e.target.value })} />
                    <textarea className="border rounded-xl px-4 py-3 min-h-[120px]" placeholder="What do you need Konekt to provide in this market?" value={interestForm.interest_summary} onChange={(e) => setInterestForm({ ...interestForm, interest_summary: e.target.value })} />
                  </div>

                  <button type="submit" className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
                    Submit Interest
                  </button>
                </form>

                <form onSubmit={submitPartner} className="rounded-[2rem] border bg-white p-8">
                  <div className="text-2xl font-bold text-[#20364D]">Local representative partner</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Apply to become the local operating partner for Konekt in {selected.name}.
                  </p>

                  <div className="grid gap-4 mt-6">
                    <input className="border rounded-xl px-4 py-3" placeholder="Company name" value={partnerForm.company_name} onChange={(e) => setPartnerForm({ ...partnerForm, company_name: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Contact name" value={partnerForm.contact_name} onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} />
                    <input className="border rounded-xl px-4 py-3" placeholder="Phone" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} />
                    <textarea className="border rounded-xl px-4 py-3 min-h-[100px]" placeholder="Describe your local presence and market reach" value={partnerForm.local_presence_summary} onChange={(e) => setPartnerForm({ ...partnerForm, local_presence_summary: e.target.value })} />
                    <textarea className="border rounded-xl px-4 py-3 min-h-[100px]" placeholder="Commercial capacity and ability to grow the market" value={partnerForm.commercial_capacity} onChange={(e) => setPartnerForm({ ...partnerForm, commercial_capacity: e.target.value })} />
                    <textarea className="border rounded-xl px-4 py-3 min-h-[100px]" placeholder="Operational capacity and execution capability" value={partnerForm.operations_capacity} onChange={(e) => setPartnerForm({ ...partnerForm, operations_capacity: e.target.value })} />
                  </div>

                  <button type="submit" className="mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold">
                    Apply as Local Partner
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
