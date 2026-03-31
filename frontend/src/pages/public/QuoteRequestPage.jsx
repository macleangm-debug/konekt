import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import CurrencyInput from "../../components/forms/CurrencyInput";
import { toast } from "sonner";
import {
  Send,
  Building2,
  User,
  Mail,
  FileText,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SERVICE_CATEGORIES = [
  { value: "printing_branding", label: "Printing & Branding" },
  { value: "creative_design", label: "Creative & Design" },
  { value: "facilities", label: "Facilities Services" },
  { value: "technical", label: "Technical Support" },
  { value: "business_support", label: "Business Support" },
  { value: "uniforms", label: "Uniforms & Workwear" },
  { value: "office_equipment", label: "Office Equipment" },
  { value: "promotional_materials", label: "Promotional Materials" },
  { value: "other", label: "Other / Not Sure" },
];

const URGENCY_OPTIONS = [
  { value: "flexible", label: "Flexible timeline" },
  { value: "within_week", label: "Within a week" },
  { value: "within_month", label: "Within a month" },
  { value: "urgent", label: "Urgent (ASAP)" },
];

const TYPE_CONFIG = {
  service_quote: {
    title: "Request a Service Quote",
    description: "Tell us what you need. Our team will review your request, prepare a quote, and get back to you within 24 hours.",
  },
  business_pricing: {
    title: "Request Business Pricing",
    description: "Ideal for recurring orders, account-managed supply, and contract pricing discussions.",
  },
};

export default function QuoteRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type") || "service_quote";
  const preselectedService = searchParams.get("service") || "";
  const preselectedCategory = searchParams.get("category") || "";
  const requestType = TYPE_CONFIG[requestedType] ? requestedType : "service_quote";
  const config = useMemo(() => TYPE_CONFIG[requestType], [requestType]);

  const isLoggedIn = useMemo(
    () => Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")),
    []
  );

  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
    service_category: preselectedCategory || "",
    service_name: preselectedService || "",
    urgency: "flexible",
    budget_amount: null,
    message: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast.error("Please fill in your name and email");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        request_type: requestType,
        title: config.title,
        guest_name: form.full_name,
        guest_email: form.email,
        phone_prefix: form.phone_prefix,
        phone: form.phone,
        company_name: form.company_name,
        service_name: form.service_name,
        service_slug: preselectedService,
        budget_amount: form.budget_amount,
        source_page: "/request-quote",
        details: {
          service_category: form.service_category,
          urgency: form.urgency,
          scope_message: form.message,
        },
        notes: form.message,
      };
      const res = await fetch(`${API_URL}/api/public-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to submit request");
      setSubmitted(data);
      toast.success(`Request submitted: ${data.request_number}`);
    } catch (err) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbarV2 />
        <main className="max-w-2xl mx-auto px-6 py-20">
          <div className="rounded-[2rem] bg-white border p-12 text-center" data-testid="quote-success">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-[#20364D]">Request Received</h1>
            <p className="text-slate-600 mt-4 text-lg">
              Reference: <span className="font-semibold">{submitted.request_number}</span>
            </p>
            <p className="text-slate-500 mt-2">
              Our team will review your request and get back to you within 24 hours.
            </p>
            {submitted.account_invite && (
              <div className="mt-6 rounded-xl bg-blue-50 border-2 border-blue-200 p-5 text-left" data-testid="quote-activation-banner">
                <p className="font-bold text-blue-900">Your Konekt account has been created</p>
                <p className="text-blue-800 text-sm mt-1">Activate it to track requests, quotes, invoices, and orders.</p>
                <a
                  href={submitted.account_invite.invite_url}
                  className="inline-block mt-3 rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold hover:bg-blue-700 transition"
                >
                  Activate Account
                </a>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <button
                onClick={() => navigate("/services")}
                className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition"
                data-testid="quote-browse-services"
              >
                Browse Services
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="quote-request-page">
      <PublicNavbarV2 />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-8"
          data-testid="quote-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-12 mb-8">
          <div className="text-xs tracking-[0.22em] uppercase text-slate-300 font-semibold">Get Started</div>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">{config.title}</h1>
          <p className="text-slate-200 mt-4 text-lg max-w-2xl">{config.description}</p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white border p-8 md:p-10" data-testid="quote-form">
          <h2 className="text-2xl font-bold text-[#20364D] mb-6">Your Details</h2>

          <div className="grid md:grid-cols-2 gap-5 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="John Doe"
                required
                data-testid="quote-fullname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Company Name
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Acme Corporation"
                data-testid="quote-company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="you@company.com"
                required
                data-testid="quote-email"
              />
            </div>
            <PhoneNumberField
              prefix={form.phone_prefix}
              number={form.phone}
              onPrefixChange={(v) => handleChange("phone_prefix", v)}
              onNumberChange={(v) => handleChange("phone", v)}
              required
              testIdPrefix="quote-phone"
            />
          </div>

          <hr className="my-8" />

          <h2 className="text-2xl font-bold text-[#20364D] mb-6">Service Requirements</h2>
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Service Category
                </label>
                <select
                  value={form.service_category}
                  onChange={(e) => handleChange("service_category", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="quote-category"
                >
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timeline / Urgency</label>
                <select
                  value={form.urgency}
                  onChange={(e) => handleChange("urgency", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="quote-urgency"
                >
                  {URGENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {preselectedService && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Service</label>
                <input
                  type="text"
                  value={form.service_name}
                  onChange={(e) => handleChange("service_name", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="quote-service-name"
                />
              </div>
            )}

            <CurrencyInput
              label="Budget Estimate (optional)"
              value={form.budget_amount}
              onChange={(v) => handleChange("budget_amount", v)}
              testId="quote-budget"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tell us what you need *</label>
              <textarea
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[160px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Describe your requirements... e.g., 500 business cards, office branding for new premises, logo design, etc."
                required
                data-testid="quote-details"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border px-5 py-4 mt-8 text-sm text-slate-600">
            <strong>What happens next?</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Our team reviews your request within 24 hours</li>
              <li>We'll reach out to clarify any details if needed</li>
              <li>You'll receive a customized quote</li>
              <li>No obligation — compare and decide at your pace</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-4 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="submit-quote-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => navigate("/account/business-pricing")}
                className="rounded-xl border px-6 py-4 font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Use Account Form Instead
              </button>
            )}
          </div>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}
