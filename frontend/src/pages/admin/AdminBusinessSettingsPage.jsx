import React, { useEffect, useState, useCallback } from "react";
import { Building2, Phone, Landmark, FileText, Save, CheckCircle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";

const SECTIONS = [
  { key: "identity", label: "Business Identity", icon: Building2 },
  { key: "contact", label: "Contact Details", icon: Phone },
  { key: "banking", label: "Banking Details", icon: Landmark },
  { key: "documents", label: "Document & Tax", icon: FileText },
];

function Field({ label, value, onChange, placeholder, type = "text", half = false, testId }) {
  return (
    <div className={half ? "" : ""}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none transition-colors"
          data-testid={testId}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
          data-testid={testId}
        />
      )}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20364D]/5">
          <Icon className="h-5 w-5 text-[#20364D]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#20364D]">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function AdminBusinessSettingsPage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinessSettings();
      setForm(res.data || {});
    } catch { setForm({}); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateBusinessSettings(form);
      toast.success("Business settings saved");
      setSaved(true);
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="business-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Business Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Canonical source for invoices, quotes, statements, and public-facing business details.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40 transition-colors"
          data-testid="save-settings-btn"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Identity */}
        <SectionCard icon={Building2} title="Business Identity" description="Legal entity and registration details">
          <Field label="Company Name" value={form.company_name} onChange={(v) => setField("company_name", v)} testId="field-company-name" />
          <Field label="Trading Name" value={form.trading_name} onChange={(v) => setField("trading_name", v)} testId="field-trading-name" />
          <Field label="TIN (Tax ID)" value={form.tin} onChange={(v) => setField("tin", v)} testId="field-tin" />
          <Field label="BRN (Business Reg. No.)" value={form.brn} onChange={(v) => setField("brn", v)} testId="field-brn" />
          <Field label="VRN (VAT Reg. No.)" value={form.vrn} onChange={(v) => setField("vrn", v)} placeholder="Optional" testId="field-vrn" />
          <Field label="Logo URL" value={form.company_logo_path} onChange={(v) => setField("company_logo_path", v)} placeholder="https://..." testId="field-logo-url" />
        </SectionCard>

        {/* Contact Details */}
        <SectionCard icon={Phone} title="Contact Details" description="Public contact information">
          <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" testId="field-email" />
          <Field label="Phone" value={form.phone} onChange={(v) => setField("phone", v)} testId="field-phone" />
          <Field label="Website" value={form.website} onChange={(v) => setField("website", v)} testId="field-website" />
          <Field label="City" value={form.city} onChange={(v) => setField("city", v)} testId="field-city" />
          <div className="sm:col-span-2">
            <Field label="Address" value={form.address || form.address_line_1} onChange={(v) => setField("address", v)} type="textarea" testId="field-address" />
          </div>
        </SectionCard>

        {/* Banking Details */}
        <SectionCard icon={Landmark} title="Banking Details" description="Displayed on invoices and statements">
          <Field label="Bank Name" value={form.bank_name} onChange={(v) => setField("bank_name", v)} testId="field-bank-name" />
          <Field label="Account Name" value={form.bank_account_name} onChange={(v) => setField("bank_account_name", v)} testId="field-bank-account-name" />
          <Field label="Account Number" value={form.bank_account_number} onChange={(v) => setField("bank_account_number", v)} testId="field-bank-account-number" />
          <Field label="Branch" value={form.bank_branch} onChange={(v) => setField("bank_branch", v)} testId="field-bank-branch" />
          <Field label="SWIFT Code" value={form.bank_swift_code} onChange={(v) => setField("bank_swift_code", v)} placeholder="Optional" testId="field-swift-code" />
        </SectionCard>

        {/* Document & Tax */}
        <SectionCard icon={FileText} title="Document & Tax Settings" description="Applied to quotes, invoices, and statements">
          <Field label="Currency" value={form.currency} onChange={(v) => setField("currency", v)} testId="field-currency" />
          <Field label="Default Tax Rate (%)" value={form.default_tax_rate} onChange={(v) => setField("default_tax_rate", v)} type="number" testId="field-tax-rate" />
          <Field label="Default Payment Terms" value={form.default_payment_terms} onChange={(v) => setField("default_payment_terms", v)} testId="field-payment-terms" />
          <div className="sm:col-span-2">
            <Field label="Payment Instructions" value={form.payment_instructions} onChange={(v) => setField("payment_instructions", v)} type="textarea" testId="field-payment-instructions" />
          </div>
          <div className="sm:col-span-2">
            <Field label="Default Document Note" value={form.default_document_note} onChange={(v) => setField("default_document_note", v)} type="textarea" testId="field-document-note" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
