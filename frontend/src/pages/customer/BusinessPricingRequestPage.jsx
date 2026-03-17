import React, { useState } from "react";
import { Building2, CheckCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function BusinessPricingRequestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    industry: "",
    estimated_monthly_volume: "",
    product_categories: [],
    service_categories: [],
    additional_notes: "",
  });

  const productCategories = [
    { value: "promotional_products", label: "Promotional Products" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "printed_materials", label: "Printed Materials" },
    { value: "branded_merchandise", label: "Branded Merchandise" },
    { value: "corporate_gifts", label: "Corporate Gifts" },
  ];

  const serviceCategories = [
    { value: "printing_branding", label: "Printing & Branding" },
    { value: "creative_services", label: "Creative & Design" },
    { value: "facilities_services", label: "Facilities Services" },
    { value: "uniforms", label: "Uniforms & Workwear" },
  ];

  const volumeOptions = [
    { value: "under_500k", label: "Under TZS 500,000" },
    { value: "500k_2m", label: "TZS 500,000 - 2,000,000" },
    { value: "2m_5m", label: "TZS 2,000,000 - 5,000,000" },
    { value: "5m_10m", label: "TZS 5,000,000 - 10,000,000" },
    { value: "above_10m", label: "Above TZS 10,000,000" },
  ];

  const handleCheckbox = (category, value) => {
    setFormData((prev) => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/customer/business-pricing-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to submit request");
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div data-testid="business-pricing-success">
        <PageHeader title="Request Submitted" />
        <SurfaceCard className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D] mb-4">
            Thank you for your interest!
          </h2>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Our commercial team will review your request and reach out within 1-2 business days
            with personalized pricing options.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/marketplace"
              className="px-6 py-3 rounded-xl border border-slate-300 font-semibold hover:bg-slate-50 transition"
            >
              Browse Products
            </Link>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div data-testid="business-pricing-request-page">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title="Request Business Pricing"
          subtitle="Tell us about your company to receive customized pricing."
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <SurfaceCard>
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Company Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none transition"
                    placeholder="Enter your company name"
                    data-testid="company-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none transition"
                    placeholder="e.g., Banking, Hospitality, Manufacturing"
                    data-testid="industry-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estimated Monthly Volume
                  </label>
                  <select
                    value={formData.estimated_monthly_volume}
                    onChange={(e) => setFormData({ ...formData, estimated_monthly_volume: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none transition"
                    data-testid="volume-select"
                  >
                    <option value="">Select estimated volume</option>
                    {volumeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Products of Interest</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {productCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={formData.product_categories.includes(cat.value)}
                      onChange={() => handleCheckbox("product_categories", cat.value)}
                      className="w-4 h-4 rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]"
                    />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </label>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Services of Interest</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {serviceCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={formData.service_categories.includes(cat.value)}
                      onChange={() => handleCheckbox("service_categories", cat.value)}
                      className="w-4 h-4 rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]"
                    />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </label>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Additional Notes</h2>
              <textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none transition resize-none"
                placeholder="Tell us about your specific requirements, timeline, or any questions you have..."
                data-testid="notes-textarea"
              />
            </SurfaceCard>

            <button
              type="submit"
              disabled={loading || !formData.company_name}
              className="w-full py-4 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-request-btn"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SurfaceCard className="bg-gradient-to-br from-[#20364D] to-[#2a4a66] text-white">
              <h3 className="text-lg font-bold mb-3">What you'll get</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">Custom pricing based on your volume</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">Extended payment terms</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">Priority fulfillment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">SLA-backed service commitments</span>
                </li>
              </ul>
            </SurfaceCard>

            <SurfaceCard>
              <h3 className="text-lg font-bold text-[#20364D] mb-3">Need help?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Our commercial team is ready to discuss your specific needs.
              </p>
              <a
                href="https://wa.me/255123456789"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl border border-slate-300 font-semibold hover:bg-slate-50 transition"
              >
                Chat on WhatsApp
              </a>
            </SurfaceCard>
          </div>
        </div>
      </form>
    </div>
  );
}
