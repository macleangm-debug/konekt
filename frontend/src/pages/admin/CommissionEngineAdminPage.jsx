import React, { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, Clock, CheckCircle2, Users, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function CommissionEngineAdminPage() {
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        api.get("/api/admin/finance/commissions").catch(() => ({ data: { commissions: [] } })),
        api.get("/api/admin/finance/commission-stats").catch(() => ({ data: {} })),
      ]);
      setCommissions(cRes.data?.commissions || []);
      setStats(sRes.data || {});
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = commissions.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && ![c.beneficiary_name, c.source_type, c.order_ref].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="space-y-5" data-testid="commission-engine-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Commission Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sales and affiliate commission tracking</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="commission-kpi">
        {[
          { label: "Total Earned", value: money(stats.total_earned || 0), color: "text-blue-600 border-blue-200", icon: DollarSign },
          { label: "Pending", value: money(stats.pending_amount || 0), color: "text-amber-600 border-amber-200", icon: Clock },
          { label: "Paid Out", value: money(stats.paid_amount || 0), color: "text-emerald-600 border-emerald-200", icon: CheckCircle2 },
          { label: "Beneficiaries", value: stats.beneficiary_count || 0, color: "text-purple-600 border-purple-200", icon: Users },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`bg-white rounded-xl border ${k.color} p-3`} data-testid={`kpi-${k.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /><span className="text-[10px] font-semibold text-slate-500 uppercase">{k.label}</span></div>
              <p className={`text-xl font-bold ${k.color.split(" ")[0]}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {["all", "pending", "approved", "paid"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold capitalize transition ${filter === f ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="commissions-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Beneficiary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Source</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400"><DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-200" />No commissions found</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id || i} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`commission-row-${i}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#20364D]">{c.beneficiary_name || c.beneficiary_user_id || "\u2014"}</div>
                      <div className="text-[10px] text-slate-400">{c.beneficiary_role || ""}</div>
                    </td>
                    <td className="px-4 py-3"><Badge className="text-[10px] bg-slate-100 text-slate-600 capitalize">{c.commission_type || c.source_type || "standard"}</Badge></td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#20364D]">{money(c.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.order_ref || c.source_ref || c.order_id?.slice(0, 8) || "\u2014"}</td>
                    <td className="px-4 py-3 text-center"><Badge className={`${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-500"} capitalize text-[10px]`}>{c.status || "pending"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} commission{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}
