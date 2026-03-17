import React, { useEffect, useState } from "react";
import { Globe, Building2, Truck, Package, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ExpansionLandingPageV2() {
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState("KE");

  const [demandForm, setDemandForm] = useState({
    country_code: "KE",
    region: "",
    name: "",
    company_name: "",
    email: "",
    phone: "",
    interest_type: "business",
    categories_csv: "",
    notes: "",
  });

  const [partnerForm, setPartnerForm] = useState({
    country_code: "KE",
    application_type: "country_operator",
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    business_registration: "",
    years_operating: "",
    regions_supported_csv: "",
    categories_supported_csv: "",
    operational_summary: "",
    has_warehousing: false,
    has_delivery_capacity: false,
  });

  useEffect(() => {
    fetch(`${API}/api/geography/countries`)
      .then((res) => res.json())
      .then((data) => setCountries(data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setDemandForm((p) => ({ ...p, country_code: selected }));
    setPartnerForm((p) => ({ ...p, country_code: selected }));
  }, [selected]);

  const submitDemand = async () => {
    try {
      await fetch(`${API}/api/country-demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...demandForm,
          categories_of_interest: demandForm.categories_csv.split(",").map((x) => x.trim()).filter(Boolean),
        }),
      });
      toast.success("Interest submitted successfully!");
      setDemandForm({ ...demandForm, name: "", email: "", company_name: "", phone: "", notes: "", categories_csv: "", region: "" });
    } catch (error) {
      toast.error("Failed to submit. Please try again.");
    }
  };

  const submitPartner = async () => {
    try {
      await fetch(`${API}/api/country-partner-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...partnerForm,
          regions_supported: partnerForm.regions_supported_csv.split(",").map((x) => x.trim()).filter(Boolean),
          categories_supported: partnerForm.categories_supported_csv.split(",").map((x) => x.trim()).filter(Boolean),
        }),
      });
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit. Please try again.");
    }
  };

  const selectedCountry = countries.find((c) => c.code === selected);

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="expansion-landing-page">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0E1A2B] to-[#20364D] text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-[#D4A843]" />
            <span className="text-[#D4A843] font-semibold">Expansion Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold max-w-4xl leading-tight">
            Expand Konekt across Africa with the right local partners
          </h1>
          <p className="text-slate-200 mt-6 text-lg max-w-3xl">
            We're looking for qualified country operating partners while also validating customer demand in each market.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Country Selector */}
        <div className="rounded-2xl border bg-white p-6 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <div className="text-lg font-semibold text-[#20364D]">Select target country</div>
              <p className="text-slate-500 text-sm mt-1">Choose where you want to use or operate Konekt</p>
            </div>
            <select
              className="md:ml-auto w-full md:w-[300px] border rounded-xl px-4 py-3 font-medium"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              data-testid="country-selector"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Two-Column Forms */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Customer Demand Form */}
          <div className="rounded-3xl border bg-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#20364D]">I want to use Konekt</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Tell us what products and services you would want Konekt to provide in {selectedCountry?.name || selected}.
            </p>

            <div className="grid gap-4">
              <input className="border rounded-xl px-4 py-3" placeholder="Your Name *" value={demandForm.name} onChange={(e) => setDemandForm({ ...demandForm, name: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Company Name" value={demandForm.company_name} onChange={(e) => setDemandForm({ ...demandForm, company_name: e.target.value })} />
              <div className="grid md:grid-cols-2 gap-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Email *" value={demandForm.email} onChange={(e) => setDemandForm({ ...demandForm, email: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Phone" value={demandForm.phone} onChange={(e) => setDemandForm({ ...demandForm, phone: e.target.value })} />
              </div>
              <input className="border rounded-xl px-4 py-3" placeholder="City / Region" value={demandForm.region} onChange={(e) => setDemandForm({ ...demandForm, region: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Products / services of interest (comma separated)" value={demandForm.categories_csv} onChange={(e) => setDemandForm({ ...demandForm, categories_csv: e.target.value })} />
              <textarea className="border rounded-xl px-4 py-3 min-h-[100px]" placeholder="Tell us more about what you need..." value={demandForm.notes} onChange={(e) => setDemandForm({ ...demandForm, notes: e.target.value })} />
            </div>

            <button
              onClick={submitDemand}
              className="w-full mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283C] transition"
              data-testid="submit-demand-btn"
            >
              Submit Market Interest
            </button>
          </div>

          {/* Partner Application Form */}
          <div className="rounded-3xl border bg-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#20364D]">I want to be a partner</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Apply to operate or supply through Konekt in {selectedCountry?.name || selected}.
            </p>

            <div className="grid gap-4">
              <select className="border rounded-xl px-4 py-3" value={partnerForm.application_type} onChange={(e) => setPartnerForm({ ...partnerForm, application_type: e.target.value })}>
                <option value="country_operator">Country Operating Partner</option>
                <option value="product_partner">Product Supplier</option>
                <option value="service_partner">Service Provider</option>
                <option value="delivery_partner">Delivery Partner</option>
              </select>

              <input className="border rounded-xl px-4 py-3" placeholder="Company Name *" value={partnerForm.company_name} onChange={(e) => setPartnerForm({ ...partnerForm, company_name: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Contact Name *" value={partnerForm.contact_name} onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })} />
              <div className="grid md:grid-cols-2 gap-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Email *" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Phone *" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Business Registration" value={partnerForm.business_registration} onChange={(e) => setPartnerForm({ ...partnerForm, business_registration: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Years in Operation" value={partnerForm.years_operating} onChange={(e) => setPartnerForm({ ...partnerForm, years_operating: e.target.value })} />
              </div>
              <input className="border rounded-xl px-4 py-3" placeholder="Regions Covered (comma separated)" value={partnerForm.regions_supported_csv} onChange={(e) => setPartnerForm({ ...partnerForm, regions_supported_csv: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Capabilities / Categories (comma separated)" value={partnerForm.categories_supported_csv} onChange={(e) => setPartnerForm({ ...partnerForm, categories_supported_csv: e.target.value })} />
              <textarea className="border rounded-xl px-4 py-3 min-h-[100px]" placeholder="Operational summary - tell us about your business..." value={partnerForm.operational_summary} onChange={(e) => setPartnerForm({ ...partnerForm, operational_summary: e.target.value })} />

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={partnerForm.has_warehousing} onChange={(e) => setPartnerForm({ ...partnerForm, has_warehousing: e.target.checked })} />
                  <span className="text-slate-700">We have warehousing or stock capacity</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={partnerForm.has_delivery_capacity} onChange={(e) => setPartnerForm({ ...partnerForm, has_delivery_capacity: e.target.checked })} />
                  <span className="text-slate-700">We have delivery / field execution capacity</span>
                </label>
              </div>
            </div>

            <button
              onClick={submitPartner}
              className="w-full mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition"
              data-testid="submit-partner-btn"
            >
              Apply as Partner
            </button>
          </div>
        </div>

        {/* Why Partner With Us */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-[#20364D] mb-8 text-center">Why Partner With Konekt?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border bg-white p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-[#20364D]">Ready Platform</h3>
              <p className="text-slate-600 mt-2 text-sm">Full marketplace, services, and operations infrastructure ready to deploy.</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-[#20364D]">Revenue Share</h3>
              <p className="text-slate-600 mt-2 text-sm">Earn on every transaction in your territory with transparent settlements.</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-[#20364D]">Support & Training</h3>
              <p className="text-slate-600 mt-2 text-sm">Full onboarding, operational support, and ongoing partnership management.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
