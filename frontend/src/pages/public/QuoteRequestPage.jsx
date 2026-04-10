import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";
import {
  Send, User, Mail, Building2, FileText, CheckCircle2,
  Loader2, ArrowLeft, Layers3, Clock, Upload, Package,
  Palette, Wrench, HelpCircle, Calendar, ArrowRight,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NEED_OPTIONS = [
  { value: "products", label: "Products", icon: Package, desc: "Office equipment, stationery, PPE, furniture" },
  { value: "promo", label: "Promotional", icon: Palette, desc: "Branded items, giveaways, custom materials" },
  { value: "services", label: "Services", icon: Wrench, desc: "Printing, design, branding, maintenance" },
  { value: "other", label: "Other", icon: HelpCircle, desc: "Not sure yet — tell us what you need" },
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

const BUDGET_RANGES = [
  { value: "", label: "Select budget range (optional)" },
  { value: "under_100k", label: "Under TZS 100,000" },
  { value: "100k_500k", label: "TZS 100,000 – 500,000" },
  { value: "500k_2m", label: "TZS 500,000 – 2,000,000" },
  { value: "2m_5m", label: "TZS 2,000,000 – 5,000,000" },
  { value: "over_5m", label: "Over TZS 5,000,000" },
  { value: "not_sure", label: "Not sure yet" },
];

const URGENCY_OPTIONS = [
  { value: "flexible", label: "Flexible — no rush" },
  { value: "within_month", label: "Within a month" },
  { value: "within_week", label: "Within a week" },
  { value: "urgent", label: "Urgent — ASAP" },
];

const INPUT_CLS = "w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 transition-colors";
const LABEL_CLS = "block text-sm font-medium text-slate-700 mb-1.5";

export default function QuoteRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill from URL
  const preService = searchParams.get("service") || "";
  const preType = searchParams.get("type") || "";
  const preCategory = searchParams.get("category") || "";

  const initialNeed = useMemo(() => {
    if (preType === "service_quote" || preService) return "services";
    if (preType === "product_bulk") return "products";
    if (preType === "promo_custom" || preType === "promo_sample") return "promo";
    return "";
  }, [preType, preService]);

  // Logged-in user detection + auto-fill
  const [user, setUser] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setUser(data); })
      .catch(() => {});
  }, []);

  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    primary_need: initialNeed,
    service_category: preCategory || "",
    service_name: preService ? preService.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "",
    description: "",
    quantity: "",
    urgency: "flexible",
    budget_range: "",
    full_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
  });

  // Auto-fill when user data loads
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      full_name: f.full_name || user.full_name || user.name || "",
      email: f.email || user.email || "",
      phone: f.phone || user.phone || "",
      company_name: f.company_name || user.company_name || user.business_name || "",
    }));
  }, [user]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const canAdvance = () => {
    if (step === 1) return !!form.primary_need;
    if (step === 2) return true; // timeline/budget are optional
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return toast.error("Please enter your name and email");

    setSubmitting(true);
    try {
      const requestType = form.primary_need === "products" ? "product_bulk"
        : form.primary_need === "promo" ? "promo_custom"
        : form.primary_need === "services" ? "service_quote"
        : "contact_general";

      const payload = {
        request_type: requestType,
        title: `${form.primary_need.charAt(0).toUpperCase()}${form.primary_need.slice(1)} Request`,
        guest_name: form.full_name,
        guest_email: form.email,
        phone_prefix: form.phone_prefix,
        phone: form.phone,
        company_name: form.company_name,
        service_name: form.service_name,
        service_slug: preService,
        source_page: "/request-quote",
        details: {
          primary_lane: form.primary_need,
          service_category: form.service_category,
          urgency: form.urgency,
          budget_range: form.budget_range,
          quantity: form.quantity,
          scope_message: form.description,
        },
        notes: form.description,
      };

      const res = await fetch(`${API_URL}/api/public-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to submit request");
      setSubmitted(data);
    } catch (err) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────── Success State ──────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicNavbarV2 />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-2xl bg-white border p-10 text-center" data-testid="quote-success">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 animate-[scale-in_0.3s_ease-out]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#20364D]">Quote Request Submitted</h1>
            <p className="text-slate-600 mt-3">
              Reference: <span className="font-semibold text-[#20364D]">{submitted.request_number}</span>
            </p>
            <div className="mt-5 rounded-xl bg-[#20364D]/5 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-[#20364D] mb-1">
                <Clock className="w-4 h-4" /> Expected Response
              </div>
              Our sales team will review your request and follow up within <strong>24 hours</strong>.
            </div>

            {submitted.account_invite && (
              <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left text-sm" data-testid="quote-activation-banner">
                <p className="font-bold text-blue-900">Track this request</p>
                <p className="text-blue-800 mt-1">Create a free account to follow progress and manage future orders.</p>
                <a href={submitted.account_invite.invite_url} className="inline-block mt-3 rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold text-sm hover:bg-blue-700 transition">
                  Create Account
                </a>
              </div>
            )}

            <div className="flex flex-col gap-2.5 mt-6">
              <button
                onClick={() => { setSubmitted(null); setStep(1); setForm((f) => ({ ...f, description: "", quantity: "", service_name: "" })); }}
                className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition flex items-center justify-center gap-2"
                data-testid="submit-another-btn"
              >
                Submit Another Request <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/marketplace")}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
                data-testid="quote-browse-marketplace"
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </main>
        <PremiumFooterV2 />
      </div>
    );
  }

  // ────────────────── Form ──────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50" data-testid="quote-request-page">
      <PublicNavbarV2 />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#20364D] transition-colors mb-6" data-testid="quote-back-btn">
          <ArrowLeft className="w-4 h-4" />Back
        </button>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#20364D] tracking-tight">
            Request a Quote
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg">
            Tell us what you need and our team will follow up with pricing within 24 hours.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "What you need" },
            { n: 2, label: "Timeline" },
            { n: 3, label: "Contact" },
          ].map((s) => (
            <React.Fragment key={s.n}>
              {s.n > 1 && <div className={`flex-1 h-0.5 ${step >= s.n ? "bg-[#20364D]" : "bg-slate-200"} transition-colors`} />}
              <button
                type="button"
                onClick={() => s.n <= step && setStep(s.n)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  step === s.n ? "bg-[#20364D] text-white" : step > s.n ? "bg-[#20364D]/10 text-[#20364D]" : "bg-slate-100 text-slate-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ borderColor: step >= s.n ? "currentColor" : undefined }}
                >
                  {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border p-6 sm:p-8 space-y-6" data-testid="quote-form">
          {/* ────── Step 1: What do you need? ────── */}
          {step === 1 && (
            <div className="space-y-6" data-testid="quote-step-1">
              <div>
                <h2 className="text-lg font-bold text-[#20364D] mb-4">What do you need?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {NEED_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = form.primary_need === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("primary_need", opt.value)}
                        data-testid={`primary-lane-${opt.value}`}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          active ? "border-[#20364D] bg-[#20364D]/5 ring-1 ring-[#20364D]" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${active ? "text-[#20364D]" : "text-slate-400"}`} />
                          <span className="text-sm font-semibold text-[#20364D]">{opt.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service-specific: category + name */}
              {form.primary_need === "services" && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLS}>Service Category</label>
                    <select value={form.service_category} onChange={(e) => set("service_category", e.target.value)} className={INPUT_CLS} data-testid="quote-category">
                      <option value="">Select a category</option>
                      {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {(preService || form.service_name) && (
                    <div>
                      <label className={LABEL_CLS}>Service</label>
                      <input type="text" value={form.service_name} onChange={(e) => set("service_name", e.target.value)}
                        className={`${INPUT_CLS} ${preService ? "bg-slate-50" : ""}`}
                        readOnly={!!preService}
                        data-testid="quote-service-name"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Description + quantity */}
              {form.primary_need && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLS}>Describe what you need</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      className={`${INPUT_CLS} min-h-[100px] resize-none`}
                      placeholder="e.g., 500 branded notebooks for a conference, logo design for a new product line, office branding for 3 floors..."
                      data-testid="quote-details"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Quantity (optional)</label>
                    <input type="text" value={form.quantity} onChange={(e) => set("quantity", e.target.value)}
                      className={INPUT_CLS} placeholder="e.g., 200 units, 3 locations, 1 project"
                      data-testid="quote-quantity"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition disabled:opacity-40 flex items-center gap-2"
                  data-testid="quote-next-step-1"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ────── Step 2: Timeline & Budget ────── */}
          {step === 2 && (
            <div className="space-y-5" data-testid="quote-step-2">
              <h2 className="text-lg font-bold text-[#20364D]">Timeline & Budget</h2>
              <div>
                <label className={LABEL_CLS}>When do you need this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCY_OPTIONS.map((opt) => {
                    const active = form.urgency === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => set("urgency", opt.value)}
                        className={`rounded-xl border px-4 py-3 text-sm text-left transition-all ${active ? "border-[#20364D] bg-[#20364D]/5 ring-1 ring-[#20364D] font-semibold text-[#20364D]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                        data-testid={`quote-urgency-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Budget range (optional)</label>
                <select value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} className={INPUT_CLS} data-testid="quote-budget">
                  {BUDGET_RANGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition flex items-center gap-2" data-testid="quote-next-step-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ────── Step 3: Contact Details ────── */}
          {step === 3 && (
            <div className="space-y-5" data-testid="quote-step-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#20364D]">Your Contact Details</h2>
                {user && (
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                    Auto-filled from your account
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}><User className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />Full Name *</label>
                  <input type="text" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={INPUT_CLS} placeholder="John Doe" required data-testid="quote-fullname" />
                </div>
                <div>
                  <label className={LABEL_CLS}><Mail className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />Email *</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT_CLS} placeholder="you@company.com" required data-testid="quote-email" />
                </div>
                <div>
                  <label className={LABEL_CLS}><Building2 className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />Company</label>
                  <input type="text" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={INPUT_CLS} placeholder="Acme Corp" data-testid="quote-company" />
                </div>
                <PhoneNumberField
                  prefix={form.phone_prefix}
                  number={form.phone}
                  onPrefixChange={(v) => set("phone_prefix", v)}
                  onNumberChange={(v) => set("phone", v)}
                  testIdPrefix="quote-phone"
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-slate-50 border p-4 text-sm space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Summary</p>
                <p><span className="text-slate-500">Need:</span> <span className="font-medium text-[#20364D]">{NEED_OPTIONS.find((n) => n.value === form.primary_need)?.label || "—"}</span></p>
                {form.service_name && <p><span className="text-slate-500">Service:</span> <span className="font-medium text-[#20364D]">{form.service_name}</span></p>}
                {form.description && <p><span className="text-slate-500">Details:</span> <span className="text-slate-600 line-clamp-2">{form.description}</span></p>}
                <p><span className="text-slate-500">Timeline:</span> <span className="text-slate-600">{URGENCY_OPTIONS.find((u) => u.value === form.urgency)?.label}</span></p>
                {form.budget_range && form.budget_range !== "" && <p><span className="text-slate-500">Budget:</span> <span className="text-slate-600">{BUDGET_RANGES.find((b) => b.value === form.budget_range)?.label}</span></p>}
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50 min-w-[160px]"
                  data-testid="submit-quote-btn"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Request</>}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Trust signal */}
        <p className="text-center text-xs text-slate-400 mt-6">
          No payment required. Our team reviews every request and responds within 24 hours.
        </p>
      </main>
      <PremiumFooterV2 />
    </div>
  );
}
