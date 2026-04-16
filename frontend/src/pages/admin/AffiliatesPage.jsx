import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Loader2, RefreshCw, Link as LinkIcon,
  Copy, Search, DollarSign, TrendingUp, Wallet, ArrowDownToLine,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { affiliateApi } from "../../lib/affiliateApi";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";
import PhoneNumberField from "../../components/forms/PhoneNumberField";

const PLATFORMS = ["WhatsApp", "Instagram", "TikTok", "Facebook", "Website", "Other"];
const AUDIENCE_SIZES = ["< 100", "100-500", "500-1,000", "1,000-5,000", "5,000+"];

const initialForm = {
  first_name: "", last_name: "", email: "", phone_prefix: "+255", phone_number: "",
  location: "", affiliate_code: "", is_active: true, notes: "",
  primary_platform: "", social_instagram: "", social_tiktok: "", social_facebook: "", social_website: "",
  audience_size: "", promotion_strategy: "", product_interests: "",
  prior_experience: false, experience_description: "",
  expected_monthly_sales: "", willing_to_promote_weekly: true, why_join: "",
  payout_method: "mobile_money",
  mobile_money_number: "", mobile_money_provider: "",
  bank_name: "", bank_account_name: "", bank_account_number: "",
};

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const TABS = [
  { key: "affiliates", label: "Affiliates" },
  { key: "performance", label: "Performance" },
  { key: "withdrawals", label: "Withdrawals" },
];

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState([]);
  const { confirmAction } = useConfirmModal();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAff, setSelectedAff] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("affiliates");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getAffiliates();
      setAffiliates(res.data?.affiliates || []);
    } catch { toast.error("Failed to load affiliates"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.email || !form.affiliate_code) {
      toast.error("First name, email, and affiliate code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: [form.first_name, form.last_name].filter(Boolean).join(" "),
        phone: form.phone_number ? `${form.phone_prefix}${form.phone_number}` : "",
        expected_monthly_sales: parseInt(form.expected_monthly_sales) || 0,
      };
      delete payload.phone_prefix;
      delete payload.phone_number;
      await affiliateApi.createAffiliate(payload);
      toast.success("Affiliate created");
      setForm(initialForm);
      setDrawerOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create affiliate");
    }
    setSaving(false);
  };

  const openEdit = (aff) => {
    setSelectedAff(aff);
    setForm({
      ...initialForm,
      first_name: (aff.name || "").split(" ")[0] || "",
      last_name: (aff.name || "").split(" ").slice(1).join(" ") || "",
      email: aff.email || "",
      phone_prefix: "+255",
      phone_number: (aff.phone || "").replace(/^\+\d{1,3}/, ""),
      location: aff.location || "",
      affiliate_code: aff.affiliate_code || "",
      is_active: aff.is_active !== false,
      notes: aff.notes || "",
      primary_platform: aff.primary_platform || "",
      social_instagram: aff.social_instagram || "",
      social_tiktok: aff.social_tiktok || "",
      social_facebook: aff.social_facebook || "",
      social_website: aff.social_website || "",
      audience_size: aff.audience_size || "",
      promotion_strategy: aff.promotion_strategy || "",
      product_interests: aff.product_interests || "",
      prior_experience: aff.prior_experience || false,
      experience_description: aff.experience_description || "",
      expected_monthly_sales: aff.expected_monthly_sales || "",
      willing_to_promote_weekly: aff.willing_to_promote_weekly !== false,
      why_join: aff.why_join || "",
      payout_method: aff.payout_method || "mobile_money",
      mobile_money_number: aff.mobile_money_number || "",
      mobile_money_provider: aff.mobile_money_provider || "",
      bank_name: aff.bank_name || "",
      bank_account_name: aff.bank_account_name || "",
      bank_account_number: aff.bank_account_number || "",
    });
    setDrawerOpen(true);
  };

  const filtered = affiliates.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (a.name || "").toLowerCase().includes(s) || (a.email || "").toLowerCase().includes(s) || (a.affiliate_code || "").toLowerCase().includes(s);
  });

  // Performance KPIs
  const totalEarned = affiliates.reduce((s, a) => s + Number(a.total_commission || a.commission_earned || 0), 0);
  const totalPaid = affiliates.reduce((s, a) => s + Number(a.paid_commission || 0), 0);
  const totalPending = totalEarned - totalPaid;

  return (
    <div className="space-y-5" data-testid="affiliates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Affiliates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage affiliate partners, performance, and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={() => { setForm(initialForm); setSelectedAff(null); setDrawerOpen(true); }} data-testid="add-affiliate-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Affiliate
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="affiliate-kpis">
        <div className="bg-white border rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Affiliates</p>
          <p className="text-lg font-bold text-blue-600">{affiliates.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Earned</p>
          <p className="text-lg font-bold text-emerald-600">{money(totalEarned)}</p>
        </div>
        <div className="bg-white border rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Pending Payout</p>
          <p className="text-lg font-bold text-amber-600">{money(totalPending)}</p>
        </div>
        <div className="bg-white border rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Paid Out</p>
          <p className="text-lg font-bold text-green-600">{money(totalPaid)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid={`tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : (
        <>
          {tab === "affiliates" && <AffiliatesListTab affiliates={filtered} search={search} setSearch={setSearch} openEdit={openEdit} />}
          {tab === "performance" && <PerformanceTab affiliates={filtered} />}
          {tab === "withdrawals" && <WithdrawalsTab affiliates={filtered} onRefresh={load} />}
        </>
      )}

      {/* Create/Edit Drawer — Full Schema */}
      <StandardDrawerShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedAff ? "Edit Affiliate" : "New Affiliate"}
        subtitle="Full affiliate profile matching public application"
        testId="create-affiliate-drawer"
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="save-affiliate-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {saving ? "Saving..." : selectedAff ? "Update" : "Create Affiliate"}
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {/* Section 1 — Personal */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personal Information</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} placeholder="First name" className="mt-1" data-testid="aff-first-name" /></div>
            <div><Label className="text-xs">Last Name</Label><Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} placeholder="Last name" className="mt-1" data-testid="aff-last-name" /></div>
          </div>
          <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="partner@email.com" className="mt-1" data-testid="aff-email" /></div>
          <PhoneNumberField label="Phone" prefix={form.phone_prefix} number={form.phone_number} onPrefixChange={(v) => update("phone_prefix", v)} onNumberChange={(v) => update("phone_number", v)} testIdPrefix="aff-phone" />
          <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City / Country" className="mt-1" data-testid="aff-location" /></div>

          {/* Section 2 — Platform & Audience */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Platform & Audience</div>
          <div>
            <Label className="text-xs">Primary Platform</Label>
            <select value={form.primary_platform} onChange={(e) => update("primary_platform", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" data-testid="aff-platform">
              <option value="">Select platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Instagram</Label><Input value={form.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} placeholder="@username" className="mt-1" data-testid="aff-instagram" /></div>
            <div><Label className="text-xs">TikTok</Label><Input value={form.social_tiktok} onChange={(e) => update("social_tiktok", e.target.value)} placeholder="@username" className="mt-1" data-testid="aff-tiktok" /></div>
            <div><Label className="text-xs">Facebook</Label><Input value={form.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} placeholder="Page or profile" className="mt-1" data-testid="aff-facebook" /></div>
            <div><Label className="text-xs">Website</Label><Input value={form.social_website} onChange={(e) => update("social_website", e.target.value)} placeholder="https://..." className="mt-1" data-testid="aff-website" /></div>
          </div>
          <div>
            <Label className="text-xs">Audience Size</Label>
            <select value={form.audience_size} onChange={(e) => update("audience_size", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" data-testid="aff-audience">
              <option value="">Select size</option>
              {AUDIENCE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Section 3 — Strategy */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Promotion Strategy</div>
          <div><Label className="text-xs">Promotion Strategy</Label><Textarea value={form.promotion_strategy} onChange={(e) => update("promotion_strategy", e.target.value)} placeholder="How they plan to promote products..." className="mt-1 min-h-[50px]" data-testid="aff-strategy" /></div>
          <div><Label className="text-xs">Product Interests</Label><Input value={form.product_interests} onChange={(e) => update("product_interests", e.target.value)} placeholder="Categories they focus on" className="mt-1" data-testid="aff-interests" /></div>
          <div><Label className="text-xs">Why Join Konekt?</Label><Textarea value={form.why_join} onChange={(e) => update("why_join", e.target.value)} placeholder="Motivation..." className="mt-1 min-h-[40px]" data-testid="aff-why-join" /></div>
          <div><Label className="text-xs">Expected Monthly Sales (TZS)</Label><Input type="number" value={form.expected_monthly_sales} onChange={(e) => update("expected_monthly_sales", e.target.value)} placeholder="e.g., 500000" className="mt-1" data-testid="aff-monthly-sales" /></div>

          {/* Section 4 — Code & Payout */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Affiliate Code & Payout</div>
          <div>
            <Label className="text-xs">Affiliate Code *</Label>
            <Input value={form.affiliate_code} onChange={(e) => update("affiliate_code", e.target.value.toUpperCase())} placeholder="e.g., PARTNER10" className="mt-1 font-mono" data-testid="aff-code" />
          </div>
          <div>
            <Label className="text-xs">Payout Method</Label>
            <div className="flex rounded-lg border bg-white overflow-hidden mt-1">
              {[{ key: "mobile_money", label: "Mobile Money" }, { key: "bank", label: "Bank Transfer" }].map((m) => (
                <button type="button" key={m.key} onClick={() => update("payout_method", m.key)} className={`flex-1 px-3 py-2 text-xs font-semibold transition ${form.payout_method === m.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`payout-${m.key}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {form.payout_method === "mobile_money" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Mobile Money Number</Label><Input value={form.mobile_money_number} onChange={(e) => update("mobile_money_number", e.target.value.replace(/\D/g, ""))} placeholder="712345678" className="mt-1" data-testid="mm-number" /></div>
              <div><Label className="text-xs">Provider</Label><Input value={form.mobile_money_provider} onChange={(e) => update("mobile_money_provider", e.target.value)} placeholder="M-Pesa, Tigo Pesa" className="mt-1" data-testid="mm-provider" /></div>
            </div>
          )}
          {form.payout_method === "bank" && (
            <>
              <div><Label className="text-xs">Bank Name</Label><Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} className="mt-1" data-testid="bank-name" /></div>
              <div><Label className="text-xs">Account Name</Label><Input value={form.bank_account_name} onChange={(e) => update("bank_account_name", e.target.value)} className="mt-1" data-testid="bank-acct-name" /></div>
              <div><Label className="text-xs">Account Number</Label><Input value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value)} className="mt-1 font-mono" data-testid="bank-acct-num" /></div>
            </>
          )}

          {/* Status */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Status</div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch checked={form.is_active} onCheckedChange={(c) => update("is_active", c)} />
            <span className="text-sm font-medium">Active (Approve immediately)</span>
          </label>
          <div><Label className="text-xs">Internal Notes</Label><Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Internal notes..." className="mt-1 min-h-[50px]" /></div>
        </form>
      </StandardDrawerShell>
    </div>
  );
}

/* ═══ AFFILIATES LIST TAB ═══ */
function AffiliatesListTab({ affiliates, search, setSearch, openEdit }) {
  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search affiliates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" data-testid="affiliate-search" />
      </div>
      <div className="bg-white rounded-xl border overflow-hidden" data-testid="affiliates-table">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Affiliate</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Code</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Platform</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total Sales</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Earned</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />No affiliates found</td></tr>
            ) : affiliates.map((a) => (
              <tr key={a.id || a.email} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`aff-row-${a.affiliate_code}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#20364D]">{a.name}</div>
                  <div className="text-[10px] text-slate-400">{a.email}</div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { navigator.clipboard.writeText(a.affiliate_code); toast.success("Copied"); }} className="font-mono text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1" data-testid={`copy-code-${a.affiliate_code}`}>
                    {a.affiliate_code} <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{a.primary_platform || "\u2014"}</td>
                <td className="px-4 py-3 text-right text-sm">{money(a.total_sales || 0)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{money(a.total_commission || a.commission_earned || 0)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={a.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"} data-testid={`aff-status-${a.affiliate_code}`}>
                    {a.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(a)} data-testid={`edit-aff-${a.affiliate_code}`}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ PERFORMANCE TAB ═══ */
function PerformanceTab({ affiliates }) {
  const sorted = [...affiliates].sort((a, b) => Number(b.total_commission || b.commission_earned || 0) - Number(a.total_commission || a.commission_earned || 0));
  return (
    <div className="space-y-3" data-testid="performance-tab">
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Affiliate</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Code</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total Sales</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Commission Earned</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Pending</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Conversions</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Last Activity</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400"><TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-200" />No performance data yet</td></tr>
            ) : sorted.map((a) => {
              const earned = Number(a.total_commission || a.commission_earned || 0);
              const paid = Number(a.paid_commission || 0);
              const pending = earned - paid;
              return (
                <tr key={a.id || a.email} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`perf-row-${a.affiliate_code}`}>
                  <td className="px-4 py-3"><div className="font-medium text-sm">{a.name}</div><div className="text-[10px] text-slate-400">{a.email}</div></td>
                  <td className="px-4 py-3 font-mono text-xs">{a.affiliate_code}</td>
                  <td className="px-4 py-3 text-right">{money(a.total_sales || 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{money(earned)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{money(pending)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{money(paid)}</td>
                  <td className="px-4 py-3 text-center">{a.conversion_count || a.conversions || 0}</td>
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400">{a.last_activity ? new Date(a.last_activity).toLocaleDateString() : "\u2014"}</td>
                  <td className="px-4 py-3 text-center"><Badge className={a.is_active !== false ? "bg-emerald-100 text-emerald-700 text-[9px]" : "bg-slate-100 text-slate-500 text-[9px]"}>{a.is_active !== false ? "Active" : "Inactive"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ WITHDRAWALS TAB ═══ */
function WithdrawalsTab({ affiliates, onRefresh }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    setLoading(true);
    affiliateApi.getWithdrawals?.()
      .then((res) => setWithdrawals(res.data?.withdrawals || []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (wid, status) => {
    setProcessing(wid);
    try {
      await affiliateApi.updateWithdrawalStatus?.(wid, status);
      toast.success(`Withdrawal ${status}`);
      const res = await affiliateApi.getWithdrawals?.();
      setWithdrawals(res?.data?.withdrawals || []);
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
    }
    setProcessing(null);
  };

  const statusColors = {
    requested: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-3" data-testid="withdrawals-tab">
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Affiliate</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Method</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Requested</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {withdrawals.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><Wallet className="w-8 h-8 mx-auto mb-2 text-slate-200" />No withdrawal requests</td></tr>
            ) : withdrawals.map((w) => (
              <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`withdrawal-row-${w.id}`}>
                <td className="px-4 py-3"><div className="text-sm font-medium">{w.affiliate_name || w.name}</div><div className="text-[10px] text-slate-400">{w.affiliate_email || w.email}</div></td>
                <td className="px-4 py-3 text-right font-semibold">{money(w.amount)}</td>
                <td className="px-4 py-3 text-xs">{(w.payout_method || "").replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-center text-[10px] text-slate-400">{w.created_at ? new Date(w.created_at).toLocaleDateString() : "\u2014"}</td>
                <td className="px-4 py-3 text-center"><Badge className={`${statusColors[w.status] || "bg-slate-100 text-slate-500"} text-[9px]`}>{w.status}</Badge></td>
                <td className="px-4 py-3 text-center">
                  {w.status === "requested" && (
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(w.id, "approved")} disabled={processing === w.id} data-testid={`approve-withdrawal-${w.id}`}>Approve</Button>
                      <Button size="sm" variant="outline" className="text-[10px] h-7 text-red-500 border-red-200" onClick={() => updateStatus(w.id, "rejected")} disabled={processing === w.id} data-testid={`reject-withdrawal-${w.id}`}>Reject</Button>
                    </div>
                  )}
                  {w.status === "approved" && (
                    <Button size="sm" className="text-[10px] h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(w.id, "paid")} disabled={processing === w.id} data-testid={`mark-paid-${w.id}`}>Mark Paid</Button>
                  )}
                  {(w.status === "paid" || w.status === "rejected") && (
                    <span className="text-[10px] text-slate-400">{w.status === "paid" ? "Completed" : "Rejected"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
