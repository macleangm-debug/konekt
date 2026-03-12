import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Users, CheckCircle2, ArrowRight, Sparkles, DollarSign, Target, TrendingUp } from "lucide-react";
import api from "@/lib/api";

const industries = [
  "Retail", "Healthcare", "Education", "NGO", "Technology", "Construction",
  "Manufacturing", "Hospitality", "Media", "Finance", "Real Estate", "Other"
];

export default function AffiliateApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    social_links: [""],
    audience_size: "",
    industries: [],
    region: "",
    country: "Tanzania",
    why_partner: "",
    how_promote: "",
    portfolio_link: "",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!form.full_name || !form.email) {
      setError("Please fill in your name and email");
      return;
    }
    
    try {
      setSubmitting(true);
      await api.post("/api/affiliate-applications", {
        ...form,
        social_links: form.social_links.filter(Boolean),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleIndustry = (industry) => {
    setForm(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  const addSocialLink = () => {
    setForm(prev => ({ ...prev, social_links: [...prev.social_links, ""] }));
  };

  const updateSocialLink = (index, value) => {
    setForm(prev => {
      const links = [...prev.social_links];
      links[index] = value;
      return { ...prev, social_links: links };
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" data-testid="affiliate-apply-success">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for applying to become a Konekt partner. Our team will review your application 
            and get back to you within 3-5 business days.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            A confirmation has been sent to {form.email}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166]"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="affiliate-apply-page">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#22364d] to-[#1b2f44] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-[#D4A843]" />
            Partner Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Become a Konekt Partner
          </h1>
          <p className="text-slate-200 text-lg mt-4 max-w-2xl mx-auto">
            Join our affiliate network and earn commissions by referring businesses to Konekt's 
            professional branding and merchandise services.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-[#D4A843]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-[#D4A843]" />
            </div>
            <h3 className="font-bold">Up to 15% Commission</h3>
            <p className="text-sm text-slate-600 mt-1">Earn on every successful referral</p>
          </div>
          <div className="rounded-2xl bg-white border shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-bold">Dedicated Support</h3>
            <p className="text-sm text-slate-600 mt-1">Partner resources & marketing assets</p>
          </div>
          <div className="rounded-2xl bg-white border shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold">Real-time Tracking</h3>
            <p className="text-sm text-slate-600 mt-1">Monitor your conversions live</p>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Partner Application</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="font-semibold mb-3">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Full Name *"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Email Address *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  type="text"
                  className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Company / Brand Name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
            </div>

            {/* Online Presence */}
            <div>
              <h3 className="font-semibold mb-3">Online Presence</h3>
              <input
                type="url"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Website URL"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
              <p className="text-sm text-slate-500 mb-2">Social Media Links</p>
              {form.social_links.map((link, idx) => (
                <input
                  key={idx}
                  type="url"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-2 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="https://instagram.com/yourprofile"
                  value={link}
                  onChange={(e) => updateSocialLink(idx, e.target.value)}
                />
              ))}
              <button
                type="button"
                onClick={addSocialLink}
                className="text-sm text-[#D4A843] font-medium hover:underline"
              >
                + Add another link
              </button>
            </div>

            {/* Audience */}
            <div>
              <h3 className="font-semibold mb-3">Your Audience</h3>
              <select
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white mb-3"
                value={form.audience_size}
                onChange={(e) => setForm({ ...form, audience_size: e.target.value })}
              >
                <option value="">Audience Size</option>
                <option value="1-500">1 - 500 followers/contacts</option>
                <option value="500-2000">500 - 2,000</option>
                <option value="2000-10000">2,000 - 10,000</option>
                <option value="10000-50000">10,000 - 50,000</option>
                <option value="50000+">50,000+</option>
              </select>
              
              <p className="text-sm text-slate-500 mb-2">Industries you influence (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {industries.map(industry => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => toggleIndustry(industry)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.industries.includes(industry)
                        ? "bg-[#2D3E50] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Region / City"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
              <input
                type="text"
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>

            {/* Why Partner */}
            <div>
              <h3 className="font-semibold mb-3">Partnership Details</h3>
              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-3"
                placeholder="Why do you want to partner with Konekt?"
                rows={3}
                value={form.why_partner}
                onChange={(e) => setForm({ ...form, why_partner: e.target.value })}
              />
              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                placeholder="How do you plan to promote Konekt?"
                rows={3}
                value={form.how_promote}
                onChange={(e) => setForm({ ...form, how_promote: e.target.value })}
              />
            </div>

            {/* Portfolio */}
            <input
              type="url"
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              placeholder="Portfolio or proof of reach (optional)"
              value={form.portfolio_link}
              onChange={(e) => setForm({ ...form, portfolio_link: e.target.value })}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D4A843] text-[#2D3E50] px-6 py-4 rounded-xl font-semibold hover:bg-[#c49933] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
