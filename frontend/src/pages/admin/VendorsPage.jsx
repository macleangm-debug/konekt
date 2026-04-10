import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Truck, Package, ToggleLeft, ToggleRight } from "lucide-react";

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

export default function VendorsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getVendorsList({ search: search || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getVendorDetail(row.id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const handleToggleStatus = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.toggleVendorStatus(selected.id);
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="vendors-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Vendors</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage vendor partners, their capabilities, and order assignments.</p>
      </div>

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="vendors-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Capability</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Active Orders</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right hidden md:table-cell">Released</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`vendor-row-${row.id || idx}`}>
                    <td className="px-4 py-3"><p className="font-semibold text-[#20364D]">{row.company_name || row.name || "-"}</p><p className="text-xs text-slate-500">{row.email || ""}</p></td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{(row.capabilities || []).join(", ") || row.category || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{row.active_orders || 0}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{row.released_jobs || 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status || "active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Truck} title="No vendors found" description="Vendor partners will appear here once registered." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Vendor Detail" subtitle={selected?.company_name || selected?.name}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Vendor</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.vendor?.company_name || detail.vendor?.name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{detail.vendor?.email || ""}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={detail.vendor?.status || "active"} />
              </div>
            </div>
            {detail.orders && detail.orders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Vendor Orders ({detail.orders.length})</p>
                <div className="space-y-2">
                  {detail.orders.map((o, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-[#20364D]">{o.order_id?.slice(0,12) || "Order"}</span>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200">
              <button onClick={handleToggleStatus} disabled={actionLoading} data-testid="toggle-vendor-status-btn"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {detail.vendor?.status === "active" ? <><ToggleLeft size={16} /> Deactivate Vendor</> : <><ToggleRight size={16} /> Activate Vendor</>}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Could not load vendor details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
