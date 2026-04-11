import React, { useEffect, useState, useCallback, useRef } from "react";
import { Building2, Phone, Landmark, FileText, Save, CheckCircle, Upload, X, Image as ImageIcon, Stamp } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";
import api from "@/lib/api";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function authH() {
  const t = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

function Field({ label, value, onChange, placeholder, type = "text", testId }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#20364D] resize-none transition-colors"
          data-testid={testId}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#20364D] transition-colors"
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

function ImageUploadField({ label, currentUrl, onUploaded, folder, testId }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");
  const fileRef = useRef(null);

  useEffect(() => {
    setPreview(currentUrl || "");
  }, [currentUrl]);

  const resolveUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_URL}/api/files/serve/${path}`;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/api/files/upload?folder=${folder}`, formData, {
        headers: { ...authH(), "Content-Type": "multipart/form-data" },
      });
      const storagePath = res.data?.storage_path || "";
      setPreview(resolveUrl(storagePath));
      onUploaded(storagePath);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClear = () => {
    setPreview("");
    onUploaded("");
  };

  const displayUrl = resolveUrl(preview);

  return (
    <div className="sm:col-span-2" data-testid={testId}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">{label}</label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative">
          {displayUrl ? (
            <>
              <img src={displayUrl} alt={label} className="w-full h-full object-contain p-1" />
              <button
                onClick={handleClear}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm transition-colors"
                data-testid={`${testId}-clear`}
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-300" />
          )}
        </div>

        {/* Upload */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            data-testid={`${testId}-input`}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            data-testid={`${testId}-upload-btn`}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-[#20364D] rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading..." : preview ? "Replace" : "Upload"}
          </button>
          <p className="text-[10px] text-slate-400">PNG, JPG, or SVG. Max 5MB.</p>
        </div>
      </div>
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
    } catch {
      setForm({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <h1 className="text-xl font-bold text-[#20364D]">Business Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Canonical source for invoices, quotes, statements, and public-facing
            business details.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40 transition-colors"
          data-testid="save-settings-btn"
        >
          {saved ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Identity */}
        <SectionCard
          icon={Building2}
          title="Business Identity"
          description="Legal entity and registration details"
        >
          <Field
            label="Company Name"
            value={form.company_name}
            onChange={(v) => setField("company_name", v)}
            testId="field-company-name"
          />
          <Field
            label="Trading Name"
            value={form.trading_name}
            onChange={(v) => setField("trading_name", v)}
            testId="field-trading-name"
          />
          <Field
            label="TIN (Tax ID)"
            value={form.tin}
            onChange={(v) => setField("tin", v)}
            testId="field-tin"
          />
          <Field
            label="BRN (Business Reg. No.)"
            value={form.brn}
            onChange={(v) => setField("brn", v)}
            testId="field-brn"
          />
          <Field
            label="VRN (VAT Reg. No.)"
            value={form.vrn}
            onChange={(v) => setField("vrn", v)}
            placeholder="Optional"
            testId="field-vrn"
          />

          {/* Logo Upload */}
          <ImageUploadField
            label="Company Logo"
            currentUrl={form.company_logo_path}
            onUploaded={(path) => setField("company_logo_path", path)}
            folder="branding"
            testId="logo-upload"
          />

          {/* Stamp Upload */}
          <ImageUploadField
            label="Company Stamp / Seal"
            currentUrl={form.stamp_path}
            onUploaded={(path) => setField("stamp_path", path)}
            folder="branding"
            testId="stamp-upload"
          />
        </SectionCard>

        {/* Contact Details */}
        <SectionCard
          icon={Phone}
          title="Contact Details"
          description="Public contact information"
        >
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setField("email", v)}
            type="email"
            testId="field-email"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => setField("phone", v)}
            testId="field-phone"
          />
          <Field
            label="Website"
            value={form.website}
            onChange={(v) => setField("website", v)}
            testId="field-website"
          />
          <Field
            label="City"
            value={form.city}
            onChange={(v) => setField("city", v)}
            testId="field-city"
          />
          <div className="sm:col-span-2">
            <Field
              label="Address"
              value={form.address || form.address_line_1}
              onChange={(v) => setField("address", v)}
              type="textarea"
              testId="field-address"
            />
          </div>
        </SectionCard>

        {/* Banking Details */}
        <SectionCard
          icon={Landmark}
          title="Banking Details"
          description="Displayed on invoices and statements"
        >
          <Field
            label="Bank Name"
            value={form.bank_name}
            onChange={(v) => setField("bank_name", v)}
            testId="field-bank-name"
          />
          <Field
            label="Account Name"
            value={form.bank_account_name}
            onChange={(v) => setField("bank_account_name", v)}
            testId="field-bank-account-name"
          />
          <Field
            label="Account Number"
            value={form.bank_account_number}
            onChange={(v) => setField("bank_account_number", v)}
            testId="field-bank-account-number"
          />
          <Field
            label="Branch"
            value={form.bank_branch}
            onChange={(v) => setField("bank_branch", v)}
            testId="field-bank-branch"
          />
          <Field
            label="SWIFT Code"
            value={form.bank_swift_code}
            onChange={(v) => setField("bank_swift_code", v)}
            placeholder="Optional"
            testId="field-swift-code"
          />
        </SectionCard>

        {/* Document & Tax */}
        <SectionCard
          icon={FileText}
          title="Document & Tax Settings"
          description="Applied to quotes, invoices, and statements"
        >
          <Field
            label="Currency"
            value={form.currency}
            onChange={(v) => setField("currency", v)}
            testId="field-currency"
          />
          <Field
            label="Default Tax Rate (%)"
            value={form.default_tax_rate}
            onChange={(v) => setField("default_tax_rate", v)}
            type="number"
            testId="field-tax-rate"
          />
          <Field
            label="Default Payment Terms"
            value={form.default_payment_terms}
            onChange={(v) => setField("default_payment_terms", v)}
            testId="field-payment-terms"
          />
          <div className="sm:col-span-2">
            <Field
              label="Payment Instructions"
              value={form.payment_instructions}
              onChange={(v) => setField("payment_instructions", v)}
              type="textarea"
              testId="field-payment-instructions"
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Default Document Note"
              value={form.default_document_note}
              onChange={(v) => setField("default_document_note", v)}
              type="textarea"
              testId="field-document-note"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
