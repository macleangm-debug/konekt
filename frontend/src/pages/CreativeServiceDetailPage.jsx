import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";
import DynamicBriefForm from "@/components/creative/DynamicBriefForm";
import { toast } from "sonner";
import { COUNTRIES } from "@/constants/countries";

export default function CreativeServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customer, setCustomer] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    phone_prefix: "+255",
    country: "TZ",
    city: "",
    address_line_1: "",
    address_line_2: "",
    company_name: "",
    notes: "",
    save_address: true,
    payment_choice: "quote_first",
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === customer.country),
    [customer.country]
  );

  useEffect(() => {
    if (selectedCountry) {
      setCustomer((prev) => ({
        ...prev,
        phone_prefix: selectedCountry.dialCode,
      }));
    }
  }, [selectedCountry]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/creative-services-v2/${slug}`);
        setService(res.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load service details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const addonTotal = useMemo(() => {
    if (!service) return 0;
    return (service.addons || [])
      .filter((a) => selectedAddons.includes(a.code))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [service, selectedAddons]);

  const total = Number(service?.base_price || 0) + addonTotal;

  const validateForm = () => {
    // Check required customer fields
    if (!customer.customer_name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!customer.customer_email.trim()) {
      toast.error("Please enter your email");
      return false;
    }

    // Check required brief fields
    const requiredFields = (service?.brief_fields || []).filter(f => f.required);
    for (const field of requiredFields) {
      const value = formData[field.key];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        toast.error(`Please fill in: ${field.label}`);
        return false;
      }
    }

    return true;
  };

  const submitBrief = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = {
        service_slug: slug,
        service_id: service?.id,
        customer_name: customer.customer_name,
        customer_email: customer.customer_email,
        customer_phone: customer.customer_phone,
        phone_prefix: customer.phone_prefix,
        country: customer.country,
        city: customer.city,
        address_line_1: customer.address_line_1,
        address_line_2: customer.address_line_2,
        company_name: customer.company_name,
        brief_answers: formData,
        selected_addons: selectedAddons,
        uploaded_files: uploadedFiles,
        notes: customer.notes,
        payment_choice: customer.payment_choice,
        save_address: customer.save_address,
        base_price: service?.base_price || 0,
        addon_total: addonTotal,
        total_price: total,
        currency: service?.currency || "TZS",
      };

      const res = await api.post("/api/creative-services-v2/orders", payload);
      toast.success("Brief submitted successfully!");
      
      // If pay now, go to checkout, otherwise go to designs dashboard
      if (customer.payment_choice === "pay_now") {
        navigate("/creative-services/checkout", {
          state: { projectDraft: res.data },
        });
      } else {
        navigate("/dashboard/designs");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to submit creative brief");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      // In production, you'd upload to cloud storage here
      url: URL.createObjectURL(file),
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <p className="text-slate-600">Service not found</p>
        <button
          onClick={() => navigate("/creative-services")}
          className="mt-4 text-[#D4A843] font-medium hover:underline"
        >
          Browse all services
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="creative-service-detail-page">
      {/* Header */}
      <div className="bg-[#2D3E50] text-white py-6">
        <div className="max-w-7xl mx-auto px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">{service.title}</h1>
          <p className="mt-2 text-white/80 max-w-2xl">{service.description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid xl:grid-cols-[1fr_360px] gap-8">
        {/* Main Form */}
        <form onSubmit={submitBrief} className="space-y-6">
          {/* Contact Information */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Your Details</h2>
            <p className="text-slate-500 mt-1">How can we reach you and where should we deliver?</p>
            
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Full name *"
                value={customer.customer_name}
                onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                data-testid="input-customer-name"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Company name"
                value={customer.company_name}
                onChange={(e) => setCustomer({ ...customer, company_name: e.target.value })}
                data-testid="input-company-name"
              />
              <input
                type="email"
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Email address *"
                value={customer.customer_email}
                onChange={(e) => setCustomer({ ...customer, customer_email: e.target.value })}
                data-testid="input-customer-email"
              />
              <select
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                value={customer.country}
                onChange={(e) => setCustomer({ ...customer, country: e.target.value })}
                data-testid="input-country"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="City"
                value={customer.city}
                onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                data-testid="input-city"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Address line 1"
                value={customer.address_line_1}
                onChange={(e) => setCustomer({ ...customer, address_line_1: e.target.value })}
                data-testid="input-address-1"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none md:col-span-2"
                placeholder="Address line 2"
                value={customer.address_line_2}
                onChange={(e) => setCustomer({ ...customer, address_line_2: e.target.value })}
                data-testid="input-address-2"
              />
            </div>

            {/* Phone with prefix */}
            <div className="grid grid-cols-[100px_1fr] gap-4 mt-4">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 text-slate-600"
                value={customer.phone_prefix}
                readOnly
                data-testid="input-phone-prefix"
              />
              <input
                type="tel"
                className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Phone number"
                value={customer.customer_phone}
                onChange={(e) => setCustomer({ ...customer, customer_phone: e.target.value })}
                data-testid="input-customer-phone"
              />
            </div>

            {/* Save address checkbox */}
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={customer.save_address}
                onChange={(e) => setCustomer({ ...customer, save_address: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
                data-testid="save-address-checkbox"
              />
              <span className="text-sm text-slate-600">Save these details for future orders</span>
            </label>
          </div>

          {/* Dynamic Brief Form */}
          <DynamicBriefForm
            service={service}
            formData={formData}
            setFormData={setFormData}
            selectedAddons={selectedAddons}
            setSelectedAddons={setSelectedAddons}
          />

          {/* File Uploads */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Reference Files</h2>
            <p className="text-slate-500 mt-1">Upload logos, brand guides, or inspiration images</p>
            
            <div className="mt-6">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 cursor-pointer hover:border-[#D4A843] transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <span className="font-medium text-slate-700">Click to upload files</span>
                <span className="text-sm text-slate-500 mt-1">PNG, JPG, PDF up to 10MB each</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".png,.jpg,.jpeg,.pdf,.ai,.psd"
                  data-testid="file-upload-input"
                />
              </label>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Additional Notes</h2>
            <p className="text-slate-500 mt-1">Anything else we should know?</p>
            
            <textarea
              className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[140px] mt-6 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              placeholder="Share any additional context about your brand, campaign, or specific requirements..."
              value={customer.notes}
              onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              data-testid="input-notes"
            />
          </div>

          {/* Submit Button (Mobile) */}
          <button
            type="submit"
            disabled={submitting}
            className="xl:hidden w-full rounded-xl bg-[#D4A843] text-[#2D3E50] py-4 font-bold text-lg hover:bg-[#c49933] transition-colors disabled:opacity-50"
            data-testid="submit-brief-mobile"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Brief"
            )}
          </button>
        </form>

        {/* Pricing Sidebar */}
        <aside className="hidden xl:block">
          <div className="rounded-3xl border bg-white p-6 sticky top-24" data-testid="pricing-sidebar">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Pricing Summary</h2>
            
            <div className="space-y-3 mt-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Price</span>
                <span className="font-medium">{service.currency} {Number(service.base_price || 0).toLocaleString()}</span>
              </div>
              
              {selectedAddons.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Selected Add-Ons</div>
                  {(service.addons || [])
                    .filter(a => selectedAddons.includes(a.code))
                    .map(addon => (
                      <div key={addon.code} className="flex justify-between text-sm py-1">
                        <span className="text-slate-600">{addon.label}</span>
                        <span>{service.currency} {Number(addon.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-slate-500">Add-Ons Total</span>
                <span className="font-medium">{service.currency} {Number(addonTotal || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-4 border-t">
                <span>Total</span>
                <span className="text-[#D4A843]">{service.currency} {Number(total || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Completion Option */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-[#2D3E50] mb-3">Completion Option</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 border rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="radio"
                    checked={customer.payment_choice === "pay_now"}
                    onChange={() => setCustomer({ ...customer, payment_choice: "pay_now" })}
                    className="mt-0.5"
                    data-testid="payment-pay-now"
                  />
                  <div>
                    <div className="font-medium text-sm">Pay now</div>
                    <div className="text-xs text-slate-500 mt-0.5">Complete payment immediately</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 border rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="radio"
                    checked={customer.payment_choice === "quote_first"}
                    onChange={() => setCustomer({ ...customer, payment_choice: "quote_first" })}
                    className="mt-0.5"
                    data-testid="payment-quote-first"
                  />
                  <div>
                    <div className="font-medium text-sm">Request quote first</div>
                    <div className="text-xs text-slate-500 mt-0.5">Submit brief for review before payment</div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={submitBrief}
              disabled={submitting}
              className="w-full mt-6 rounded-xl bg-[#D4A843] text-[#2D3E50] py-4 font-bold text-lg hover:bg-[#c49933] transition-colors disabled:opacity-50"
              data-testid="submit-brief-desktop"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                customer.payment_choice === "pay_now" ? "Continue to Payment" : "Submit Request"
              )}
            </button>

            {/* Info Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mt-6">
              <div className="font-semibold text-[#2D3E50]">Need content written too?</div>
              <div className="text-sm text-slate-500 mt-2">
                Choose copywriting add-ons for flyers, brochures, posters, and company profiles.
              </div>
            </div>

            {/* Turnaround Info */}
            {service.turnaround_days && (
              <div className="rounded-2xl bg-[#D4A843]/10 border border-[#D4A843]/20 p-4 mt-4">
                <div className="font-semibold text-[#9a6d00]">Estimated Turnaround</div>
                <div className="text-sm text-[#9a6d00] mt-1">
                  {service.turnaround_days} business days
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
