import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Trash2, Loader2, RefreshCw, Link as LinkIcon,
  Copy, Search,
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

const initialForm = {
  name: "", phone: "", email: "", affiliate_code: "",
  is_active: true, notes: "",
  payout_method: "mobile_money",
  mobile_money_number: "", mobile_money_provider: "",
  bank_name: "", bank_account_name: "", bank_account_number: "",
};

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState([]);
  const { confirmAction } = useConfirmModal();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

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
    if (!form.name || !form.email || !form.affiliate_code) {
      toast.error("Name, email, and affiliate code are required");
      return;
    }
    setSaving(true);
    try {
      await affiliateApi.createAffiliate(form);
      toast.success("Affiliate created");
      setForm(initialForm);
      setDrawerOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create affiliate");
    }
    setSaving(false);
  };

  const deleteAffiliate = (id) => {
    confirmAction({
      title: "Delete Affiliate?",
      message: "This affiliate will be permanently deleted.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try { await affiliateApi.deleteAffiliate(id); toast.success("Deleted"); load(); }
        catch { toast.error("Failed to delete"); }
      },
    });
  };

  const copyLink = async (aff) => {
    const link = `${window.location.origin}/a/${aff.affiliate_code}`;
    try { await navigator.clipboard.writeText(link); toast.success("Affiliate link copied"); }
    catch { toast.error("Failed to copy"); }
  };

  const filtered = affiliates.filter((a) =>
    !search || [a.name, a.email, a.affiliate_code].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="affiliates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Affiliates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage affiliate partners and commission settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} data-testid="refresh-affiliates-btn">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm(initialForm); setDrawerOpen(true); }} data-testid="add-affiliate-btn">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Affiliate
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search affiliates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="search-affiliates" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="affiliates-empty">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">{search ? "No matches" : "No affiliates yet"}</p>
          {!search && <p className="text-xs text-slate-400 mt-1">Create your first affiliate partner</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="affiliates-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Commission</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((aff) => (
                  <tr key={aff.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`affiliate-row-${aff.id}`}>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{aff.name}</td>
                    <td className="px-4 py-3 text-slate-500">{aff.email}</td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{aff.affiliate_code}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {aff.commission_value}{aff.commission_type === "percentage" ? "%" : " TZS"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={aff.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                        {aff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copyLink(aff)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-[#20364D]" title="Copy Link" data-testid={`copy-link-${aff.id}`}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteAffiliate(aff.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete" data-testid={`delete-affiliate-${aff.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
            {filtered.length} affiliate{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Create Drawer */}
      <StandardDrawerShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Affiliate"
        subtitle="Create affiliate partner"
        testId="create-affiliate-drawer"
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="save-affiliate-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {saving ? "Creating..." : "Create Affiliate"}
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {/* Section 1 — Identity */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identity</div>
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name or business name" className="mt-1" data-testid="affiliate-name-input" />
          </div>
          <div>
            <Label className="text-xs">Phone *</Label>
            <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+255 7XX XXX XXX" className="mt-1" data-testid="affiliate-phone-input" />
          </div>
          <div>
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="partner@email.com" className="mt-1" data-testid="affiliate-email-input" />
          </div>
          <div>
            <Label className="text-xs">Affiliate Code *</Label>
            <Input value={form.affiliate_code} onChange={(e) => update("affiliate_code", e.target.value.toUpperCase())} placeholder="e.g., PARTNER10" className="mt-1 font-mono" data-testid="affiliate-code-input" />
            <p className="text-[10px] text-slate-400 mt-1">Used in promo codes and tracking links</p>
          </div>

          {/* Section 2 — Payout Setup */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Payout Setup</div>
          <div>
            <Label className="text-xs">Payout Method</Label>
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden mt-1">
              {[{ key: "mobile_money", label: "Mobile Money" }, { key: "bank", label: "Bank Transfer" }].map((m) => (
                <button type="button" key={m.key} onClick={() => update("payout_method", m.key)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${form.payout_method === m.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`payout-${m.key}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {form.payout_method === "mobile_money" && (
            <>
              <div>
                <Label className="text-xs">Mobile Money Number</Label>
                <Input type="tel" value={form.mobile_money_number} onChange={(e) => update("mobile_money_number", e.target.value)} placeholder="07XX XXX XXX" className="mt-1" data-testid="mm-number-input" />
              </div>
              <div>
                <Label className="text-xs">Provider</Label>
                <Input value={form.mobile_money_provider} onChange={(e) => update("mobile_money_provider", e.target.value)} placeholder="e.g., M-Pesa, Tigo Pesa, Airtel Money" className="mt-1" data-testid="mm-provider-input" />
              </div>
            </>
          )}
          {form.payout_method === "bank" && (
            <>
              <div>
                <Label className="text-xs">Bank Name</Label>
                <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder="e.g., CRDB, NMB, Equity" className="mt-1" data-testid="bank-name-input" />
              </div>
              <div>
                <Label className="text-xs">Account Name</Label>
                <Input value={form.bank_account_name} onChange={(e) => update("bank_account_name", e.target.value)} placeholder="Account holder name" className="mt-1" data-testid="bank-acct-name-input" />
              </div>
              <div>
                <Label className="text-xs">Account Number</Label>
                <Input value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value)} placeholder="Account number" className="mt-1 font-mono" data-testid="bank-acct-num-input" />
              </div>
            </>
          )}

          {/* Commission info — read-only from settings */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Commission</div>
            <div className="text-xs text-slate-600">Automatically managed by system settings</div>
          </div>

          {/* Section 3 — Optional */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2">Optional</div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Internal notes..." className="mt-1 min-h-[60px]" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch checked={form.is_active} onCheckedChange={(c) => update("is_active", c)} />
            <span className="text-sm font-medium">Active</span>
          </label>
        </form>
      </StandardDrawerShell>
    </div>
  );
}
