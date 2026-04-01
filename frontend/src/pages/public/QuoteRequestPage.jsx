import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import CurrencyInput from "../../components/forms/CurrencyInput";
import { toast } from "sonner";
import { Send, Building2, User, Mail, FileText, CheckCircle2, Loader2, ArrowLeft, Layers3 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIMARY_OPTIONS = [
  { value: "products", label: "Products" },
  { value: "promo", label: "Promotional Materials" },
  { value: "services", label: "Services" },
];

const PRODUCT_OPTIONS = [
  { value: "office_equipment", label: "Office Equipment" },
  { value: "stationery", label: "Stationery" },
  { value: "furniture", label: "Furniture" },
  { value: "ppe", label: "PPE & Safety" },
  { value: "other", label: "Other Products" },
];

const PROMO_OPTIONS = [
  { value: "promo_custom", label: "Customize & Request Quote" },
  { value: "promo_sample", label: "Request Sample" },
];

const SERVICE_CATEGORIES = [
  { value: "printing_branding", label: "Printing & Branding" },
  { value: "creative_design", label: "Creative & Design" },
  { value: "facilities", label: "Facilities Services" },
  { value: "technical", label: "Technical Support" },
  { value: "business_support", label: "Business Support" },
  { value: "uniforms", label: "Uniforms & Workwear" },
  { value: "other", label: "Other / Not Sure" },
];

const URGENCY_OPTIONS = [
  { value: "flexible", label: "Flexible timeline" },
  { value: "within_week", label: "Within a week" },
  { value: "within_month", label: "Within a month" },
  { value: "urgent", label: "Urgent (ASAP)" },
];

export default function QuoteRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedService = searchParams.get("service") || "";
  const preselectedType = searchParams.get("type") || "";
  const preselectedPrimary = searchParams.get("primary") || "";
  const preselectedItem = searchParams.get("item") || "";

  const initialPrimaryNeed = useMemo(() => {
    if (preselectedPrimary === "promo" || preselectedPrimary === "services" || preselectedPrimary === "products") return preselectedPrimary;
    if (["promo_custom", "promo_sample"].includes(preselectedType)) return "promo";
    if (preselectedType === "service_quote" || preselectedService) return "services";
    if (preselectedType === "product_bulk") return "products";
    return "";
  }, [preselectedPrimary, preselectedType, preselectedService]);

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
    primary_need: initialPrimaryNeed,
    product_category: "",
    promo_action: preselectedType === "promo_sample" ? "promo_sample" : "promo_custom",
    service_category: "",
    service_name: preselectedService || preselectedItem || "",
    urgency: "flexible",
    budget_amount: null,
    message: "",
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const resolveRequestType = () => {
    if (form.primary_need === "products") return "product_bulk";
    if (form.primary_need === "promo") return form.promo_action || "promo_custom";
    if (form.primary_need === "services") return "service_quote";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return toast.error("Please fill in your name and email");
    if (!form.primary_need) return toast.error("Please choose what you need first");
    if (form.primary_need === "services" && !form.service_category) return toast.error("Please select a service category");
    if (form.primary_need === "products" && !form.product_category) return toast.error("Please select a product category");

    setSubmitting(true);
    try {
      const requestType = resolveRequestType();
      const payload = {
        request_type: requestType,
        title: `${form.primary_need.charAt(0).toUpperCase()}${form.primary_need.slice(1)} Request`,
        guest_name: form.full_name,
        guest_email: form.email,
        phone_prefix: form.phone_prefix,
        phone: form.phone,
        company_name: form.company_name,
        service_name: form.service_name,
        service_slug: preselectedService || preselectedItem,
        budget_amount: form.budget_amount,
        source_page: "/request-quote",
        details: {
          primary_lane: form.primary_need,
          product_category: form.product_category,
          promo_action: form.promo_action,
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
            <p className="text-slate-500 mt-2">Our team will review your request and follow up with the right commercial flow.</p>
            {submitted.account_invite && (
              <div className="mt-6 rounded-xl bg-blue-50 border-2 border-blue-200 p-5 text-left" data-testid="quote-activation-banner">
                <p className="font-bold text-blue-900">Your Konekt account has been created</p>
                <p className="text-blue-800 text-sm mt-1">Activate it to track requests, quotes, invoices, and orders.</p>
                <a href={submitted.account_invite.invite_url} className="inline-block mt-3 rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold hover:bg-blue-700 transition">Activate Account</a>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <button onClick={() => navigate("/marketplace")} className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition" data-testid="quote-browse-marketplace">Browse Marketplace</button>
              <button onClick={() => navigate("/")} className="rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition">Back to Home</button>
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
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-8" data-testid="quote-back-btn">
          <ArrowLeft className="w-4 h-4" />Back
        </button>

        <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-12 mb-8">
          <div className="text-xs tracking-[0.22em] uppercase text-slate-300 font-semibold">Get Started</div>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">Request Products, Promotional Materials, or Services</h1>
          <p className="text-slate-200 mt-4 text-lg max-w-2xl">Start from the right lane and Konekt will route your request through bulk product quoting, promotional sampling/customization, or service scoping.</p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white border p-8 md:p-10 space-y-8" data-testid="quote-form">
          <section>
            <h2 className="text-2xl font-bold text-[#20364D] mb-6">Your Details</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><User className="w-4 h-4 inline mr-2" />Full Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" placeholder="John Doe" required data-testid="quote-fullname" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><Building2 className="w-4 h-4 inline mr-2" />Company Name</label>
                <input type="text" value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" placeholder="Acme Corporation" data-testid="quote-company" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><Mail className="w-4 h-4 inline mr-2" />Email Address *</label>
                <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" placeholder="you@company.com" required data-testid="quote-email" />
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
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#20364D] mb-4">What do you need?</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {PRIMARY_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => handleChange("primary_need", option.value)} data-testid={`primary-lane-${option.value}`} className={`rounded-2xl border p-4 text-left transition ${form.primary_need === option.value ? "border-[#20364D] bg-slate-50 ring-1 ring-[#20364D]" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#20364D]"><Layers3 className="w-4 h-4" />{option.label}</div>
                </button>
              ))}
            </div>
          </section>

          {form.primary_need === "products" && (
            <section className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><FileText className="w-4 h-4 inline mr-2" />Product Category *</label>
                <select value={form.product_category} onChange={(e) => handleChange("product_category", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" data-testid="quote-product-category">
                  <option value="">Select a product category</option>
                  {PRODUCT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </section>
          )}

          {form.primary_need === "promo" && (
            <section className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><FileText className="w-4 h-4 inline mr-2" />Promotional Request Type</label>
                <select value={form.promo_action} onChange={(e) => handleChange("promo_action", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" data-testid="quote-promo-action">
                  {PROMO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </section>
          )}

          {form.primary_need === "services" && (
            <section className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2"><FileText className="w-4 h-4 inline mr-2" />Service Category *</label>
                <select value={form.service_category} onChange={(e) => handleChange("service_category", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" data-testid="quote-category">
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              {(preselectedService || preselectedItem) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service</label>
                  <input type="text" value={form.service_name} onChange={(e) => handleChange("service_name", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" data-testid="quote-service-name" />
                </div>
              )}
            </section>
          )}

          {form.primary_need && (
            <section className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Requirement Details</label>
                <textarea value={form.message} onChange={(e) => handleChange("message", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" placeholder="Describe what you're looking for... e.g., laptops for new staff, branded notebooks, office branding for new premises, logo design, etc." data-testid="quote-details" />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Timeline / Urgency</label>
                  <select value={form.urgency} onChange={(e) => handleChange("urgency", e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" data-testid="quote-urgency">
                    {URGENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <CurrencyInput label="Budget Estimate (optional)" value={form.budget_amount} onChange={(v) => handleChange("budget_amount", v)} testId="quote-budget" />
              </div>
            </section>
          )}

          <div className="rounded-2xl bg-slate-50 border px-5 py-4 text-sm text-slate-600">
            <strong>What happens next?</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Products → bulk quote or assisted order handling</li>
              <li>Promotional Materials → customization review or sample flow</li>
              <li>Services → sales scoping, quote, and execution workflow</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={submitting} className="rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-4 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50" data-testid="submit-quote-btn">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting...</> : <><Send className="w-5 h-5" />Submit Request</>}
            </button>
            {isLoggedIn && <button type="button" onClick={() => navigate("/account/marketplace?tab=services")} className="rounded-xl border px-6 py-4 font-semibold text-slate-600 hover:bg-slate-50 transition">Use Account Workspace</button>}
          </div>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}
