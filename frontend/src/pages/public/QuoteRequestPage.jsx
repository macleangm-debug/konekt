import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import { toast } from "sonner";
import { 
  Send, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  CheckCircle2,
  Loader2,
  ArrowLeft
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  
  const isLoggedIn = useMemo(() => 
    Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")), 
  []);
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    country: "Tanzania",
    region: "",
    service_category: preselectedService ? "other" : "",
    service_details: preselectedService || "",
    urgency: "flexible",
    budget_range: "",
    additional_notes: "",
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("Please fill in your name, email, and phone number");
      return;
    }
    
    if (!form.service_category) {
      toast.error("Please select a service category");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
        country: form.country,
        region: form.region,
        source: "website_quote_form",
        intent_type: "quote_request",
        intent_payload: {
          service_category: form.service_category,
          service_details: form.service_details,
          urgency: form.urgency,
          budget_range: form.budget_range,
          additional_notes: form.additional_notes,
        },
      };
      
      const res = await fetch(`${API_URL}/api/guest-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      
      setSubmitted(true);
      toast.success("Quote request submitted successfully!");
      
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit. Please try again.");
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
            <h1 className="text-3xl font-bold text-[#20364D]">Quote Request Received</h1>
            <p className="text-slate-600 mt-4 text-lg">
              Thank you for your interest! Our team will review your request and get back to you within 24 hours.
            </p>
            <p className="text-slate-500 mt-2">
              We've sent a confirmation to <strong>{form.email}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <button
                onClick={() => navigate("/services")}
                className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition"
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
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Hero */}
        <section className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-12 mb-8">
          <div className="text-xs tracking-[0.22em] uppercase text-slate-300 font-semibold">
            Get Started
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">
            Request a Quote
          </h1>
          <p className="text-slate-200 mt-4 text-lg max-w-2xl">
            Tell us about your needs and our team will prepare a customized quote for you. 
            No commitment required — just share your requirements and we'll take it from there.
          </p>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white border p-8 md:p-10">
          <h2 className="text-2xl font-bold text-[#20364D] mb-6">Your Details</h2>
          
          {/* Contact Info Grid */}
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
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="John Doe"
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
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
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
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="you@company.com"
                data-testid="quote-email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="+255 XXX XXX XXX"
                data-testid="quote-phone"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid="quote-country"
              >
                <option value="Tanzania">Tanzania</option>
                <option value="Kenya">Kenya</option>
                <option value="Uganda">Uganda</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Region / City
              </label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => handleChange("region", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Dar es Salaam"
                data-testid="quote-region"
              />
            </div>
          </div>

          <hr className="my-8" />
          
          <h2 className="text-2xl font-bold text-[#20364D] mb-6">Service Requirements</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Service Category *
              </label>
              <select
                value={form.service_category}
                onChange={(e) => handleChange("service_category", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid="quote-category"
              >
                <option value="">Select a category</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Service Details / What do you need?
              </label>
              <textarea
                value={form.service_details}
                onChange={(e) => handleChange("service_details", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Describe what you're looking for... e.g., 500 business cards, office branding for new premises, logo design, etc."
                data-testid="quote-details"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timeline / Urgency
                </label>
                <select
                  value={form.urgency}
                  onChange={(e) => handleChange("urgency", e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="quote-urgency"
                >
                  {URGENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Budget Range (optional)
                </label>
                <input
                  type="text"
                  value={form.budget_range}
                  onChange={(e) => handleChange("budget_range", e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="e.g., TZS 500,000 - 1,000,000"
                  data-testid="quote-budget"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={form.additional_notes}
                onChange={(e) => handleChange("additional_notes", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Any other details you'd like to share..."
                data-testid="quote-notes"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-2xl bg-slate-50 border px-5 py-4 mt-8 text-sm text-slate-600">
            <strong>What happens next?</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Our team reviews your request within 24 hours</li>
              <li>We'll reach out to clarify any details if needed</li>
              <li>You'll receive a customized quote via email</li>
              <li>No obligation — compare and decide at your pace</li>
            </ul>
          </div>

          {/* Submit */}
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
                  Submit Quote Request
                </>
              )}
            </button>
            
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => navigate("/dashboard/business-pricing")}
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
