import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Palette, ArrowLeft, Check, Upload, Info } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import { combinePhone } from "@/utils/phoneUtils";

export default function CreativeServiceBriefPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    phone_prefix: "+255",
    customer_phone: "",
    company_name: "",
    notes: "",
  });
  
  const [briefAnswers, setBriefAnswers] = useState({});
  const [selectedAddons, setSelectedAddons] = useState([]);

  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/creative-services-v2/${slug}`);
        setService(res.data);
        
        // Initialize brief answers
        const initialAnswers = {};
        (res.data.brief_fields || []).forEach(field => {
          if (field.field_type === "boolean") {
            initialAnswers[field.key] = false;
          } else if (field.field_type === "multi_select") {
            initialAnswers[field.key] = [];
          } else {
            initialAnswers[field.key] = "";
          }
        });
        setBriefAnswers(initialAnswers);
      } catch (error) {
        console.error("Failed to load service", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) loadService();
  }, [slug]);

  const toggleAddon = (code) => {
    setSelectedAddons(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const calculateTotal = () => {
    if (!service) return 0;
    let total = service.base_price || 0;
    
    (service.addons || []).forEach(addon => {
      if (selectedAddons.includes(addon.code) && addon.is_active) {
        total += addon.price || 0;
      }
    });
    
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.customer_name || !form.customer_email) {
      alert("Please fill in your name and email");
      return;
    }
    
    try {
      setSubmitting(true);
      
      await api.post("/api/creative-services-v2/orders", {
        service_slug: slug,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: combinePhone(form.phone_prefix, form.customer_phone) || null,
        company_name: form.company_name || null,
        brief_answers: briefAnswers,
        selected_addons: selectedAddons,
        uploaded_files: [],
        notes: form.notes || null,
      });
      
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit brief", error);
      alert(error.response?.data?.detail || "Failed to submit brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = briefAnswers[field.key];
    const updateAnswer = (val) => setBriefAnswers(prev => ({ ...prev, [field.key]: val }));
    
    switch (field.field_type) {
      case "text":
        return (
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder={field.placeholder || field.label}
            value={value || ""}
            onChange={(e) => updateAnswer(e.target.value)}
            required={field.required}
          />
        );
      
      case "textarea":
        return (
          <textarea
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder={field.placeholder || field.label}
            rows={3}
            value={value || ""}
            onChange={(e) => updateAnswer(e.target.value)}
            required={field.required}
          />
        );
      
      case "select":
        return (
          <select
            className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            value={value || ""}
            onChange={(e) => updateAnswer(e.target.value)}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case "multi_select":
        return (
          <div className="space-y-2">
            {(field.options || []).map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(value || []).includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateAnswer([...(value || []), opt]);
                    } else {
                      updateAnswer((value || []).filter(v => v !== opt));
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      
      case "boolean":
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateAnswer(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
            />
            <span>Yes</span>
          </label>
        );
      
      case "number":
        return (
          <input
            type="number"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder={field.placeholder || field.label}
            value={value || ""}
            onChange={(e) => updateAnswer(e.target.value)}
            required={field.required}
          />
        );
      
      case "file":
        return (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">File upload coming soon</p>
            <p className="text-xs text-slate-400 mt-1">You can email files after submission</p>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
            placeholder={field.placeholder || field.label}
            value={value || ""}
            onChange={(e) => updateAnswer(e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading service...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Service not found</h2>
          <Link to="/creative-services" className="text-[#D4A843]">
            ← Back to services
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Brief Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for submitting your {service.title} brief. Our team will review it and get back to you within 24-48 hours.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            A confirmation has been sent to {form.customer_email}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/creative-services"
              className="inline-flex items-center justify-center gap-2 bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166]"
            >
              Browse More Services
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-50"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6" data-testid="creative-brief-page">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          to="/creative-services"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Creative Services
        </Link>

        {/* Header */}
        <div className="rounded-2xl border bg-white p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#D4A843]/10 flex items-center justify-center">
              <Palette className="w-7 h-7 text-[#D4A843]" />
            </div>
            <div className="flex-1">
              <span className="text-sm text-[#D4A843] font-medium">{service.category}</span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{service.title}</h1>
              {service.description && (
                <p className="text-slate-600 mt-2">{service.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Starting from</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatMoney(service.base_price, service.currency)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <div className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold mb-4">Your Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                    placeholder="Your Name *"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                    placeholder="Email Address *"
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                    required
                  />
                  <PhoneNumberField
                    label=""
                    prefix={form.phone_prefix}
                    number={form.customer_phone}
                    onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
                    onNumberChange={(v) => setForm({ ...form, customer_phone: v })}
                    testIdPrefix="brief-phone"
                  />
                  <input
                    type="text"
                    className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                    placeholder="Company Name"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Brief Fields */}
              {(service.brief_fields || []).length > 0 && (
                <div className="rounded-2xl border bg-white p-6">
                  <h2 className="text-lg font-bold mb-4">Project Brief</h2>
                  <div className="space-y-5">
                    {service.brief_fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.help_text && (
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {field.help_text}
                          </p>
                        )}
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold mb-4">Additional Notes</h2>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Any other details or special requirements..."
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Sidebar - Addons & Summary */}
            <div className="space-y-6">
              {/* Add-ons */}
              {(service.addons || []).filter(a => a.is_active).length > 0 && (
                <div className="rounded-2xl border bg-white p-6">
                  <h2 className="text-lg font-bold mb-4">Optional Add-ons</h2>
                  <div className="space-y-3">
                    {service.addons.filter(a => a.is_active).map((addon) => (
                      <label
                        key={addon.code}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedAddons.includes(addon.code)
                            ? "border-[#D4A843] bg-[#D4A843]/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(addon.code)}
                          onChange={() => toggleAddon(addon.code)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{addon.label}</div>
                          {addon.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{addon.description}</div>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-[#D4A843]">
                          +{formatMoney(addon.price, service.currency)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Summary */}
              <div className="rounded-2xl border bg-white p-6 sticky top-6">
                <h2 className="text-lg font-bold mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{service.title}</span>
                    <span>{formatMoney(service.base_price, service.currency)}</span>
                  </div>
                  
                  {selectedAddons.length > 0 && (
                    <>
                      <div className="border-t pt-3">
                        {service.addons
                          .filter(a => selectedAddons.includes(a.code))
                          .map(addon => (
                            <div key={addon.code} className="flex justify-between text-slate-600 py-1">
                              <span>+ {addon.label}</span>
                              <span>{formatMoney(addon.price, service.currency)}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Estimated Total</span>
                    <span className="text-[#D4A843]">{formatMoney(calculateTotal(), service.currency)}</span>
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    Final pricing may vary based on project complexity. You'll receive a detailed quote after brief review.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-6 bg-[#D4A843] text-[#2D3E50] px-6 py-4 rounded-xl font-semibold hover:bg-[#c49933] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Brief"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
