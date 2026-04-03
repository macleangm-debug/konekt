import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ChevronRight, ChevronLeft, Check, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import CountrySelectorField, { COUNTRIES } from "../../components/vendors/CountrySelectorField";
import CountryAwarePhoneField from "../../components/vendors/CountryAwarePhoneField";
import VendorRoleSelector from "../../components/vendors/VendorRoleSelector";
import VendorCapabilityPicker from "../../components/vendors/VendorCapabilityPicker";
import api from "../../lib/api";

const STEPS = [
  { key: "market", label: "Market" },
  { key: "details", label: "Details" },
  { key: "role", label: "Role" },
  { key: "capabilities", label: "Capabilities" },
  { key: "review", label: "Review & Invite" },
];

export default function VendorOnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    country_code: "TZ",
    full_name: "",
    business_name: "",
    email: "",
    phone_prefix: "+255",
    phone_number: "",
    region: "",
    city: "",
    address: "",
    tin: "",
    vrn: "",
    registration_number: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    capability_type: "products",
    taxonomy_ids: [],
    notes: "",
  });

  const set = useCallback((key, val) => setForm((prev) => ({ ...prev, [key]: val })), []);

  const handleCountryChange = (code) => {
    const c = COUNTRIES.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      country_code: code,
      phone_prefix: c?.prefix || prev.phone_prefix,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/api/admin/vendor-onboarding", form);
      setResult(res.data);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to onboard vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return form.full_name && form.email;
    return true;
  };

  // Success screen
  if (result) {
    const inv = result.invite || {};
    const perms = result.permissions || {};
    const activationUrl = `${window.location.origin}${inv.activation_url || ""}`;

    return (
      <div className="space-y-5" data-testid="onboarding-success">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">Vendor Onboarded</h1>
        </div>

        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-medium">{result.vendor?.full_name}</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-medium">{result.vendor?.email}</span></div>
            <div><span className="text-slate-500">Role:</span> <span className="font-medium">{perms.marketplace_label}</span></div>
            <div><span className="text-slate-500">Status:</span> <span className="font-medium text-amber-600">{result.vendor?.vendor_status}</span></div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3" data-testid="invite-info">
            <div className="text-sm font-medium text-amber-800 mb-1">Invite Link (MOCKED — email not sent)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 text-slate-700 break-all">{activationUrl}</code>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(activationUrl)} data-testid="copy-invite-link">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-amber-600">Share this link with the vendor to create their password and activate their account.</p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-slate-500 mb-1">Marketplace Permissions</div>
            <div className="flex items-center gap-2 text-sm">
              {perms.can_access_marketplace_upload ? (
                <span className="text-emerald-700 font-medium">Can publish marketplace items</span>
              ) : (
                <span className="text-slate-500">Task-only vendor (no marketplace upload)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setResult(null); setStep(0); setForm({ ...form, full_name: "", business_name: "", email: "", phone_number: "", tin: "", vrn: "", notes: "" }); }} data-testid="onboard-another-btn">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Onboard Another
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/vendors")} data-testid="go-to-vendors-btn">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="vendor-onboarding-page">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">Vendor Onboarding</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1" data-testid="step-indicator">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                i === step ? "bg-blue-600 text-white" : i < step ? "bg-blue-100 text-blue-700 cursor-pointer" : "bg-slate-100 text-slate-400"
              }`}
              disabled={i > step}
              data-testid={`step-${s.key}`}
            >
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="onboarding-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-5">
        {/* Step 0: Market */}
        {step === 0 && (
          <div className="space-y-4" data-testid="step-market-form">
            <CountrySelectorField value={form.country_code} onChange={handleCountryChange} />
            <p className="text-xs text-slate-400">The phone prefix, currency, and tax labels will adapt to the selected market.</p>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-details-form">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-full-name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
                <input type="text" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-business-name" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-email" />
            </div>
            <CountryAwarePhoneField prefix={form.phone_prefix} onPrefixChange={(v) => set("phone_prefix", v)} phone={form.phone_number} onPhoneChange={(v) => set("phone_number", v)} countryCode={form.country_code} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Region</label>
                <input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-region" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-city" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">TIN</label>
                <input type="text" value={form.tin} onChange={(e) => set("tin", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-tin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">VRN / VAT</label>
                <input type="text" value={form.vrn} onChange={(e) => set("vrn", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-vrn" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="input-notes" />
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-role-form">
            <VendorRoleSelector value={form.capability_type} onChange={(v) => set("capability_type", v)} />
          </div>
        )}

        {/* Step 3: Capabilities */}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-capabilities-form">
            <VendorCapabilityPicker selected={form.taxonomy_ids} onChange={(v) => set("taxonomy_ids", v)} />
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4" data-testid="step-review-form">
            <h3 className="text-sm font-semibold text-slate-700">Review Vendor Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Name:</span> <span className="text-slate-700">{form.full_name}</span></div>
              <div><span className="text-slate-400">Business:</span> <span className="text-slate-700">{form.business_name || "-"}</span></div>
              <div><span className="text-slate-400">Email:</span> <span className="text-slate-700">{form.email}</span></div>
              <div><span className="text-slate-400">Phone:</span> <span className="text-slate-700">{form.phone_prefix} {form.phone_number}</span></div>
              <div><span className="text-slate-400">Country:</span> <span className="text-slate-700">{COUNTRIES.find(c => c.code === form.country_code)?.name || form.country_code}</span></div>
              <div><span className="text-slate-400">Region:</span> <span className="text-slate-700">{form.region || "-"}</span></div>
              <div><span className="text-slate-400">Type:</span> <span className="text-slate-700 capitalize">{form.capability_type.replace(/_/g, " ")}</span></div>
              <div><span className="text-slate-400">Categories:</span> <span className="text-slate-700">{form.taxonomy_ids.length} selected</span></div>
              <div><span className="text-slate-400">TIN:</span> <span className="text-slate-700">{form.tin || "-"}</span></div>
              <div><span className="text-slate-400">VRN:</span> <span className="text-slate-700">{form.vrn || "-"}</span></div>
            </div>
            {form.notes && <div className="text-sm"><span className="text-slate-400">Notes:</span> <span className="text-slate-600">{form.notes}</span></div>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="prev-step-btn">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()} data-testid="next-step-btn">
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} data-testid="submit-onboarding-btn">
            {submitting ? "Onboarding..." : "Onboard & Generate Invite"}
          </Button>
        )}
      </div>
    </div>
  );
}
