import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import { Settings, Building2, DollarSign, Megaphone, Bell, Save, CheckCircle } from "lucide-react";

const SECTIONS = [
  { key: "profile", label: "Business Profile", icon: Building2 },
  { key: "commercial", label: "Commercial Rules", icon: DollarSign },
  { key: "affiliate", label: "Affiliate Defaults", icon: Megaphone },
  { key: "notifications", label: "Notifications", icon: Bell },
];

function SettingsField({ label, value, onChange, type = "text", options }) {
  if (type === "toggle") {
    return (
      <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-700">{label}</span>
        <button onClick={() => onChange(!value)} data-testid={`toggle-${label.toLowerCase().replace(/\s+/g,'-')}`}
          className={`w-12 h-7 rounded-full transition-colors ${value ? "bg-green-500" : "bg-slate-300"} relative`}>
          <span className={`block w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    );
  }
  if (type === "select") {
    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <label className="text-xs text-slate-500 mb-1 block">{label}</label>
        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} />
    </div>
  );
}

export default function BusinessSettingsPageV2() {
  const [section, setSection] = useState("profile");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
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
        <p className="text-slate-500 mt-1 text-sm">Configure company profile, commercial rules, affiliate defaults, and notifications.</p>
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

      {loading ? (
        <div className="space-y-3 animate-pulse"><div className="h-40 bg-slate-100 rounded-xl" /></div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 max-w-2xl">
          {section === "profile" && (<>
            <SettingsField label="Company Name" value={data.company_name} onChange={v => update("company_name", v)} />
            <SettingsField label="Country" value={data.country} onChange={v => update("country", v)} type="select" options={["TZ","KE","UG","RW"]} />
            <SettingsField label="Currency" value={data.currency} onChange={v => update("currency", v)} type="select" options={["TZS","KES","UGX","USD"]} />
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
