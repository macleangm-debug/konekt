import React, { useEffect, useState, useCallback } from "react";
import adminApi from "../../../lib/adminApi";
import { Save, CheckCircle, RefreshCw, Upload, Trash2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const DEFAULTS = {
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
  contact_email: "accounts@konekt.co.tz",
  contact_phone: "+255 XXX XXX XXX",
  contact_address: "Dar es Salaam, Tanzania",
};

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-700">{label}</span>
      <button onClick={() => onChange(!checked)} data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`w-12 h-7 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-slate-300"} relative shrink-0`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", options, placeholder, required }) {
  if (type === "select") {
    return (
      <div>
        <label className="text-xs text-slate-500 mb-1 block">{label}{required && <span className="text-red-500">*</span>}</label>
        <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" value={value || ""} onChange={e => onChange(e.target.value)}>
          {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}{required && <span className="text-red-500">*</span>}</label>
      <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" type={type} value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function ImageUpload({ label, url, onUpload, onClear }) {
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only image files accepted"); return; }
    const fd = new FormData();
    fd.append("file", file);
    onUpload(fd);
  };
  return (
    <div>
      <label className="text-xs text-slate-500 mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative group">
            <img src={`${API_URL}${url}`} alt={label} className="w-16 h-16 object-contain border border-slate-200 rounded-xl bg-slate-50 p-1" />
            <button onClick={onClear} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
            <Upload className="w-4 h-4" />
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

export default function InvoiceBrandingSettings() {
  const [form, setForm] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stampSvg, setStampSvg] = useState("");
  const [generating, setGenerating] = useState(false);

  const up = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getInvoiceBranding();
      if (r.data) {
        setForm(p => ({ ...p, ...r.data }));
        // Auto-generate stamp preview if settings have generated mode
        if (r.data.show_stamp && r.data.stamp_mode === "generated") {
          try {
            const sr = await adminApi.generateStamp({ stamp_shape: r.data.stamp_shape || "circle", stamp_color: r.data.stamp_color || "blue", stamp_text_primary: r.data.stamp_text_primary || "Konekt Limited", stamp_text_secondary: r.data.stamp_text_secondary || "", stamp_registration_number: r.data.stamp_registration_number || "", stamp_tax_number: r.data.stamp_tax_number || "", stamp_phrase: r.data.stamp_phrase || "Official Company Stamp" });
            setStampSvg(sr.data.svg || "");
          } catch {}
        }
      }
    } catch {}
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
    } catch (e) { alert("Save failed"); }
    setSaving(false);
  };

  const handleSigUpload = async (fd) => {
    try { const r = await adminApi.uploadSignature(fd); up("cfo_signature_url", r.data.url); } catch { alert("Upload failed"); }
  };
  const handleStampUpload = async (fd) => {
    try { const r = await adminApi.uploadStamp(fd); up("stamp_uploaded_url", r.data.url); } catch { alert("Upload failed"); }
  };
  const generateStamp = async () => {
    setGenerating(true);
    try {
      const r = await adminApi.generateStamp({ stamp_shape: form.stamp_shape, stamp_color: form.stamp_color, stamp_text_primary: form.stamp_text_primary, stamp_text_secondary: form.stamp_text_secondary, stamp_registration_number: form.stamp_registration_number, stamp_tax_number: form.stamp_tax_number, stamp_phrase: form.stamp_phrase });
      setStampSvg(r.data.svg || "");
      if (r.data.stamp_preview_url) up("stamp_preview_url", r.data.stamp_preview_url);
    } catch { alert("Generation failed"); }
    setGenerating(false);
  };

  if (loading) return <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6" data-testid="invoice-branding-section">
      {/* Document Contact Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Contact Email" value={form.contact_email} onChange={v => up("contact_email", v)} placeholder="accounts@konekt.co.tz" />
        <Field label="Contact Phone" value={form.contact_phone} onChange={v => up("contact_phone", v)} placeholder="+255 XXX XXX XXX" />
        <Field label="Contact Address" value={form.contact_address} onChange={v => up("contact_address", v)} placeholder="Dar es Salaam, Tanzania" />
      </div>

      {/* CFO Details */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="CFO Name" value={form.cfo_name} onChange={v => up("cfo_name", v)} placeholder="Jane M. Doe" required={form.show_signature} />
        <Field label="CFO Title" value={form.cfo_title} onChange={v => up("cfo_title", v)} placeholder="Chief Finance Officer" />
        <div className="flex items-end pb-1">
          <Toggle label="Show Signature on Invoices" checked={form.show_signature} onChange={v => up("show_signature", v)} />
        </div>
      </div>

      {/* Signature Upload */}
      {form.show_signature && (
        <ImageUpload label="CFO Signature (PNG preferred)" url={form.cfo_signature_url} onUpload={handleSigUpload} onClear={() => up("cfo_signature_url", "")} />
      )}

      {/* Company Stamp */}
      <div className="pt-2 border-t border-slate-100">
        <Toggle label="Show Company Stamp on Invoices" checked={form.show_stamp} onChange={v => up("show_stamp", v)} />
      </div>

      {form.show_stamp && (
        <div className="space-y-4">
          <Field label="Stamp Mode" value={form.stamp_mode} onChange={v => up("stamp_mode", v)} type="select"
            options={[{ value: "generated", label: "Generate Stamp" }, { value: "uploaded", label: "Upload Existing Stamp" }]} />

          {form.stamp_mode === "generated" ? (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="Shape" value={form.stamp_shape} onChange={v => up("stamp_shape", v)} type="select"
                  options={[{ value: "circle", label: "Circle" }, { value: "square", label: "Square" }]} />
                <Field label="Color" value={form.stamp_color} onChange={v => up("stamp_color", v)} type="select"
                  options={[{ value: "blue", label: "Blue" }, { value: "red", label: "Red" }, { value: "black", label: "Black" }]} />
                <Field label="Stamp Phrase" value={form.stamp_phrase} onChange={v => up("stamp_phrase", v)} placeholder="Official Company Stamp" />
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Field label="Company Legal Name" value={form.stamp_text_primary} onChange={v => up("stamp_text_primary", v)} required />
                <Field label="City / Country" value={form.stamp_text_secondary} onChange={v => up("stamp_text_secondary", v)} />
                <Field label="Registration Number" value={form.stamp_registration_number} onChange={v => up("stamp_registration_number", v)} />
                <Field label="TIN / Tax Number" value={form.stamp_tax_number} onChange={v => up("stamp_tax_number", v)} />
              </div>
              <div className="flex items-center gap-6">
                <button onClick={generateStamp} disabled={generating} data-testid="generate-stamp-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] disabled:opacity-50 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} /> {generating ? "Generating..." : "Preview Stamp"}
                </button>
                <div className="w-28 h-28">
                  {stampSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: stampSvg }} />
                  ) : (
                    <div className={`w-full h-full border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300 ${form.stamp_shape === "circle" ? "rounded-full" : "rounded-xl"}`}>Click Preview</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <ImageUpload label="Company Stamp (PNG transparent preferred)" url={form.stamp_uploaded_url} onUpload={handleStampUpload} onClear={() => up("stamp_uploaded_url", "")} />
          )}
        </div>
      )}

      {/* Live Preview */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Invoice Footer Preview</div>
        <div className="flex gap-8 items-start">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 font-semibold">Authorized by</div>
            {form.show_signature && form.cfo_signature_url ? (
              <img src={`${API_URL}${form.cfo_signature_url}`} alt="sig" className="h-10 object-contain mb-1 opacity-60" />
            ) : (
              <div className="h-10 border-b-2 border-slate-300 mb-1" />
            )}
            <div className="text-xs font-semibold text-[#20364D]">{form.cfo_name || "CFO Name"}</div>
            <div className="text-[10px] text-slate-500">{form.cfo_title || "Chief Finance Officer"}</div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 font-semibold">Company Stamp</div>
            {form.show_stamp ? (
              <div className="w-20 h-20">
                {stampSvg ? <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: stampSvg }} />
                : form.stamp_uploaded_url ? <img src={`${API_URL}${form.stamp_uploaded_url}`} alt="stamp" className="w-full h-full object-contain" />
                : <div className={`w-full h-full border-2 border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-300 ${form.stamp_shape === "circle" ? "rounded-full" : "rounded-lg"}`}>Click Preview</div>}
              </div>
            ) : (
              <div className="w-20 h-20 border border-dashed border-slate-200 rounded-full flex items-center justify-center text-[9px] text-slate-300">Off</div>
            )}
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} data-testid="save-branding-btn"
        className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center gap-2">
        {saved ? <><CheckCircle size={16} /> Saved</> : <><Save size={16} /> {saving ? "Saving..." : "Save Branding Settings"}</>}
      </button>
    </div>
  );
}
