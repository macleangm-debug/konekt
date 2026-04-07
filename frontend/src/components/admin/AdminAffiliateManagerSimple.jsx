import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Users, Plus, Search, Settings, Megaphone } from "lucide-react";
import AffiliatePromoBenefitEditor from "../affiliate/AffiliatePromoBenefitEditor";
import PhoneNumberField from "../forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

function CommissionRulesEditor() {
  const [rules, setRules] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/api/referral-commission/rules").then((res) => setRules(res.data)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/referral-commission/rules", rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSaving(false);
  };

  if (!rules) return <div className="animate-pulse h-32 bg-slate-100 rounded-[2rem]" />;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4" data-testid="commission-rules-editor">
      <h2 className="text-lg font-bold text-[#20364D]">Commission Rules</h2>
      <p className="text-slate-500 text-sm">Non-margin-touching commission rates. Triggered only after approved payment.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 font-medium">Affiliate Commission %</label>
          <input type="number" min="0" max="100" step="0.5" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mt-1 focus:ring-2 focus:ring-[#20364D]/20 outline-none"
            value={rules.affiliate_commission_percent} onChange={(e) => setRules({ ...rules, affiliate_commission_percent: Number(e.target.value) })} data-testid="affiliate-percent-input" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Sales Commission %</label>
          <input type="number" min="0" max="100" step="0.5" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mt-1 focus:ring-2 focus:ring-[#20364D]/20 outline-none"
            value={rules.sales_commission_percent} onChange={(e) => setRules({ ...rules, sales_commission_percent: Number(e.target.value) })} data-testid="sales-percent-input" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Minimum Payout Threshold (TZS)</label>
          <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mt-1 focus:ring-2 focus:ring-[#20364D]/20 outline-none"
            value={rules.minimum_payout_threshold} onChange={(e) => setRules({ ...rules, minimum_payout_threshold: Number(e.target.value) })} data-testid="payout-threshold-input" />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <input type="checkbox" id="allow-both" className="w-4 h-4 rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]"
            checked={rules.allow_affiliate_and_sales_same_order} onChange={(e) => setRules({ ...rules, allow_affiliate_and_sales_same_order: e.target.checked })} data-testid="allow-both-checkbox" />
          <label htmlFor="allow-both" className="text-sm text-[#20364D]">Allow affiliate + sales commission on same order</label>
        </div>
      </div>
      <button onClick={save} disabled={saving} data-testid="save-commission-rules-btn"
        className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50">
        {saving ? "Saving..." : saved ? "Saved!" : "Save Rules"}
      </button>
    </div>
  );
}

export default function AdminAffiliateManagerSimple() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone_prefix: "+255", phone: "", promo_code: "" });
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("affiliates");
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get("/api/referral-commission/admin/affiliates");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.promo_code.trim()) return alert("Promo code is required");
    setCreating(true);
    try {
      await api.post("/api/referral-commission/affiliate/create", {
        ...form,
        phone: combinePhone(form.phone_prefix, form.phone),
        phone_prefix: undefined,
      });
      setForm({ name: "", email: "", phone_prefix: "+255", phone: "", promo_code: "" });
      setShowCreate(false);
      load();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setCreating(false);
  };

  const STATUS_COLORS = {
    active: "bg-green-100 text-green-800",
    paused: "bg-amber-100 text-amber-800",
    inactive: "bg-slate-100 text-slate-600",
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100 rounded-xl w-64" /><div className="h-64 bg-slate-100 rounded-[2rem]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-affiliate-manager">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Affiliate & Commission Manager</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage affiliate codes, commission rules, and promo benefits.</p>
        </div>
        {activeTab === "affiliates" && (
          <button onClick={() => setShowCreate(!showCreate)} data-testid="create-affiliate-btn"
            className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition-colors">
            <Plus size={16} /> New Affiliate
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" data-testid="affiliate-tabs">
        {[
          { key: "affiliates", label: "Affiliates", icon: Users },
          { key: "rules", label: "Commission Rules", icon: Settings },
          { key: "promo", label: "Promo Benefit", icon: Megaphone },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} data-testid={`affiliate-tab-${key}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? "bg-[#20364D] text-white shadow-sm" : "text-[#20364D] hover:bg-slate-50"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Commission Rules Tab */}
      {activeTab === "rules" && <CommissionRulesEditor />}

      {/* Promo Benefit Tab */}
      {activeTab === "promo" && (
        <div className="space-y-4">
          {!selectedAffiliateId ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-[#20364D] mb-3">Select Affiliate</h2>
              <p className="text-slate-500 text-sm mb-4">Choose an affiliate to edit their promo benefit text.</p>
              <div className="grid md:grid-cols-3 gap-3">
                {rows.map((r) => (
                  <button key={r.id} onClick={() => setSelectedAffiliateId(r.id)} data-testid={`select-affiliate-${r.id}`}
                    className="rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors">
                    <p className="font-semibold text-[#20364D]">{r.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{r.promo_code}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setSelectedAffiliateId(null)} className="text-sm text-[#20364D] font-medium hover:underline">&larr; Back to affiliates</button>
              <AffiliatePromoBenefitEditor affiliateId={selectedAffiliateId} />
            </div>
          )}
        </div>
      )}

      {/* Affiliates Tab */}
      {activeTab === "affiliates" && (
        <>

      {showCreate && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4" data-testid="create-affiliate-form">
          <h2 className="text-lg font-bold text-[#20364D]">Create Affiliate</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="affiliate-name-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Promo Code (e.g., BRAND10)" value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} data-testid="affiliate-code-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="affiliate-email-input" />
            <PhoneNumberField
              label=""
              prefix={form.phone_prefix}
              number={form.phone}
              onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
              onNumberChange={(v) => setForm({ ...form, phone: v })}
              testIdPrefix="affiliate-phone"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating} data-testid="save-affiliate-btn"
              className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold disabled:opacity-50">{creating ? "Creating..." : "Create"}</button>
            <button onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-[#20364D]">Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Users size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No affiliates yet</h2>
          <p className="text-slate-500 mt-2">Create your first affiliate to start tracking referrals and commissions.</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="affiliates-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clicks</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unpaid Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors" data-testid={`affiliate-row-${row.id}`}>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{row.name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.promo_code}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[row.status] || "bg-slate-100"}`}>{row.status}</span></td>
                    <td className="px-4 py-3 text-slate-600">{row.clicks}</td>
                    <td className="px-4 py-3 text-slate-600">{row.leads}</td>
                    <td className="px-4 py-3 text-slate-600">{row.approved_sales}</td>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{money(row.unpaid_commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
