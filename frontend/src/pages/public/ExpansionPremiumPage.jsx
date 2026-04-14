import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Building2, ArrowRight, CheckCircle2, Users, BarChart3, MapPin, Briefcase } from "lucide-react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";
import { toast } from "sonner";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const defaultCountries = [
  {
    code: "KE", name: "Kenya",
    status_label: "High-priority expansion", badge: "East Africa",
    description: "Strong business activity, regional connectivity, and demand for coordinated products and services.",
  },
  {
    code: "UG", name: "Uganda",
    status_label: "Expansion target", badge: "East Africa",
    description: "Growing cross-sector demand where Konekt can combine procurement, services, and account support.",
  },
  {
    code: "RW", name: "Rwanda",
    status_label: "Expansion target", badge: "East Africa",
    description: "High execution discipline and strong fit for a structured local operating partner model.",
  },
  {
    code: "GH", name: "Ghana",
    status_label: "Strategic growth market", badge: "West Africa",
    description: "A strong market for managed products, services, and country-level operating partnerships.",
  },
];

export default function ExpansionPremiumPage() {
  const queryCountry = new URLSearchParams(window.location.search).get("country");
  const [selectedCountry, setSelectedCountry] = useState(queryCountry || "KE");
  const [activeTab, setActiveTab] = useState("interest");
  const [submitting, setSubmitting] = useState(false);

  const [interestForm, setInterestForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", company_name: "",
    country_code: "KE", region: "", interest_summary: "",
  });
  const [partnerForm, setPartnerForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    country_code: "KE", local_presence_summary: "",
    commercial_capacity: "", operations_capacity: "",
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
    if (!interestForm.first_name || !interestForm.last_name || !interestForm.email || !interestForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/guest-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: [interestForm.first_name, interestForm.last_name].filter(Boolean).join(" "), email: interestForm.email,
          phone: combinePhone(interestForm.phone_prefix, interestForm.phone), company: interestForm.company_name,
          country_code: interestForm.country_code,
          intent_type: "expansion_business_interest",
          intent_payload: {
            region: interestForm.region, interest_summary: interestForm.interest_summary,
            country_name: selected.name,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Business interest captured! We'll be in touch soon.");
      setInterestForm({ first_name: "", last_name: "", email: "", phone_prefix: "+255", phone: "", company_name: "", country_code: selectedCountry, region: "", interest_summary: "" });
    } catch { toast.error("Failed to submit. Please try again."); }
    finally { setSubmitting(false); }
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
          full_name: partnerForm.contact_name, email: partnerForm.email,
          phone: combinePhone(partnerForm.phone_prefix, partnerForm.phone), company: partnerForm.company_name,
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
      if (!res.ok) throw new Error("Failed");
      toast.success("Partner application received! Our expansion team will review and contact you.");
      setPartnerForm({ company_name: "", contact_name: "", email: "", phone: "", country_code: selectedCountry, local_presence_summary: "", commercial_capacity: "", operations_capacity: "" });
    } catch { toast.error("Failed to submit. Please try again."); }
    finally { setSubmitting(false); }
  };

  const inputCls = "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 text-sm";

  return (
    <div className="min-h-screen bg-white" data-testid="expansion-premium-page">
      <PublicNavbarV2 />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0E1A2B] text-white" data-testid="expansion-hero">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A843]/15 border border-[#D4A843]/30 px-4 py-1.5">
                <Globe className="w-4 h-4 text-[#D4A843]" />
                <span className="text-[#D4A843] text-sm font-semibold">Africa Expansion Program</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.15] tracking-tight" data-testid="expansion-headline">
                Launch Konekt in Your Market
                <span className="text-[#D4A843]"> as a Local Operating Partner</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Konekt is a digital procurement and service platform combining products, services, orders, and account management into one system. We're looking for strong local partners to launch and operate Konekt country by country.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a href="#get-started" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition">
                  Get Started <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 font-semibold hover:bg-white/10 transition">
                  Learn More
                </a>
              </div>
            </div>

            {/* Stats / Highlights */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { label: "Active in", value: "Tanzania", sub: "First market" },
                { label: "Expanding to", value: "4+ Markets", sub: "East & West Africa" },
                { label: "Model", value: "Partner-Led", sub: "Local operations" },
                { label: "Platform", value: "Ready", sub: "Products + Services" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/8 border border-white/10 p-5 backdrop-blur-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{item.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-slate-50 py-16 md:py-20" data-testid="expansion-how-it-works">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Two Ways to Participate</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              Whether you want Konekt in your country or want to operate Konekt locally — there's a path for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-white p-8" data-testid="path-business">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#20364D] mb-2">I want Konekt in my market</h3>
              <p className="text-slate-600 leading-relaxed">
                Tell us about the products and services your business needs. Your interest helps us validate demand and prioritize market entry.
              </p>
              <a href="#get-started" onClick={() => setActiveTab("interest")} className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-[#20364D] hover:gap-2 transition-all">
                Express Interest <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="rounded-2xl border bg-white p-8" data-testid="path-partner">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-[#20364D] mb-2">I want to operate Konekt locally</h3>
              <p className="text-slate-600 leading-relaxed">
                Apply to become the local operating partner. You bring market knowledge and execution capacity — we bring the platform, systems, and brand.
              </p>
              <a href="#get-started" onClick={() => setActiveTab("partner")} className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-[#D4A843] hover:gap-2 transition-all">
                Apply as Partner <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Country Selection + Form */}
      <section id="get-started" className="py-16 md:py-20" data-testid="expansion-form-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[340px_1fr] gap-10">
            {/* Country Cards */}
            <div>
              <h2 className="text-2xl font-bold text-[#20364D] mb-2">Target Markets</h2>
              <p className="text-slate-600 text-sm mb-6">Select the country you're interested in.</p>
              <div className="space-y-3">
                {defaultCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountry(country.code)}
                    className={`w-full rounded-2xl border p-5 text-left transition-all ${
                      country.code === selectedCountry
                        ? "bg-[#20364D] text-white border-[#20364D] shadow-lg"
                        : "bg-white hover:shadow-md"
                    }`}
                    data-testid={`country-card-${country.code}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-lg">{country.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        country.code === selectedCountry ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                      }`}>{country.badge}</span>
                    </div>
                    <p className={`text-sm leading-relaxed mt-1 ${
                      country.code === selectedCountry ? "text-slate-300" : "text-slate-500"
                    }`}>{country.status_label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Area */}
            <div>
              {/* Tab Switcher */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab("interest")}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeTab === "interest" ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  data-testid="tab-interest"
                >
                  Business Interest
                </button>
                <button
                  onClick={() => setActiveTab("partner")}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeTab === "partner" ? "bg-[#D4A843] text-[#17283C]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  data-testid="tab-partner"
                >
                  Partner Application
                </button>
              </div>

              {activeTab === "interest" ? (
                <form onSubmit={submitInterest} className="rounded-2xl border bg-white p-8" data-testid="business-interest-form">
                  <h3 className="text-2xl font-bold text-[#20364D]">Tell us what you need in {selected.name}</h3>
                  <p className="text-slate-600 mt-2 mb-6">Share your business requirements to help us validate demand in this market.</p>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputCls} placeholder="First name *" value={interestForm.first_name} onChange={(e) => setInterestForm({ ...interestForm, first_name: e.target.value })} data-testid="interest-first-name" />
                        <input className={inputCls} placeholder="Last name *" value={interestForm.last_name} onChange={(e) => setInterestForm({ ...interestForm, last_name: e.target.value })} data-testid="interest-last-name" />
                      </div>
                      <input className={inputCls} placeholder="Company name" value={interestForm.company_name} onChange={(e) => setInterestForm({ ...interestForm, company_name: e.target.value })} data-testid="interest-company" />
                      <input className={inputCls} placeholder="Email *" type="email" value={interestForm.email} onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })} data-testid="interest-email" />
                    </div>
                    <PhoneNumberField
                      label=""
                      prefix={interestForm.phone_prefix || "+255"}
                      number={interestForm.phone}
                      onPrefixChange={(v) => setInterestForm({ ...interestForm, phone_prefix: v })}
                      onNumberChange={(v) => setInterestForm({ ...interestForm, phone: v })}
                      testIdPrefix="interest-phone"
                    />
                    <input className={inputCls} placeholder="City / Region" value={interestForm.region} onChange={(e) => setInterestForm({ ...interestForm, region: e.target.value })} data-testid="interest-region" />
                    <textarea className={`${inputCls} min-h-[120px]`} placeholder="What products or services would you want Konekt to provide in this market?" value={interestForm.interest_summary} onChange={(e) => setInterestForm({ ...interestForm, interest_summary: e.target.value })} data-testid="interest-summary" />
                  </div>
                  <button type="submit" disabled={submitting} className="mt-6 rounded-xl bg-[#20364D] text-white px-7 py-3.5 font-semibold hover:bg-[#17283c] transition disabled:opacity-50" data-testid="submit-interest-btn">
                    {submitting ? "Submitting..." : "Submit Interest"}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitPartner} className="rounded-2xl border bg-white p-8" data-testid="partner-application-form">
                  <h3 className="text-2xl font-bold text-[#20364D]">Apply as Local Partner in {selected.name}</h3>
                  <p className="text-slate-600 mt-2 mb-6">Tell us about your company and capacity to operate Konekt in this market.</p>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input className={inputCls} placeholder="Company name *" value={partnerForm.company_name} onChange={(e) => setPartnerForm({ ...partnerForm, company_name: e.target.value })} data-testid="partner-company" />
                      <input className={inputCls} placeholder="Contact name *" value={partnerForm.contact_name} onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })} data-testid="partner-contact" />
                      <input className={inputCls} placeholder="Email *" type="email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} data-testid="partner-email" />
                    </div>
                    <PhoneNumberField
                      label=""
                      prefix={partnerForm.phone_prefix || "+255"}
                      number={partnerForm.phone}
                      onPrefixChange={(v) => setPartnerForm({ ...partnerForm, phone_prefix: v })}
                      onNumberChange={(v) => setPartnerForm({ ...partnerForm, phone: v })}
                      testIdPrefix="partner-phone"
                    />
                    <textarea className={`${inputCls} min-h-[100px]`} placeholder="Describe your local presence and market reach" value={partnerForm.local_presence_summary} onChange={(e) => setPartnerForm({ ...partnerForm, local_presence_summary: e.target.value })} data-testid="partner-presence" />
                    <textarea className={`${inputCls} min-h-[100px]`} placeholder="Commercial capacity and ability to grow the market" value={partnerForm.commercial_capacity} onChange={(e) => setPartnerForm({ ...partnerForm, commercial_capacity: e.target.value })} data-testid="partner-commercial" />
                    <textarea className={`${inputCls} min-h-[100px]`} placeholder="Operational capacity and execution capability" value={partnerForm.operations_capacity} onChange={(e) => setPartnerForm({ ...partnerForm, operations_capacity: e.target.value })} data-testid="partner-operations" />
                  </div>
                  <button type="submit" disabled={submitting} className="mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50" data-testid="submit-partner-btn">
                    {submitting ? "Submitting..." : "Apply as Local Partner"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Qualifications */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="partner-qualifications">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Partner Qualification Criteria</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto text-base md:text-lg">
              We look for partners who can represent Konekt with quality, discipline, and a long-term mindset.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: "1", Icon: MapPin, title: "Local Presence", text: "Established operations and visibility in the target country." },
              { num: "2", Icon: BarChart3, title: "Commercial Capacity", text: "Ability to drive sales, manage accounts, and grow the customer base." },
              { num: "3", Icon: Users, title: "Operational Strength", text: "Capability to execute orders, coordinate delivery, and maintain quality." },
              { num: "4", Icon: CheckCircle2, title: "Long-term Alignment", text: "Commitment to building a sustainable local operation with Konekt." },
            ].map((item) => (
              <div key={item.num} className="rounded-2xl bg-white border p-6 hover:shadow-lg transition-shadow group" data-testid={`qualification-${item.num}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-full bg-[#20364D] text-white flex items-center justify-center text-sm font-bold">{item.num}</span>
                  <item.Icon className="w-5 h-5 text-[#D4A843] group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-lg font-bold text-[#20364D] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20" data-testid="expansion-cta">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-[#0E1A2B] text-white p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 md:w-10 md:h-10 text-[#D4A843]" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Ready to Bring Konekt to Your Country?</h2>
              <p className="text-slate-300 leading-relaxed max-w-2xl">
                Whether you're a business that wants our services or a company ready to operate as our local partner — we want to hear from you.
              </p>
            </div>
            <a href="#get-started" className="rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition whitespace-nowrap">
              Get Started
            </a>
          </div>
        </div>
      </section>

      <PremiumFooterV2 />
    </div>
  );
}
