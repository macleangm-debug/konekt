import React, { useEffect, useState, useCallback } from "react";
import adminApi from "../../lib/adminApi";
import { Building2, DollarSign, Megaphone, Bell, Save, CheckCircle, FileSignature, Upload, Eye, Trash2, RefreshCw } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const SECTIONS = [
  { key: "profile", label: "Business Profile", icon: Building2 },
  { key: "commercial", label: "Commercial Rules", icon: DollarSign },
  { key: "branding", label: "Invoice Branding", icon: FileSignature },
  { key: "affiliate", label: "Affiliate Defaults", icon: Megaphone },
  { key: "notifications", label: "Notifications", icon: Bell },
];

function SettingsField({ label, value, onChange, type = "text", options, placeholder, required }) {
  if (type === "toggle") {
    return (
      <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
        <button onClick={() => onChange(!value)} data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
          className={`w-12 h-7 rounded-full transition-colors ${value ? "bg-green-500" : "bg-slate-300"} relative`}>
          <span className={`block w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    );
  }
  if (type === "select") {
    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <label className="text-xs text-slate-500 mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {(options || []).map(o => typeof o === "object" ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <label className="text-xs text-slate-500 mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} />
    </div>
  );
}

function ImageUploadField({ label, url, onUpload, onClear }) {
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only image files accepted"); return; }
    const fd = new FormData();
    fd.append("file", file);
    onUpload(fd);
  };

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <label className="text-xs text-slate-500 mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative group">
            <img src={`${API_URL}${url}`} alt={label} className="w-20 h-20 object-contain border border-slate-200 rounded-xl bg-slate-50 p-1" />
            <button onClick={onClear} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
            <Upload className="w-5 h-5" />
          </div>
        )}
        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Upload className="w-3 h-3" /> {url ? "Replace" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}

function StampPreview({ svg, url, shape }) {
  if (svg) {
    return <div className="w-32 h-32 mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  if (url) {
    return <img src={url.startsWith("http") ? url : `${API_URL}${url}`} alt="Company stamp" className="w-32 h-32 object-contain mx-auto" />;
  }
  return (
    <div className={`w-32 h-32 mx-auto border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 ${shape === "circle" ? "rounded-full" : "rounded-xl"}`}>
      <span className="text-xs">No stamp</span>
    </div>
  );
}

function InvoiceBrandingPreview({ form, stampSvg }) {
  const sigUrl = form.cfo_signature_url ? `${API_URL}${form.cfo_signature_url}` : null;

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Live Invoice Footer Preview</div>
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
        <div className="flex gap-6">
          {/* Signature */}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">Authorized by</div>
            {form.show_signature && sigUrl ? (
              <img src={sigUrl} alt="Signature" className="h-12 object-contain mb-2" />
            ) : form.show_signature ? (
              <div className="h-12 border-b-2 border-slate-300 mb-2" />
            ) : (
              <div className="h-12 border-b border-dashed border-slate-200 mb-2 flex items-end justify-center text-[9px] text-slate-300">Signature off</div>
            )}
            <div className="text-xs font-semibold text-[#20364D]">{form.cfo_name || "CFO Name"}</div>
            <div className="text-[10px] text-slate-500">{form.cfo_title || "Chief Finance Officer"}</div>
          </div>

          {/* Stamp */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">Company Stamp</div>
            {form.show_stamp ? (
              <div className="w-20 h-20">
                {stampSvg ? (
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: stampSvg }} />
                ) : form.stamp_uploaded_url ? (
                  <img src={`${API_URL}${form.stamp_uploaded_url}`} alt="Stamp" className="w-full h-full object-contain" />
                ) : (
                  <div className={`w-full h-full border-2 border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-300 ${form.stamp_shape === "circle" ? "rounded-full" : "rounded-lg"}`}>Preview</div>
                )}
              </div>
            ) : (
              <div className="w-20 h-20 border border-dashed border-slate-200 rounded-full flex items-center justify-center text-[9px] text-slate-300">Stamp off</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceBrandingSection() {
  const [form, setForm] = useState({ ...DEFAULT_BRANDING });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stampSvg, setStampSvg] = useState("");
  const [generating, setGenerating] = useState(false);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getInvoiceBranding();
      if (res.data) setForm(prev => ({ ...prev, ...res.data }));
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (form.show_signature && !form.cfo_name) { alert("CFO Name is required when signature is enabled"); return; }
    setSaving(true);
    try {
      await adminApi.saveInvoiceBranding(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert("Failed to save: " + (err.response?.data?.detail || err.message)); }
    setSaving(false);
  };

  const handleSignatureUpload = async (fd) => {
    try {
      const res = await adminApi.uploadSignature(fd);
      update("cfo_signature_url", res.data.url);
    } catch (err) { alert("Upload failed: " + (err.response?.data?.detail || err.message)); }
  };

  const handleStampUpload = async (fd) => {
    try {
      const res = await adminApi.uploadStamp(fd);
      update("stamp_uploaded_url", res.data.url);
    } catch (err) { alert("Upload failed: " + (err.response?.data?.detail || err.message)); }
  };

  const generateStamp = async () => {
    setGenerating(true);
    try {
      const res = await adminApi.generateStamp({
        stamp_shape: form.stamp_shape,
        stamp_color: form.stamp_color,
        stamp_text_primary: form.stamp_text_primary,
        stamp_text_secondary: form.stamp_text_secondary,
        stamp_registration_number: form.stamp_registration_number,
        stamp_tax_number: form.stamp_tax_number,
        stamp_phrase: form.stamp_phrase,
      });
      setStampSvg(res.data.svg || "");
      if (res.data.stamp_preview_url) update("stamp_preview_url", res.data.stamp_preview_url);
    } catch (err) { alert("Generation failed: " + (err.response?.data?.detail || err.message)); }
    setGenerating(false);
  };

  if (loading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* CFO Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-bold text-[#20364D] mb-3">CFO Details</div>
        <SettingsField label="CFO Name" value={form.cfo_name} onChange={v => update("cfo_name", v)} placeholder="Jane M. Doe" required={form.show_signature} />
        <SettingsField label="CFO Title" value={form.cfo_title} onChange={v => update("cfo_title", v)} placeholder="Chief Finance Officer" />
        <SettingsField label="Show Signature on Invoices" value={form.show_signature} onChange={v => update("show_signature", v)} type="toggle" />
      </div>

      {/* Signature Upload */}
      {form.show_signature && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-bold text-[#20364D] mb-3">Signature</div>
          <ImageUploadField label="CFO Signature (PNG preferred)" url={form.cfo_signature_url} onUpload={handleSignatureUpload} onClear={() => update("cfo_signature_url", "")} />
        </div>
      )}

      {/* Company Stamp */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-bold text-[#20364D] mb-3">Company Stamp</div>
        <SettingsField label="Show Company Stamp on Invoices" value={form.show_stamp} onChange={v => update("show_stamp", v)} type="toggle" />

        {form.show_stamp && (
          <>
            <SettingsField label="Stamp Mode" value={form.stamp_mode} onChange={v => update("stamp_mode", v)} type="select"
              options={[{ value: "generated", label: "Generate Stamp" }, { value: "uploaded", label: "Upload Existing Stamp" }]} />

            {form.stamp_mode === "generated" ? (
              <div className="space-y-0">
                <SettingsField label="Shape" value={form.stamp_shape} onChange={v => update("stamp_shape", v)} type="select"
                  options={[{ value: "circle", label: "Circle" }, { value: "square", label: "Square" }]} />
                <SettingsField label="Color" value={form.stamp_color} onChange={v => update("stamp_color", v)} type="select"
                  options={[{ value: "blue", label: "Blue" }, { value: "red", label: "Red" }, { value: "black", label: "Black" }]} />
                <SettingsField label="Company Legal Name" value={form.stamp_text_primary} onChange={v => update("stamp_text_primary", v)} required />
                <SettingsField label="City / Country" value={form.stamp_text_secondary} onChange={v => update("stamp_text_secondary", v)} />
                <SettingsField label="Registration Number" value={form.stamp_registration_number} onChange={v => update("stamp_registration_number", v)} />
                <SettingsField label="TIN / Tax Number" value={form.stamp_tax_number} onChange={v => update("stamp_tax_number", v)} />
                <SettingsField label="Stamp Phrase" value={form.stamp_phrase} onChange={v => update("stamp_phrase", v)} placeholder="Official Company Stamp" />

                <div className="pt-4 flex items-center gap-4">
                  <button onClick={generateStamp} disabled={generating} data-testid="generate-stamp-btn"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] disabled:opacity-50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} /> {generating ? "Generating..." : "Preview Stamp"}
                  </button>
                  <StampPreview svg={stampSvg} url={form.stamp_preview_url} shape={form.stamp_shape} />
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <ImageUploadField label="Company Stamp (PNG with transparent background preferred)" url={form.stamp_uploaded_url} onUpload={handleStampUpload} onClear={() => update("stamp_uploaded_url", "")} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Live Preview */}
      <InvoiceBrandingPreview form={form} stampSvg={stampSvg} />

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} data-testid="save-branding-btn"
          className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center gap-2">
          {saved ? <><CheckCircle size={16} /> Saved</> : <><Save size={16} /> {saving ? "Saving..." : "Save Branding Settings"}</>}
        </button>
      </div>
    </div>
  );
}

const DEFAULT_BRANDING = {
  show_signature: false,
  show_stamp: false,
  cfo_name: "",
  cfo_title: "Chief Finance Officer",
  cfo_signature_url: "",
  stamp_mode: "generated",
  stamp_shape: "circle",
  stamp_color: "blue",
  stamp_text_primary: "Konekt Limited",
  stamp_text_secondary: "Dar es Salaam, Tanzania",
  stamp_registration_number: "",
  stamp_tax_number: "",
  stamp_phrase: "Official Company Stamp",
  stamp_uploaded_url: "",
  stamp_preview_url: "",
};

export default function BusinessSettingsPageV2() {
  const [section, setSection] = useState("profile");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    if (section === "branding") return; // handled by InvoiceBrandingSection
    setLoading(true);
    setSaved(false);
    try {
      const fetcher = section === "profile" ? adminApi.getBusinessProfile()
        : section === "commercial" ? adminApi.getCommercialRules()
        : section === "affiliate" ? adminApi.getAffiliateDefaults()
        : adminApi.getNotificationSettings();
      const res = await fetcher;
      setData(res.data || {});
    } catch { setData({}); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [section]);

  const save = async () => {
    setSaving(true);
    try {
      const updater = section === "profile" ? adminApi.updateBusinessProfile
        : section === "commercial" ? adminApi.updateCommercialRules
        : section === "affiliate" ? adminApi.updateAffiliateDefaults
        : adminApi.updateNotificationSettings;
      await updater(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert("Failed to save: " + (err.response?.data?.detail || err.message)); }
    setSaving(false);
  };

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <div data-testid="business-settings-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Business Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Configure company profile, commercial rules, invoice branding, and notifications.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" data-testid="settings-tabs">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${section === s.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`section-${s.key}`}>
            <s.icon size={16} />{s.label}
          </button>
        ))}
      </div>

      {section === "branding" ? (
        <InvoiceBrandingSection />
      ) : loading ? (
        <div className="space-y-3 animate-pulse"><div className="h-40 bg-slate-100 rounded-xl" /></div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 max-w-2xl">
          {section === "profile" && (<>
            <SettingsField label="Company Name" value={data.company_name} onChange={v => update("company_name", v)} />
            <SettingsField label="Country" value={data.country} onChange={v => update("country", v)} type="select" options={["TZ", "KE", "UG", "RW"]} />
            <SettingsField label="Currency" value={data.currency} onChange={v => update("currency", v)} type="select" options={["TZS", "KES", "UGX", "USD"]} />
            <SettingsField label="Phone Prefix" value={data.phone_prefix} onChange={v => update("phone_prefix", v)} />
            <SettingsField label="Tax Rate (%)" value={data.tax_rate} onChange={v => update("tax_rate", v)} type="number" />
            <SettingsField label="Tax Name" value={data.tax_name} onChange={v => update("tax_name", v)} />
          </>)}
          {section === "commercial" && (<>
            <SettingsField label="Quote Validity (days)" value={data.quote_validity_days} onChange={v => update("quote_validity_days", v)} type="number" />
            <SettingsField label="Auto Release on Payment" value={data.auto_release_on_payment} onChange={v => update("auto_release_on_payment", v)} type="toggle" />
            <SettingsField label="Require Payment Proof" value={data.require_payment_proof !== false} onChange={v => update("require_payment_proof", v)} type="toggle" />
            <SettingsField label="Allow Manual Release" value={data.allow_manual_release !== false} onChange={v => update("allow_manual_release", v)} type="toggle" />
          </>)}
          {section === "affiliate" && (<>
            <SettingsField label="Affiliates Enabled" value={data.enabled !== false} onChange={v => update("enabled", v)} type="toggle" />
            <SettingsField label="Default Commission Rate (%)" value={data.default_commission_rate} onChange={v => update("default_commission_rate", v)} type="number" />
            <SettingsField label="Referral Rewards Active" value={data.referral_rewards !== false} onChange={v => update("referral_rewards", v)} type="toggle" />
          </>)}
          {section === "notifications" && (<>
            <SettingsField label="Email on Payment" value={data.email_on_payment !== false} onChange={v => update("email_on_payment", v)} type="toggle" />
            <SettingsField label="Email on Order" value={data.email_on_order !== false} onChange={v => update("email_on_order", v)} type="toggle" />
            <SettingsField label="WhatsApp Enabled" value={data.whatsapp_enabled === true} onChange={v => update("whatsapp_enabled", v)} type="toggle" />
          </>)}

          <div className="mt-6 flex items-center gap-3">
            <button onClick={save} disabled={saving} data-testid="save-settings-btn"
              className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center gap-2">
              {saved ? <><CheckCircle size={16} /> Saved</> : <><Save size={16} /> {saving ? "Saving..." : "Save Settings"}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
