import React, { useEffect, useState, useCallback } from "react";
import adminApi from "../../../lib/adminApi";
import api from "../../../lib/api";
import { Save, CheckCircle, RefreshCw, Upload, Trash2 } from "lucide-react";
import SignaturePad from "./SignaturePad";
import GeneratedStampBuilder from "./GeneratedStampBuilder";
import PhoneNumberField from "../../forms/PhoneNumberField";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const DEFAULTS = {
  show_signature: false,
  show_stamp: false,
  cfo_name: "",
  cfo_title: "Chief Finance Officer",
  cfo_signature_url: "",
  signature_method: "upload",
  stamp_mode: "generated",
  stamp_shape: "circle",
  stamp_color: "blue",
  stamp_text_primary: "",
  stamp_text_secondary: "",
  stamp_registration_number: "",
  stamp_tax_number: "",
  stamp_phrase: "Official Company Stamp",
  stamp_uploaded_url: "",
  stamp_preview_url: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  company_logo_url: "",
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
  const [businessProfile, setBusinessProfile] = useState({});

  const up = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brandingRes, hubRes] = await Promise.all([
        adminApi.getInvoiceBranding(),
        api.get("/api/admin/settings-hub").catch(() => ({ data: {} })),
      ]);
      if (brandingRes.data) {
        setForm(p => ({ ...p, ...brandingRes.data }));
        if (brandingRes.data.show_stamp && brandingRes.data.stamp_mode === "generated") {
          try {
            const sr = await adminApi.generateStamp({ stamp_shape: brandingRes.data.stamp_shape || "circle", stamp_color: brandingRes.data.stamp_color || "blue", stamp_text_primary: brandingRes.data.stamp_text_primary || "", stamp_text_secondary: brandingRes.data.stamp_text_secondary || "", stamp_registration_number: brandingRes.data.stamp_registration_number || "", stamp_tax_number: brandingRes.data.stamp_tax_number || "", stamp_phrase: brandingRes.data.stamp_phrase || "Official Company Stamp" });
            setStampSvg(sr.data.svg || "");
          } catch {}
        }
      }
      setBusinessProfile(hubRes.data?.business_profile || {});
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
  const handleLogoUpload = async (fd) => {
    try { const r = await adminApi.uploadLogo(fd); up("company_logo_url", r.data.url); } catch { alert("Upload failed"); }
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
      {/* Company Logo */}
      <div className="pb-4 border-b border-slate-100">
        <ImageUpload label="Company Logo (used on all document headers)" url={form.company_logo_url} onUpload={handleLogoUpload} onClear={() => up("company_logo_url", "")} />
      </div>

      {/* Document Contact Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Contact Email" value={form.contact_email} onChange={v => up("contact_email", v)} placeholder="accounts@konekt.co.tz" />
        <PhoneNumberField
          label="Contact Phone"
          prefix={form.contact_phone_prefix || "+255"}
          number={form.contact_phone}
          onPrefixChange={v => up("contact_phone_prefix", v)}
          onNumberChange={v => up("contact_phone", v)}
          testIdPrefix="invoice-contact-phone"
        />
        <Field label="Contact Address" value={form.contact_address} onChange={v => up("contact_address", v)} placeholder="Dar es Salaam, Tanzania" />
      </div>

      {/* CFO Details */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="CFO Name" value={form.cfo_name} onChange={v => up("cfo_name", v)} placeholder="Jane M. Doe" required={form.show_signature} />
        <Field label="CFO Title" value={form.cfo_title} onChange={v => up("cfo_title", v)} placeholder="Chief Finance Officer" />
        <div className="flex items-end pb-1">
          <Toggle label="Show Signature on Documents" checked={form.show_signature} onChange={v => up("show_signature", v)} />
        </div>
      </div>

      {/* Signature Upload / Pad */}
      {form.show_signature && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => up("signature_method", "upload")}
              data-testid="sig-method-upload"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                (form.signature_method || "upload") === "upload"
                  ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => up("signature_method", "pad")}
              data-testid="sig-method-pad"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                form.signature_method === "pad"
                  ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              Draw Signature
            </button>
          </div>
          {form.signature_method === "pad" ? (
            <SignaturePad
              existingUrl={form.cfo_signature_url ? `${API_URL}${form.cfo_signature_url}` : null}
              onSave={(dataUrl) => up("cfo_signature_url", dataUrl)}
            />
          ) : (
            <ImageUpload label="CFO Signature (PNG preferred)" url={form.cfo_signature_url} onUpload={handleSigUpload} onClear={() => up("cfo_signature_url", "")} />
          )}
        </div>
      )}

      {/* Company Stamp */}
      <div className="pt-2 border-t border-slate-100">
        <Toggle label="Show Company Stamp on Documents" checked={form.show_stamp} onChange={v => up("show_stamp", v)} />
      </div>

      {form.show_stamp && (
        <div className="space-y-4">
          <Field label="Stamp Mode" value={form.stamp_mode} onChange={v => up("stamp_mode", v)} type="select"
            options={[{ value: "generated", label: "Generate Stamp" }, { value: "uploaded", label: "Upload Existing Stamp" }]} />

          {form.stamp_mode === "generated" ? (
            <>
              <GeneratedStampBuilder
                value={{
                  stamp_shape: form.stamp_shape,
                  stamp_color: form.stamp_color,
                  stamp_text_primary: form.stamp_text_primary,
                  stamp_text_secondary: form.stamp_text_secondary,
                  stamp_registration_number: form.stamp_registration_number,
                  stamp_tax_number: form.stamp_tax_number,
                  stamp_phrase: form.stamp_phrase,
                  stamp_show_company: form.stamp_show_company,
                  stamp_show_location: form.stamp_show_location,
                  stamp_show_reg: form.stamp_show_reg,
                  stamp_show_tin: form.stamp_show_tin,
                }}
                onChange={(stampValues) => setForm((p) => ({ ...p, ...stampValues }))}
                svgPreview={stampSvg}
                businessProfile={businessProfile}
              />
              <div className="flex items-center gap-6 mt-2">
                <button onClick={generateStamp} disabled={generating} data-testid="generate-stamp-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] disabled:opacity-50 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} /> {generating ? "Generating..." : "Generate SVG Preview"}
                </button>
                <div className="w-32 h-32 flex-shrink-0">
                  {stampSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: stampSvg }} style={{ width: "128px", height: "128px" }} className="[&>svg]:w-full [&>svg]:h-full" />
                  ) : (
                    <div className="w-full h-full rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300">
                      Click Generate
                    </div>
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
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Document Footer Preview</div>
        <div className="flex gap-8 items-end">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 font-semibold">Authorized by</div>
            {form.show_signature && form.cfo_signature_url ? (
              <img src={form.cfo_signature_url.startsWith("data:") ? form.cfo_signature_url : `${API_URL}${form.cfo_signature_url}`} alt="sig" className="h-10 object-contain mb-1 opacity-60" />
            ) : (
              <div className="h-10 border-b-2 border-slate-300 mb-1" />
            )}
            <div className="text-xs font-semibold text-[#20364D]">{form.cfo_name || "CFO Name"}</div>
            <div className="text-[10px] text-slate-500">{form.cfo_title || "Chief Finance Officer"}</div>
          </div>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 font-semibold">Company Stamp</div>
            {form.show_stamp ? (
              <div className="w-24 h-24 [&>svg]:w-full [&>svg]:h-full">
                {stampSvg ? <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: stampSvg }} />
                : form.stamp_uploaded_url ? <img src={`${API_URL}${form.stamp_uploaded_url}`} alt="stamp" className="w-full h-full object-contain" />
                : <div className={`w-full h-full border-2 border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-300 ${form.stamp_shape === "circle" ? "rounded-full" : "rounded-lg"}`}>Click Preview</div>}
              </div>
            ) : (
              <div className="w-24 h-24 border border-dashed border-slate-200 rounded-full flex items-center justify-center text-[9px] text-slate-300">Off</div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ Document Preview Panel ━━━ */}
      <DocumentPreviewPanel form={form} stampSvg={stampSvg} />

      <button onClick={save} disabled={saving} data-testid="save-branding-btn"
        className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center gap-2">
        {saved ? <><CheckCircle size={16} /> Saved</> : <><Save size={16} /> {saving ? "Saving..." : "Save Branding Settings"}</>}
      </button>
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOCUMENT PREVIEW PANEL
 * Shows realistic Invoice + Quote previews with live branding.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DocumentPreviewPanel({ form, stampSvg }) {
  const [previewTab, setPreviewTab] = useState("invoice");
  const tabs = [
    { id: "invoice", label: "Invoice Preview" },
    { id: "quote", label: "Quote Preview" },
  ];

  return (
    <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden" data-testid="document-preview-panel">
      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document Preview</div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setPreviewTab(t.id)}
              data-testid={`preview-tab-${t.id}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${previewTab === t.id ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#f1f5f9] p-4">
        <div className="mx-auto bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden" style={{ maxWidth: 680 }}>
          {previewTab === "invoice" ? (
            <InvoiceMiniPreview form={form} stampSvg={stampSvg} />
          ) : (
            <QuoteMiniPreview form={form} stampSvg={stampSvg} />
          )}
        </div>
      </div>
    </div>
  );
}

const sampleItems = [
  { name: "Branded T-Shirts (XL)", qty: 200, unit: "pcs", price: 15000 },
  { name: "Embossed Business Cards", qty: 500, unit: "pcs", price: 800 },
  { name: "Custom Tote Bags", qty: 100, unit: "pcs", price: 12000 },
];
const sampleDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function ConnectedTriadSvg({ size = 30, variant = "dark" }) {
  const s = size;
  const isLight = variant === "light";
  const nodeColor = isLight ? "#FFFFFF" : "#20364D";
  const accentColor = "#D4A843";
  const connColor = isLight ? "rgba(229,231,235,0.85)" : "rgba(32,54,77,0.45)";
  const topX = s * 0.58, topY = s * 0.13;
  const leftX = s * 0.12, leftY = s * 0.82;
  const rightX = s * 0.90, rightY = s * 0.72;
  const accentR = Math.max(2.8, s * 0.14);
  const nodeR = Math.max(2.2, s * 0.108);
  const sw = Math.max(2.0, s * 0.062);
  const rmX = (topX + rightX) / 2 + s * 0.06;
  const rmY = (topY + rightY) / 2 - s * 0.04;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" style={{ verticalAlign: "middle", flexShrink: 0 }}>
      <line x1={topX} y1={topY} x2={leftX} y2={leftY} stroke={connColor} strokeWidth={sw} strokeLinecap="round"/>
      <path d={`M${topX},${topY} Q${rmX},${rmY} ${rightX},${rightY}`} stroke={connColor} strokeWidth={sw} strokeLinecap="round" fill="none"/>
      <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke={connColor} strokeWidth={sw} strokeLinecap="round"/>
      <circle cx={topX} cy={topY} r={accentR} fill={accentColor}/>
      <circle cx={leftX} cy={leftY} r={nodeR} fill={nodeColor}/>
      <circle cx={rightX} cy={rightY} r={nodeR} fill={nodeColor}/>
    </svg>
  );
}

function ConnectedTriadStampSvg({ size = 64, color = "#1a365d" }) {
  const s = size * 0.42;
  const topX = s * 0.58, topY = s * 0.13;
  const leftX = s * 0.12, leftY = s * 0.82;
  const rightX = s * 0.90, rightY = s * 0.72;
  const accentR = Math.max(2.8, s * 0.14);
  const nodeR = Math.max(2.2, s * 0.108);
  const sw = Math.max(2.0, s * 0.062);
  const rmX = (topX + rightX) / 2 + s * 0.06;
  const rmY = (topY + rightY) / 2 - s * 0.04;
  const oR = size / 2 - 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={oR} fill="none" stroke={color} strokeWidth={2.5}/>
      <circle cx={size/2} cy={size/2} r={oR - 3} fill="none" stroke={color} strokeWidth={0.8}/>
      <circle cx={size/2} cy={size/2} r={size * 0.32} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="1.5,2" opacity={0.4}/>
      <g transform={`translate(${size/2 - s/2},${size * 0.35})`}>
        <line x1={topX} y1={topY} x2={leftX} y2={leftY} stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.45}/>
        <path d={`M${topX},${topY} Q${rmX},${rmY} ${rightX},${rightY}`} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" opacity={0.45}/>
        <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.45}/>
        <circle cx={topX} cy={topY} r={accentR} fill={color}/>
        <circle cx={leftX} cy={leftY} r={nodeR} fill={color}/>
        <circle cx={rightX} cy={rightY} r={nodeR} fill={color}/>
      </g>
    </svg>
  );
}

function PreviewHeader({ form, docType, docNumber }) {
  const logoUrl = form.company_logo_url ? (form.company_logo_url.startsWith("http") ? form.company_logo_url : `${process.env.REACT_APP_BACKEND_URL || ""}${form.company_logo_url}`) : null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", background: "#20364D", color: "#fff" }}>
      <div>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ height: 32, objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ConnectedTriadSvg size={28} variant="light" />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.02em" }}>Konekt</span>
          </div>
        )}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>B2B Commerce Platform</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{docType}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{docNumber}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)" }}>{sampleDate}</div>
      </div>
    </div>
  );
}

function PreviewFooter({ form }) {
  const email = form.contact_email || "accounts@konekt.co.tz";
  const address = form.contact_address || "Dar es Salaam, Tanzania";
  return (
    <div>
      <div style={{ background: "#D4A843", padding: "6px 24px", display: "flex", gap: 20, fontSize: 8, color: "#20364D", fontWeight: 600 }}>
        <span>{email}</span>
        <span>{form.contact_phone || "+255 XXX XXX XXX"}</span>
        <span>{address}</span>
      </div>
      <div style={{ padding: "8px 24px", fontSize: 8, color: "#94a3b8", textAlign: "center" }}>
        {form.stamp_text_primary || "Company"} &bull; {address}
      </div>
    </div>
  );
}

function PreviewAuthColumn({ form, stampSvg }) {
  const apiUrl = process.env.REACT_APP_BACKEND_URL || "";
  const showSig = form.show_signature;
  const showStamp = form.show_stamp;
  if (!showSig && !showStamp) return null;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", padding: "12px 24px 20px", gap: 24 }}>
      {showSig && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>Authorized by</div>
          {form.cfo_signature_url ? (
            <img src={form.cfo_signature_url.startsWith("data:") ? form.cfo_signature_url : `${apiUrl}${form.cfo_signature_url}`} alt="sig" style={{ height: 24, objectFit: "contain", opacity: 0.6, marginBottom: 2, display: "block", margin: "0 auto 2px" }} />
          ) : (
            <div style={{ height: 24, borderBottom: "2px solid #d1d5db", marginBottom: 2, width: 80 }} />
          )}
          <div style={{ fontSize: 9, fontWeight: 700, color: "#20364D" }}>{form.cfo_name || "CFO Name"}</div>
          <div style={{ fontSize: 8, color: "#64748b" }}>{form.cfo_title || "Chief Finance Officer"}</div>
        </div>
      )}
      {showStamp && (
        <div style={{ width: 72, height: 72, flexShrink: 0 }}>
          {stampSvg ? (
            <div style={{ width: 72, height: 72 }} className="[&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: stampSvg }} />
          ) : form.stamp_uploaded_url ? (
            <img src={`${apiUrl}${form.stamp_uploaded_url}`} alt="stamp" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ConnectedTriadStampSvg size={72} color="#1a365d" />
          )}
        </div>
      )}
    </div>
  );
}

function PreviewItemsTable({ items, showUnit }) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const vat = Math.round(subtotal * 0.18);
  const total = subtotal + vat;
  const fmt = (v) => `TZS ${Number(v).toLocaleString()}`;
  return (
    <div style={{ padding: "0 24px 16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ textAlign: "left", padding: "6px 0", color: "#64748b", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>#</th>
            <th style={{ textAlign: "left", padding: "6px 0", color: "#64748b", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Description</th>
            <th style={{ textAlign: "right", padding: "6px 0", color: "#64748b", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Qty</th>
            <th style={{ textAlign: "right", padding: "6px 0", color: "#64748b", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Price</th>
            <th style={{ textAlign: "right", padding: "6px 0", color: "#64748b", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 0", color: "#334155" }}>{i + 1}</td>
              <td style={{ padding: "6px 0", color: "#334155", fontWeight: 600 }}>{item.name}</td>
              <td style={{ padding: "6px 0", color: "#334155", textAlign: "right" }}>{item.qty}{showUnit ? ` ${item.unit}` : ""}</td>
              <td style={{ padding: "6px 0", color: "#334155", textAlign: "right" }}>{fmt(item.price)}</td>
              <td style={{ padding: "6px 0", color: "#334155", textAlign: "right", fontWeight: 600 }}>{fmt(item.qty * item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{ width: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", padding: "3px 0" }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", padding: "3px 0" }}><span>VAT (18%)</span><span>{fmt(vat)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#20364D", padding: "6px 0", borderTop: "2px solid #20364D", marginTop: 4 }}><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>
    </div>
  );
}

function InvoiceMiniPreview({ form, stampSvg }) {
  return (
    <div data-testid="invoice-mini-preview">
      <PreviewHeader form={form} docType="INVOICE" docNumber="INV-2026-0042" />
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#20364D" }}>Sample Corporation Ltd</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>orders@samplecorp.co.tz</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Plot 42, Industrial Area, DSM</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Payment</div>
            <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>PENDING</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Due: {sampleDate}</div>
          </div>
        </div>
      </div>
      <PreviewItemsTable items={sampleItems} showUnit />
      <PreviewAuthColumn form={form} stampSvg={stampSvg} />
      <PreviewFooter form={form} />
    </div>
  );
}

function QuoteMiniPreview({ form, stampSvg }) {
  return (
    <div data-testid="quote-mini-preview">
      <PreviewHeader form={form} docType="QUOTATION" docNumber="QT-2026-0018" />
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Prepared For</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#20364D" }}>ABC Enterprises</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>info@abc-ent.co.tz</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Validity</div>
            <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, background: "#dbeafe", color: "#1e40af" }}>ACTIVE</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Valid for 30 days</div>
          </div>
        </div>
      </div>
      <PreviewItemsTable items={sampleItems} showUnit />
      <div style={{ padding: "0 24px 12px" }}>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Terms & Notes</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Prices are valid for 30 days. 50% deposit required to confirm order. Balance due on delivery.</div>
        </div>
      </div>
      <PreviewAuthColumn form={form} stampSvg={stampSvg} />
      <PreviewFooter form={form} />
    </div>
  );
}
