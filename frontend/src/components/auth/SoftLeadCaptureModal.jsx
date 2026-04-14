import React, { useState } from "react";
import { X, User, Mail, Building, MapPin } from "lucide-react";
import api from "../../lib/api";
import PhoneNumberField from "../forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

/**
 * SoftLeadCaptureModal - Capture lead info from guests
 * Used when guest wants to request service/quote without creating account
 */
export default function SoftLeadCaptureModal({ 
  open, 
  intentType = "quote_request", 
  intentPayload = {}, 
  onClose, 
  onSubmitted 
}) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_prefix: "+255",
    phone: "",
    email: "",
    company_name: "",
    country: "Tanzania",
    region: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  const validate = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return "Please enter your first and last name";
    if (!form.phone.trim() && !form.email.trim()) return "Please enter phone or email";
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { phone_prefix, first_name, last_name, ...rest } = form;
      const payload = {
        ...rest,
        full_name: [first_name, last_name].filter(Boolean).join(" "),
        first_name,
        last_name,
        phone: combinePhone(phone_prefix, form.phone),
        source: "website",
        guest_session_id: localStorage.getItem("guest_session_id") || "",
        intent_type: intentType,
        intent_payload: intentPayload,
      };
      const res = await api.post("/api/guest-leads", payload);
      onSubmitted?.(res.data);
      onClose?.();
    } catch (err) {
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4"
      data-testid="soft-lead-capture-modal"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-[2rem] bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#20364D]">Continue with your details</div>
            <p className="text-slate-600 mt-1">
              Share your contact info and we'll follow up with you
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 transition"
            data-testid="soft-lead-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" className="w-full border rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D] text-sm" placeholder="First name *"
                    value={form.first_name} onChange={(e) => handleChange("first_name", e.target.value)} required data-testid="lead-first-name" />
                </div>
                <input type="text" className="w-full border rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D] text-sm" placeholder="Last name *"
                  value={form.last_name} onChange={(e) => handleChange("last_name", e.target.value)} required data-testid="lead-last-name" />
              </div>
            </div>
            <PhoneNumberField
              label=""
              prefix={form.phone_prefix}
              number={form.phone}
              onPrefixChange={(v) => handleChange("phone_prefix", v)}
              onNumberChange={(v) => handleChange("phone", v)}
              testIdPrefix="soft-lead-phone"
            />
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]" 
                placeholder="Email" 
                type="email"
                value={form.email} 
                onChange={(e) => handleChange("email", e.target.value)}
                data-testid="soft-lead-email"
              />
            </div>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]" 
                placeholder="Company Name (optional)" 
                value={form.company_name} 
                onChange={(e) => handleChange("company_name", e.target.value)}
                data-testid="soft-lead-company"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]" 
                placeholder="Country" 
                value={form.country} 
                onChange={(e) => handleChange("country", e.target.value)}
                data-testid="soft-lead-country"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]" 
                placeholder="City/Region" 
                value={form.region} 
                onChange={(e) => handleChange("region", e.target.value)}
                data-testid="soft-lead-region"
              />
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            * Required fields. You can also <button onClick={onClose} className="text-[#20364D] font-semibold hover:underline">create an account</button> for a better experience.
          </p>
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button 
            onClick={onClose} 
            className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-100 transition"
            data-testid="soft-lead-cancel"
          >
            Cancel
          </button>
          <button 
            onClick={submit} 
            disabled={loading}
            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283C] transition disabled:opacity-50"
            data-testid="soft-lead-submit"
          >
            {loading ? "Submitting..." : "Submit Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
