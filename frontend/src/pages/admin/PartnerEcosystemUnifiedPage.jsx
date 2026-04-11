import React, { useEffect, useState, useCallback } from "react";
import {
  Network, Users, Loader2, Search, Globe, Tag, AlertTriangle,
  CheckCircle, XCircle, Star, MapPin,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";

const TYPE_COLORS = {
  distributor: "bg-blue-100 text-blue-700",
  service: "bg-purple-100 text-purple-700",
  service_partner: "bg-purple-100 text-purple-700",
  product: "bg-amber-100 text-amber-700",
  hybrid: "bg-emerald-100 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  suspended: "bg-red-100 text-red-700",
};

export default function PartnerEcosystemUnifiedPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/partner-ecosystem/summary");
      setData(res.data);
    } catch { toast.error("Failed to load ecosystem data"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis || {};
  const coverage = data?.coverage || {};
  const partners = data?.partners || [];
  const types = ["all", ...new Set(partners.map((p) => p.partner_type))];

  const filtered = partners.filter((p) => {
    if (typeFilter !== "all" && p.partner_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [p.name, p.email, p.contact_person, ...p.regions, ...p.categories].some((f) => (f || "").toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="partner-ecosystem-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Partner Ecosystem</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage partners, coverage, and operational gaps</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3" data-testid="ecosystem-kpis">
            <KpiCard label="Total Partners" value={kpis.total_partners || 0} icon={Network} />
            <KpiCard label="Active" value={kpis.active_partners || 0} icon={CheckCircle} />
            <KpiCard label="Inactive" value={kpis.inactive_partners || 0} icon={XCircle} severity={kpis.inactive_partners > 5 ? "warning" : ""} />
            <KpiCard label="Preferred" value={kpis.preferred_partners || 0} icon={Star} />
            <KpiCard label="Affiliates" value={kpis.affiliates || 0} icon={Users} />
            <KpiCard label="Pending Apps" value={kpis.pending_applications || 0} icon={AlertTriangle} severity={kpis.pending_applications > 0 ? "warning" : ""} />
            <KpiCard label="Types" value={Object.keys(kpis.by_type || {}).length} icon={Tag} />
          </div>

          {/* Coverage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                <MapPin className="w-3.5 h-3.5" /> Regions Served ({coverage.regions_served?.length || 0})
              </div>
              {coverage.regions_served?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {coverage.regions_served.map((r) => (
                    <span key={r} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No region coverage assigned to active partners</p>
              )}
              {coverage.partners_without_region > 0 && (
                <p className="text-[10px] text-amber-600 mt-2">
                  {coverage.partners_without_region} active partner{coverage.partners_without_region !== 1 ? "s" : ""} without region assignment
                </p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                <Tag className="w-3.5 h-3.5" /> Categories Covered ({coverage.categories_covered?.length || 0})
              </div>
              {coverage.categories_covered?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {coverage.categories_covered.map((c) => (
                    <span key={c} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No category coverage assigned to active partners</p>
              )}
              {coverage.partners_without_category > 0 && (
                <p className="text-[10px] text-amber-600 mt-2">
                  {coverage.partners_without_category} active partner{coverage.partners_without_category !== 1 ? "s" : ""} without category assignment
                </p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {types.map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${typeFilter === t ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`type-${t}`}>
                  {t === "all" ? `All (${partners.length})` : `${t.replace("_", " ")} (${partners.filter((p) => p.partner_type === t).length})`}
                </button>
              ))}
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="search-partners" />
            </div>
          </div>

          {/* Partner Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="partners-empty">
              <Network className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-500">{search ? "No matches" : "No partners yet"}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="partners-table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Partner</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Regions</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Categories</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(p)} data-testid={`partner-row-${i}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.preferred && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                            <div>
                              <div className="font-medium text-[#20364D]">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={`text-[10px] capitalize ${TYPE_COLORS[p.partner_type] || TYPE_COLORS.other}`}>
                            {(p.partner_type || "other").replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 max-w-[150px] truncate">
                          {p.regions?.length > 0 ? p.regions.join(", ") : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 max-w-[150px] truncate capitalize">
                          {p.categories?.length > 0 ? p.categories.join(", ") : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`text-[10px] capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.inactive}`}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{p.contact_person || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
                {filtered.length} partner{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      <StandardDrawerShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || "Partner Details"}
        subtitle={selected?.partner_type?.replace("_", " ") || ""}
        badge={selected && <Badge className={`${STATUS_COLORS[selected.status] || STATUS_COLORS.inactive} capitalize`}>{selected.status}</Badge>}
        testId="partner-detail-drawer"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-xs text-slate-500">Contact Person</div><div className="text-sm font-medium text-[#20364D] mt-0.5">{selected.contact_person || "—"}</div></div>
              <div><div className="text-xs text-slate-500">Email</div><div className="text-sm text-slate-600 mt-0.5">{selected.email || "—"}</div></div>
              <div><div className="text-xs text-slate-500">Phone</div><div className="text-sm text-slate-600 mt-0.5">{selected.phone || "—"}</div></div>
              <div><div className="text-xs text-slate-500">Coverage Mode</div><div className="text-sm text-slate-600 mt-0.5 capitalize">{selected.coverage_mode || "—"}</div></div>
              <div><div className="text-xs text-slate-500">Fulfillment</div><div className="text-sm text-slate-600 mt-0.5 capitalize">{(selected.fulfillment_type || "—").replace("_", " ")}</div></div>
              <div><div className="text-xs text-slate-500">Lead Time</div><div className="text-sm text-slate-600 mt-0.5">{selected.lead_time_days ? `${selected.lead_time_days} days` : "—"}</div></div>
            </div>

            {selected.regions?.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1.5">Regions</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.regions.map((r) => (
                    <span key={r} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.categories?.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1.5">Categories</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.categories.map((c) => (
                    <span key={c} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.preferred && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="text-sm font-medium">Preferred Partner</span>
              </div>
            )}

            {selected.notes && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Notes</div>
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.notes}</div>
              </div>
            )}
          </div>
        )}
      </StandardDrawerShell>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, severity }) {
  const borderColor = severity === "warning" ? "border-amber-300" : "border-slate-200";
  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-lg font-bold ${severity === "warning" ? "text-amber-600" : "text-[#20364D]"}`}>{value}</div>
    </div>
  );
}
