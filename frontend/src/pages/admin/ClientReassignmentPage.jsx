import React, { useEffect, useState, useCallback } from "react";
import { Building2, User, Search, ArrowRight, Shield, Users, FileText, Database } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function ClientReassignmentPage() {
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getClientOwnershipStats();
      setStats(res.data);
    } catch {}
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const res = await adminApi.getReassignmentLog();
      setAuditLog(res.data?.entries || []);
    } catch {}
  }, []);

  const loadSalesUsers = useCallback(async () => {
    try {
      const res = await adminApi.getSalesTeamPerformance();
      setSalesUsers(res.data?.team || []);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); loadAudit(); loadSalesUsers(); }, [loadStats, loadAudit, loadSalesUsers]);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await adminApi.searchClients(searchQuery);
      setSearchResults(res.data?.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleSelect = async (result) => {
    // Get full detail
    try {
      if (result.type === "company") {
        const res = await adminApi.getCompanyDetail(result.id);
        setSelectedEntity({ ...res.data, type: "company" });
      } else if (result.type === "individual") {
        setSelectedEntity({ ...result, type: "individual" });
      } else {
        setSelectedEntity({ ...result, type: result.type });
      }
    } catch {
      setSelectedEntity(result);
    }
    setNewOwnerId("");
    setReason("");
  };

  const handleReassign = async () => {
    if (!selectedEntity || !newOwnerId) {
      toast.error("Select a new owner");
      return;
    }
    setReassigning(true);
    try {
      await adminApi.reassignClient({
        entity_type: selectedEntity.type,
        entity_id: selectedEntity.id,
        new_owner_id: newOwnerId,
        reason,
      });
      toast.success("Client reassigned successfully");
      setSelectedEntity(null);
      setSearchResults([]);
      setSearchQuery("");
      loadStats();
      loadAudit();
    } catch {
      toast.error("Reassignment failed");
    }
    setReassigning(false);
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  const typeIcon = (type) => type === "company" ? Building2 : User;
  const typeBadge = (type) => type === "company"
    ? "bg-blue-50 text-blue-700"
    : type === "individual"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-5" data-testid="client-reassignment-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Client Reassignment</h1>
        <p className="mt-0.5 text-sm text-slate-500">Search clients and companies, view current ownership, and reassign with reason.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="ownership-stats">
          <StatCard label="Companies" value={stats.total_companies} icon={Building2} />
          <StatCard label="Contacts" value={stats.total_contacts} icon={Users} />
          <StatCard label="Individuals" value={stats.total_individuals} icon={User} />
          <StatCard label="Reassignments" value={stats.total_reassignments} icon={ArrowRight} />
          <StatCard label="Unowned Co." value={stats.unowned_companies} icon={Building2} />
          <StatCard label="Unowned Ind." value={stats.unowned_individuals} icon={User} />
        </div>
      )}

      {/* Search + Reassign */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Search Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="search-panel">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search Clients</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, email, or domain..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400"
                  data-testid="client-search-input"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="rounded-xl bg-[#20364D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-50"
                data-testid="client-search-btn"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {/* Results */}
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="py-4 text-center text-sm text-slate-400">No results found</p>
              )}
              {searchResults.map((r) => {
                const Icon = typeIcon(r.type);
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 transition-colors ${selectedEntity?.id === r.id ? "bg-blue-50/50" : ""}`}
                    data-testid={`search-result-${r.id}`}
                  >
                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[#20364D] text-sm truncate">{r.name}</div>
                      <div className="text-xs text-slate-400 truncate">{r.detail}</div>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadge(r.type)}`}>
                      {r.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reassignment Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="reassignment-panel">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reassignment</h3>
          </div>
          <div className="p-5 space-y-4">
            {!selectedEntity ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <ArrowRight className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                Select a client from search results
              </div>
            ) : (
              <>
                {/* Selected entity details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4" data-testid="selected-entity">
                  <div className="flex items-center gap-3 mb-2">
                    {React.createElement(typeIcon(selectedEntity.type), { className: "h-5 w-5 text-slate-500" })}
                    <span className="font-semibold text-[#20364D]">{selectedEntity.name}</span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${typeBadge(selectedEntity.type)}`}>
                      {selectedEntity.type}
                    </span>
                  </div>
                  {selectedEntity.detail && <p className="text-xs text-slate-500">{selectedEntity.detail}</p>}
                  {selectedEntity.owner_name && (
                    <p className="text-xs text-slate-600 mt-1">Current owner: <strong>{selectedEntity.owner_name}</strong></p>
                  )}
                  {selectedEntity.owner_sales_id && !selectedEntity.owner_name && (
                    <p className="text-xs text-slate-600 mt-1">Current owner ID: {selectedEntity.owner_sales_id}</p>
                  )}
                  {selectedEntity.contacts && (
                    <p className="text-xs text-slate-400 mt-1">{selectedEntity.contacts.length} contacts</p>
                  )}
                </div>

                {/* New owner select */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">New Owner</label>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    data-testid="new-owner-select"
                  >
                    <option value="">Select sales rep...</option>
                    {salesUsers.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.name || s.email} — {s.performance_score}% ({s.performance_zone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for reassignment..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"
                    rows={3}
                    data-testid="reassignment-reason"
                  />
                </div>

                {/* Confirm */}
                <button
                  onClick={handleReassign}
                  disabled={reassigning || !newOwnerId}
                  className="w-full rounded-xl bg-[#20364D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-50 transition-colors"
                  data-testid="confirm-reassignment-btn"
                >
                  {reassigning ? "Reassigning..." : "Confirm Reassignment"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="reassignment-audit-log">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <Shield className="h-4 w-4 text-slate-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reassignment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Entity</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Previous</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">New</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reason</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">By</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLog.slice(0, 20).map((entry, i) => (
                  <tr key={i} className="hover:bg-slate-50/50" data-testid={`audit-row-${i}`}>
                    <td className="px-5 py-2.5">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${typeBadge(entry.entity_type)}`}>
                        {entry.entity_type}
                      </span>
                      <span className="ml-2 text-slate-700">{entry.entity_name}</span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{entry.previous_owner_name || "—"}</td>
                    <td className="px-5 py-2.5 font-medium text-[#20364D]">{entry.new_owner_name || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 max-w-[200px] truncate">{entry.reason || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{entry.changed_by_name}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-400">{fmtDate(entry.created_at)}</td>
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
