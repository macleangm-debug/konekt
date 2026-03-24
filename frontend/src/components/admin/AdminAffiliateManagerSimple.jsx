import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Users, Plus, Search } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function AdminAffiliateManagerSimple() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", promo_code: "" });
  const [creating, setCreating] = useState(false);

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
      await api.post("/api/referral-commission/affiliate/create", form);
      setForm({ name: "", email: "", phone: "", promo_code: "" });
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
          <h1 className="text-2xl font-bold text-[#20364D]">Affiliate Manager</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage affiliate codes, track performance, and monitor commissions.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} data-testid="create-affiliate-btn"
          className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition-colors">
          <Plus size={16} /> New Affiliate
        </button>
      </div>

      {showCreate && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4" data-testid="create-affiliate-form">
          <h2 className="text-lg font-bold text-[#20364D]">Create Affiliate</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="affiliate-name-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Promo Code (e.g., BRAND10)" value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} data-testid="affiliate-code-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="affiliate-email-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="affiliate-phone-input" />
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
    </div>
  );
}
