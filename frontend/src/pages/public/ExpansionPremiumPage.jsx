import React, { useEffect, useMemo, useState } from "react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import ExpansionCountryCard from "../../components/public/ExpansionCountryCard";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  // Read country from query param if provided
  const queryCountry = new URLSearchParams(window.location.search).get("country");
  const [selectedCountry, setSelectedCountry] = useState(queryCountry || "KE");
  const [submitting, setSubmitting] = useState(false);
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

  const submitInterest = async (e) => {
    e.preventDefault();
    if (!interestForm.full_name || !interestForm.email || !interestForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/guest-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: interestForm.full_name,
          email: interestForm.email,
          phone: interestForm.phone,
          company: interestForm.company_name,
          country_code: interestForm.country_code,
          intent_type: "expansion_business_interest",
          intent_payload: {
            region: interestForm.region,
            interest_summary: interestForm.interest_summary,
            country_name: selected.name,
          },
        }),
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      
      toast.success("Business interest captured! We'll be in touch soon.");
      setInterestForm({
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
        country_code: selectedCountry,
        region: "",
        interest_summary: "",
      });
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPartner = async (e) => {
    e.preventDefault();
    if (!partnerForm.company_name || !partnerForm.contact_name || !partnerForm.email || !partnerForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/guest-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: partnerForm.contact_name,
          email: partnerForm.email,
          phone: partnerForm.phone,
          company: partnerForm.company_name,
          country_code: partnerForm.country_code,
          intent_type: "expansion_partner_application",
          intent_payload: {
            local_presence_summary: partnerForm.local_presence_summary,
            commercial_capacity: partnerForm.commercial_capacity,
            operations_capacity: partnerForm.operations_capacity,
            country_name: selected.name,
          },
        }),
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      
      toast.success("Partner application received! Our expansion team will review and contact you.");
      setPartnerForm({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        country_code: selectedCountry,
        local_presence_summary: "",
        commercial_capacity: "",
        operations_capacity: "",
      });
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="expansion-premium-page">
      <PublicNavbarV2 />

      <main>
        {/* Hero Section */}
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
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Unified products + services marketplace</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Structured quote, invoice, and order workflows</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Real-time operational visibility</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Country and region-based routing</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Controlled partner ecosystem with quality oversight</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#D4A843]">•</span>
                  <span>Business pricing and account support</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Country Selection & Forms */}
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
                {/* Business Interest Form */}
                <form onSubmit={submitInterest} className="rounded-[2rem] border bg-white p-8" data-testid="business-interest-form">
                  <div className="text-2xl font-bold text-[#20364D]">Business interest form</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Tell us about the products and services you would want in this market.
                  </p>

                  <div className="grid gap-4 mt-6">
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Full name *" 
                      value={interestForm.full_name} 
                      onChange={(e) => setInterestForm({ ...interestForm, full_name: e.target.value })}
                      data-testid="interest-name"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Email *" 
                      type="email"
                      value={interestForm.email} 
                      onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })}
                      data-testid="interest-email"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Phone *" 
                      value={interestForm.phone} 
                      onChange={(e) => setInterestForm({ ...interestForm, phone: e.target.value })}
                      data-testid="interest-phone"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Company name (optional)" 
                      value={interestForm.company_name} 
                      onChange={(e) => setInterestForm({ ...interestForm, company_name: e.target.value })}
                      data-testid="interest-company"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Region / city" 
                      value={interestForm.region} 
                      onChange={(e) => setInterestForm({ ...interestForm, region: e.target.value })}
                      data-testid="interest-region"
                    />
                    <textarea 
                      className="border rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="What do you need Konekt to provide in this market?" 
                      value={interestForm.interest_summary} 
                      onChange={(e) => setInterestForm({ ...interestForm, interest_summary: e.target.value })}
                      data-testid="interest-summary"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    data-testid="submit-interest-btn"
                    className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Interest"}
                  </button>
                </form>

                {/* Partner Application Form */}
                <form onSubmit={submitPartner} className="rounded-[2rem] border bg-white p-8" data-testid="partner-application-form">
                  <div className="text-2xl font-bold text-[#20364D]">Local representative partner</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Apply to become the local operating partner for Konekt in {selected.name}.
                  </p>

                  <div className="grid gap-4 mt-6">
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Company name *" 
                      value={partnerForm.company_name} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, company_name: e.target.value })}
                      data-testid="partner-company"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Contact name *" 
                      value={partnerForm.contact_name} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })}
                      data-testid="partner-contact"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Email *" 
                      type="email"
                      value={partnerForm.email} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                      data-testid="partner-email"
                    />
                    <input 
                      className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Phone *" 
                      value={partnerForm.phone} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                      data-testid="partner-phone"
                    />
                    <textarea 
                      className="border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Describe your local presence and market reach" 
                      value={partnerForm.local_presence_summary} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, local_presence_summary: e.target.value })}
                      data-testid="partner-presence"
                    />
                    <textarea 
                      className="border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Commercial capacity and ability to grow the market" 
                      value={partnerForm.commercial_capacity} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, commercial_capacity: e.target.value })}
                      data-testid="partner-commercial"
                    />
                    <textarea 
                      className="border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                      placeholder="Operational capacity and execution capability" 
                      value={partnerForm.operations_capacity} 
                      onChange={(e) => setPartnerForm({ ...partnerForm, operations_capacity: e.target.value })}
                      data-testid="partner-operations"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    data-testid="submit-partner-btn"
                    className="mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Apply as Local Partner"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Qualifications Section */}
        <section className="bg-white border-t border-b">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
              <div className="text-3xl font-bold text-[#20364D]">Partner Qualification Criteria</div>
              <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
                We look for partners who can represent Konekt with quality, discipline, and a long-term mindset.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-3xl border p-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F4E7BF] flex items-center justify-center text-xl mb-4">
                  1
                </div>
                <div className="font-bold text-[#20364D] text-lg">Local Presence</div>
                <p className="text-slate-600 mt-2 text-sm">
                  Established operations and visibility in the target country.
                </p>
              </div>
              <div className="rounded-3xl border p-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F4E7BF] flex items-center justify-center text-xl mb-4">
                  2
                </div>
                <div className="font-bold text-[#20364D] text-lg">Commercial Capacity</div>
                <p className="text-slate-600 mt-2 text-sm">
                  Ability to drive sales, manage accounts, and grow the customer base.
                </p>
              </div>
              <div className="rounded-3xl border p-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F4E7BF] flex items-center justify-center text-xl mb-4">
                  3
                </div>
                <div className="font-bold text-[#20364D] text-lg">Operational Strength</div>
                <p className="text-slate-600 mt-2 text-sm">
                  Capability to execute orders, coordinate fulfillment, and maintain quality.
                </p>
              </div>
              <div className="rounded-3xl border p-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F4E7BF] flex items-center justify-center text-xl mb-4">
                  4
                </div>
                <div className="font-bold text-[#20364D] text-lg">Long-term Alignment</div>
                <p className="text-slate-600 mt-2 text-sm">
                  Commitment to building a sustainable local operation with Konekt.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
