import React, { useEffect, useState } from "react";
import { MapPin, Building2, Users } from "lucide-react";
import api from "../../lib/api";
import { getStoredCountryCode } from "../../lib/countryPreference";

export default function CountryLaunchPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState({ waitlist: false, partner: false });

  const [waitlistForm, setWaitlistForm] = useState({
    customer_type: "individual",
    name: "",
    email: "",
    phone: "",
    company_name: "",
    region: "",
    note: "",
  });

  const [partnerForm, setPartnerForm] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    city: "",
    regions_served: "",
    company_type: "distributor",
    categories_supported: "",
    years_in_business: "",
    tax_number: "",
    registration_number: "",
    warehouse_available: false,
    service_team_available: false,
    delivery_fleet_available: false,
    website: "",
    notes: "",
  });

  const countryCode = getStoredCountryCode() || "TZ";

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/public-country/availability/${countryCode}`);
        setConfig(res.data);
      } catch (err) {
        console.error("Failed to load country config:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [countryCode]);

  const joinWaitlist = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/expansion/waitlist", {
        country_code: countryCode,
        ...waitlistForm,
        requested_products_services: waitlistForm.note ? [waitlistForm.note] : [],
      });
      setSuccess({ ...success, waitlist: true });
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to join waitlist");
    } finally {
      setSubmitting(false);
    }
  };

  const applyPartner = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/expansion/partner-application", {
        country_code: countryCode,
        ...partnerForm,
        regions_served: partnerForm.regions_served.split(",").map((x) => x.trim()).filter(Boolean),
        categories_supported: partnerForm.categories_supported.split(",").map((x) => x.trim()).filter(Boolean),
      });
      setSuccess({ ...success, partner: true });
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12" data-testid="country-launch-page">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-3xl border bg-white p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#20364D] flex items-center justify-center text-white text-2xl font-bold mb-4">
            K
          </div>
          <h1 className="text-4xl font-bold text-[#20364D]">
            {config?.headline || "Konekt is Coming to Your Country"}
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            {config?.message || "We're expanding our B2B promotional materials platform across Africa. Be the first to know when we launch in your country."}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-slate-500">
            <MapPin className="w-4 h-4" />
            <span>{config?.country_name || countryCode}</span>
            {config?.currency && <span>• {config.currency}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Waitlist Form */}
          {config?.waitlist_enabled && (
            <div className="rounded-3xl border bg-white p-8" data-testid="waitlist-section">
              {success.waitlist ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700">You're on the List!</h2>
                  <p className="text-slate-600 mt-2">We'll notify you when we launch in your country.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold">Join the Waitlist</h2>
                  </div>

                  <form onSubmit={joinWaitlist} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">I am a...</label>
                      <select
                        className="w-full border rounded-xl px-4 py-3"
                        value={waitlistForm.customer_type}
                        onChange={(e) => setWaitlistForm({ ...waitlistForm, customer_type: e.target.value })}
                        data-testid="waitlist-type-select"
                      >
                        <option value="individual">Individual</option>
                        <option value="company">Company/Business</option>
                      </select>
                    </div>

                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Your name *"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm({ ...waitlistForm, name: e.target.value })}
                      required
                      data-testid="waitlist-name-input"
                    />

                    <input
                      type="email"
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Email address *"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm({ ...waitlistForm, email: e.target.value })}
                      required
                      data-testid="waitlist-email-input"
                    />

                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Phone number"
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm({ ...waitlistForm, phone: e.target.value })}
                      data-testid="waitlist-phone-input"
                    />

                    {waitlistForm.customer_type === "company" && (
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Company name"
                        value={waitlistForm.company_name}
                        onChange={(e) => setWaitlistForm({ ...waitlistForm, company_name: e.target.value })}
                        data-testid="waitlist-company-input"
                      />
                    )}

                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="City/Region"
                      value={waitlistForm.region}
                      onChange={(e) => setWaitlistForm({ ...waitlistForm, region: e.target.value })}
                      data-testid="waitlist-region-input"
                    />

                    <textarea
                      className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
                      placeholder="What products or services are you interested in?"
                      value={waitlistForm.note}
                      onChange={(e) => setWaitlistForm({ ...waitlistForm, note: e.target.value })}
                      data-testid="waitlist-note-input"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] transition disabled:opacity-50"
                      data-testid="waitlist-submit-btn"
                    >
                      {submitting ? "Joining..." : "Join Waitlist"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Partner Application Form */}
          {config?.partner_recruitment_enabled && (
            <div className="rounded-3xl border bg-white p-8" data-testid="partner-section">
              {success.partner ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-amber-700">Application Submitted!</h2>
                  <p className="text-slate-600 mt-2">Our team will review your application and get in touch.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold">Become a Local Partner</h2>
                  </div>

                  <p className="text-slate-600 text-sm mb-6">
                    We're looking for qualified distributors, service providers, and manufacturers to partner with us.
                  </p>

                  <form onSubmit={applyPartner} className="space-y-4">
                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Company name *"
                      value={partnerForm.company_name}
                      onChange={(e) => setPartnerForm({ ...partnerForm, company_name: e.target.value })}
                      required
                      data-testid="partner-company-input"
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Contact person *"
                        value={partnerForm.contact_person}
                        onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                        required
                        data-testid="partner-contact-input"
                      />
                      <input
                        type="email"
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Email *"
                        value={partnerForm.email}
                        onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                        required
                        data-testid="partner-email-input"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Phone"
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                        data-testid="partner-phone-input"
                      />
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="City"
                        value={partnerForm.city}
                        onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                        data-testid="partner-city-input"
                      />
                    </div>

                    <select
                      className="w-full border rounded-xl px-4 py-3"
                      value={partnerForm.company_type}
                      onChange={(e) => setPartnerForm({ ...partnerForm, company_type: e.target.value })}
                      data-testid="partner-type-select"
                    >
                      <option value="distributor">Distributor</option>
                      <option value="service_provider">Service Provider</option>
                      <option value="manufacturer">Manufacturer</option>
                      <option value="hybrid">Hybrid (Multiple)</option>
                    </select>

                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Regions served (comma separated)"
                      value={partnerForm.regions_served}
                      onChange={(e) => setPartnerForm({ ...partnerForm, regions_served: e.target.value })}
                      data-testid="partner-regions-input"
                    />

                    <input
                      className="w-full border rounded-xl px-4 py-3"
                      placeholder="Categories/Products supported (comma separated)"
                      value={partnerForm.categories_supported}
                      onChange={(e) => setPartnerForm({ ...partnerForm, categories_supported: e.target.value })}
                      data-testid="partner-categories-input"
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Years in business"
                        value={partnerForm.years_in_business}
                        onChange={(e) => setPartnerForm({ ...partnerForm, years_in_business: e.target.value })}
                        data-testid="partner-years-input"
                      />
                      <input
                        className="w-full border rounded-xl px-4 py-3"
                        placeholder="Website (optional)"
                        value={partnerForm.website}
                        onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                        data-testid="partner-website-input"
                      />
                    </div>

                    <div className="space-y-3 py-2">
                      <label className="flex items-center gap-3 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          checked={partnerForm.warehouse_available}
                          onChange={(e) => setPartnerForm({ ...partnerForm, warehouse_available: e.target.checked })}
                          data-testid="partner-warehouse-check"
                        />
                        Has warehouse or stock-holding capacity
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          checked={partnerForm.service_team_available}
                          onChange={(e) => setPartnerForm({ ...partnerForm, service_team_available: e.target.checked })}
                          data-testid="partner-service-check"
                        />
                        Has service/operations team
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          checked={partnerForm.delivery_fleet_available}
                          onChange={(e) => setPartnerForm({ ...partnerForm, delivery_fleet_available: e.target.checked })}
                          data-testid="partner-delivery-check"
                        />
                        Has delivery fleet
                      </label>
                    </div>

                    <textarea
                      className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
                      placeholder="Tell us more about your business and why you'd be a great partner"
                      value={partnerForm.notes}
                      onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                      data-testid="partner-notes-input"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-[#D4A843] text-slate-900 px-5 py-3 font-semibold hover:bg-[#c99a3b] transition disabled:opacity-50"
                      data-testid="partner-submit-btn"
                    >
                      {submitting ? "Submitting..." : "Submit Application"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
