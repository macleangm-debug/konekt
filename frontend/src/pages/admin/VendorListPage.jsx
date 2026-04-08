import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import FilterBar from "@/components/admin/shared/FilterBar";
import EmptyState from "@/components/admin/shared/EmptyState";
import PerformanceCell from "@/components/performance/PerformanceCell";
import PerformanceBreakdownDrawer from "@/components/performance/PerformanceBreakdownDrawer";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";
import {
  Users, UserCheck, UserX, Package, Star, Building2,
  Search, Plus, X, Truck, Clock,
} from "lucide-react";
import PhoneNumberField from "@/components/forms/PhoneNumberField";

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

const CAP_LABELS = {
  products: "Products",
  promotional_materials: "Promo",
  services: "Services",
  multi: "Multi",
};

function StatCard({ label, value, icon: Icon, accent, onClick, active }) {
  const colors = {
    slate: { border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-600" },
    emerald: { border: "border-emerald-200", iconBg: "bg-emerald-100", text: "text-emerald-700" },
    red: { border: "border-red-200", iconBg: "bg-red-100", text: "text-red-700" },
    blue: { border: "border-blue-200", iconBg: "bg-blue-100", text: "text-blue-700" },
    amber: { border: "border-amber-200", iconBg: "bg-amber-100", text: "text-amber-700" },
    violet: { border: "border-violet-200", iconBg: "bg-violet-100", text: "text-violet-700" },
  };
  const c = colors[accent] || colors.slate;
  return (
    <button
      onClick={onClick}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${c.border} ${active ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value ?? 0}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </button>
  );
}

export default function VendorListPage() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [perfMap, setPerfMap] = useState({});
  const [perfDrawer, setPerfDrawer] = useState(null);

  // Create form
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", company: "", capability_type: "products" });

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getVendors({ capability: capFilter || undefined })
      .then(r => setVendors(r.data || []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [capFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { adminApi.getVendorStats().then(r => setStats(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    adminApi.getVendorTeamPerformance()
      .then(r => {
        const map = {};
        (r.data?.team || []).forEach(v => {
          if (v.vendor_id) map[v.vendor_id] = v;
          if (v.email) map[v.email] = v;
        });
        setPerfMap(map);
      })
      .catch(() => {});
  }, []);

  const openDrawer = async (vendor) => {
    setSelected(vendor);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getVendorDetail(vendor.id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const openPerfDrawer = async (vendorId) => {
    try {
      const res = await adminApi.getVendorPerformanceDetail(vendorId);
      setPerfDrawer(res.data);
    } catch { setPerfDrawer(null); }
  };

  const handleCreate = async () => {
    try {
      await adminApi.createVendor(newVendor);
      setNewVendor({ name: "", email: "", phone: "", company: "", capability_type: "products" });
      setShowCreate(false);
      load();
      adminApi.getVendorStats().then(r => setStats(r.data)).catch(() => {});
    } catch {}
  };

  const filtered = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.name || "").toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q) || (v.company || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4" data-testid="vendor-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Vendors</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage vendor profiles, capabilities, and supply records.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          data-testid="create-vendor-btn"
          className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a4560] transition-colors"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Close" : "Add Vendor"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="vendor-stats">
          <StatCard label="Total" value={stats.total} icon={Users} accent="slate" onClick={() => setCapFilter("")} active={!capFilter} />
          <StatCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" onClick={() => setCapFilter("")} active={false} />
          <StatCard label="Inactive" value={stats.inactive} icon={UserX} accent="red" onClick={() => setCapFilter("")} active={false} />
          <StatCard label="Products" value={stats.products} icon={Package} accent="blue" onClick={() => setCapFilter("products")} active={capFilter === "products"} />
          <StatCard label="Services" value={stats.services} icon={Building2} accent="violet" onClick={() => setCapFilter("services")} active={capFilter === "services"} />
          <StatCard label="Promo" value={stats.promotional_materials} icon={Star} accent="amber" onClick={() => setCapFilter("promotional_materials")} active={capFilter === "promotional_materials"} />
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="vendor-create-form">
          <h3 className="text-base font-bold text-[#20364D] mb-4">New Vendor</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <input placeholder="Vendor Name *" value={newVendor.name} onChange={e => setNewVendor(p => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" data-testid="vendor-name-input" />
            <input placeholder="Email" value={newVendor.email} onChange={e => setNewVendor(p => ({ ...p, email: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            <PhoneNumberField
              label=""
              prefix={newVendor.phone_prefix || "+255"}
              number={newVendor.phone}
              onPrefixChange={v => setNewVendor(p => ({ ...p, phone_prefix: v }))}
              onNumberChange={v => setNewVendor(p => ({ ...p, phone: v }))}
              testIdPrefix="vendor-phone"
            />
            <input placeholder="Company" value={newVendor.company} onChange={e => setNewVendor(p => ({ ...p, company: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            <select value={newVendor.capability_type} onChange={e => setNewVendor(p => ({ ...p, capability_type: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none">
              <option value="products">Products</option>
              <option value="promotional_materials">Promo Materials</option>
              <option value="services">Services</option>
              <option value="multi">Multi</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={!newVendor.name} className="mt-4 rounded-lg bg-[#20364D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40 transition-colors" data-testid="save-vendor-btn">
            Create Vendor
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={search} onSearchChange={setSearch} />

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="vendors-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vendor</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Capability</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Performance</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Taxonomy</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Supply</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Updated</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">Loading vendors...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-0"><EmptyState icon={Users} title="No vendors found" subtitle="Add vendors to manage supply and capabilities." /></td></tr>
              ) : filtered.map((v) => {
                const vPerf = perfMap[v.id] || perfMap[v.email];
                return (
                <tr key={v.id} className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected?.id === v.id ? "bg-blue-50/50" : ""}`} onClick={() => openDrawer(v)} data-testid={`vendor-row-${v.id}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[#20364D]">{v.name}</div>
                    <div className="text-xs text-slate-400">{v.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{v.company || "-"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.capability_type === "products" ? "bg-blue-50 text-blue-700" : v.capability_type === "services" ? "bg-violet-50 text-violet-700" : v.capability_type === "promotional_materials" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {CAP_LABELS[v.capability_type] || v.capability_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    {vPerf ? (
                      <PerformanceCell
                        score={vPerf.performance_score}
                        zone={vPerf.performance_zone}
                        onClick={() => openPerfDrawer(vPerf.vendor_id)}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 hidden lg:table-cell max-w-[200px] truncate">
                    {v.taxonomy_names?.join(", ") || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-center text-sm font-medium text-slate-700">{v.supply_records || 0}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 hidden md:table-cell">{fmtDate(v.updated_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Detail Drawer */}
      <StandardDrawerShell
        open={!!selected}
        onClose={() => { setSelected(null); setDetail(null); }}
        title={detail?.name || selected?.name || "Vendor"}
        subtitle="Vendor Profile"
        badge={detail ? <StatusBadge status={detail.status} /> : null}
        width="lg"
        testId="vendor-drawer"
      >
        {loadingDetail ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
        ) : detail ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-500">{detail.email} {detail.company && `| ${detail.company}`}</p>
            </div>
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Capability", CAP_LABELS[detail.capability_type] || detail.capability_type],
                  ["Phone", detail.phone],
                  ["Taxonomy", detail.taxonomy_names?.map(t => typeof t === "string" ? t : t.name).join(", ") || "-"],
                  ["Created", fmtDate(detail.created_at)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3">
                    <dt className="text-slate-400 text-xs">{l}</dt>
                    <dd className="text-right font-medium text-[#20364D] text-xs truncate max-w-[200px]">{v || "-"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supply Records ({detail.supply_records?.length || 0})</h3>
              {detail.supply_records?.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {detail.supply_records.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs p-2 rounded-lg bg-slate-50">
                      <span className="font-medium text-[#20364D]">{s.product_id?.slice(0, 8) || "-"}</span>
                      <span>TZS {Number(s.base_price_vat_inclusive || 0).toLocaleString()}</span>
                      <span>Qty: {s.quantity}</span>
                      <span>{s.lead_time_days}d</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">No supply records yet.</p>
              )}
            </section>

            {detail.notes && (
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</h3>
                <p className="mt-2 text-sm text-slate-700">{detail.notes}</p>
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400">Vendor not found.</div>
        )}
      </StandardDrawerShell>
      {/* Performance Breakdown Drawer */}
      <PerformanceBreakdownDrawer
        open={!!perfDrawer}
        onClose={() => setPerfDrawer(null)}
        data={perfDrawer}
      />
    </div>
  );
}
