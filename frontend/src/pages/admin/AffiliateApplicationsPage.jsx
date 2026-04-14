import React, { useEffect, useState, useCallback } from "react";
import { Users, Loader2, Search, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AffiliateApplicationsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, statsRes] = await Promise.all([
        api.get(filter === "all" ? "/api/affiliate-applications" : `/api/affiliate-applications?status=${filter}`),
        api.get("/api/affiliate-applications/stats"),
      ]);
      setItems(appRes.data?.applications || []);
      setStats(statsRes.data || {});
    } catch { toast.error("Failed to load applications"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (item) => {
    setSelected(item);
    setAdminNotes(item.admin_notes || "");
  };

  const approve = async (id) => {
    try {
      const res = await api.post(`/api/affiliate-applications/${id}/approve`, { admin_notes: adminNotes });
      const msg = res.data?.temp_password
        ? `Approved! Temp password: ${res.data.temp_password} (share with affiliate)`
        : "Approved — affiliate created";
      toast.success(msg);
      setSelected(null);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to approve"); }
  };

  const reject = async (id) => {
    try {
      await api.post(`/api/affiliate-applications/${id}/reject`, { admin_notes: adminNotes });
      toast.success("Application rejected");
      setSelected(null);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to reject"); }
  };

  const filtered = items.filter((i) =>
    !search || [i.full_name, i.email, i.company_name].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const filters = ["all", "pending", "approved", "rejected"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="affiliate-applications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Affiliate Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and manage affiliate partner applications</p>
        </div>
        {stats.pending > 0 && <Badge className="bg-amber-100 text-amber-700" data-testid="pending-badge">{stats.pending} Pending</Badge>}
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="app-stats">
        <StatCard label="Pending" value={stats.pending || 0} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved || 0} color="text-emerald-600" />
        <StatCard label="Rejected" value={stats.rejected || 0} color="text-red-600" />
        <StatCard label="Active Affiliates" value={stats.active_affiliates || 0} color="text-blue-600" />
        <StatCard
          label="Slots"
          value={stats.max_affiliates > 0 ? `${stats.slots_remaining}/${stats.max_affiliates}` : "Unlimited"}
          color="text-slate-600"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="search-applications" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="applications-empty">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">{search ? "No matches" : "No applications yet"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="applications-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Applicant</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Business</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Region</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Applied</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => openDetail(item)} data-testid={`app-row-${item.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#20364D]">{item.full_name}</div>
                      <div className="text-[10px] text-slate-400">{item.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.phone || "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.company_name || "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.region || "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "\u2014"}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${STATUS_STYLES[item.status] || STATUS_STYLES.pending} capitalize hover:opacity-90`}>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}

      <StandardDrawerShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.full_name || "Application"}
        subtitle="Affiliate Application"
        badge={selected && <Badge className={`${STATUS_STYLES[selected.status] || STATUS_STYLES.pending} capitalize`}>{selected.status}</Badge>}
        testId="application-detail-drawer"
        footer={selected && selected.status === "pending" ? (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => reject(selected.id)} data-testid="drawer-reject-btn">
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(selected.id)} data-testid="drawer-approve-btn">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
            </Button>
          </div>
        ) : null}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-xs text-slate-500">Full Name</div><div className="text-sm font-medium text-[#20364D] mt-0.5">{selected.full_name}</div></div>
              <div><div className="text-xs text-slate-500">Email</div><div className="text-sm text-slate-600 mt-0.5">{selected.email}</div></div>
              <div><div className="text-xs text-slate-500">Phone</div><div className="text-sm text-slate-600 mt-0.5">{selected.phone || "\u2014"}</div></div>
              <div><div className="text-xs text-slate-500">Business</div><div className="text-sm text-slate-600 mt-0.5">{selected.company_name || "\u2014"}</div></div>
              <div><div className="text-xs text-slate-500">Region</div><div className="text-sm text-slate-600 mt-0.5">{selected.region || "\u2014"}</div></div>
              <div><div className="text-xs text-slate-500">Applied</div><div className="text-sm text-slate-600 mt-0.5">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "\u2014"}</div></div>
            </div>
            {selected.notes && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Notes from Applicant</div>
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.notes}</div>
              </div>
            )}
            {selected.reviewed_at && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Reviewed</div>
                <div className="text-sm text-slate-600">{new Date(selected.reviewed_at).toLocaleString()}</div>
              </div>
            )}
            {selected.status === "pending" && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Admin Notes</div>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for this application (visible internally)"
                  className="min-h-[60px]"
                  data-testid="admin-notes-input"
                />
              </div>
            )}
            {selected.status === "approved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-sm text-emerald-700 font-medium">Approved \u2014 Affiliate created</div>
                {selected.admin_notes && <div className="text-xs text-emerald-600 mt-1">{selected.admin_notes}</div>}
              </div>
            )}
            {selected.status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-700">Rejected</div>
                {selected.admin_notes && <div className="text-xs text-red-600 mt-1">{selected.admin_notes}</div>}
              </div>
            )}
          </div>
        )}
      </StandardDrawerShell>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border rounded-xl p-3 text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
