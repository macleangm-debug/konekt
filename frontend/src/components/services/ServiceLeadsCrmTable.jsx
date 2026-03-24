import React, { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Search, Users } from "lucide-react";

const STATUSES = ["new", "contacted", "qualified", "quoted", "awaiting_approval", "won", "lost"];
const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-cyan-100 text-cyan-800",
  qualified: "bg-indigo-100 text-indigo-800",
  quoted: "bg-amber-100 text-amber-800",
  awaiting_approval: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-700",
};

function fmtDate(d) { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } }

export default function ServiceLeadsCrmTable() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin-flow-fixes/sales/service-leads?q=${encodeURIComponent(search)}`);
      setRows(res.data || []);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (lead, newStatus) => {
    try {
      if (lead.source === "leads") {
        await api.post("/api/admin-flow-fixes/leads/update-status", { lead_id: lead.id, status: newStatus });
      }
      setRows((prev) => prev.map((r) => r.id === lead.id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100 rounded-xl w-64" /><div className="h-64 bg-slate-100 rounded-[2rem]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="service-leads-crm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Service Leads</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage service and promotional customization leads. Change status as you progress through the CRM pipeline.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..."
            className="border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-[220px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Users size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No leads yet</h2>
          <p className="text-slate-500 mt-2">Service requests and promo customization quotes appear here.</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="leads-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors" data-testid={`lead-row-${row.id}`}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{row.customer_name}</td>
                    <td className="px-4 py-3 text-[#20364D]">{row.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.lead_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        data-testid={`lead-status-${row.id}`}
                        value={row.status}
                        onChange={(e) => updateStatus(row, e.target.value)}
                        className={`border-0 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${STATUS_COLORS[row.status] || "bg-slate-100"}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                      </select>
                    </td>
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
