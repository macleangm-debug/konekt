import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { ShoppingCart, Truck, CheckCircle, Clock, Package, Users } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const TABS = [
  { key: "", label: "All Orders", icon: ShoppingCart },
  { key: "awaiting_release", label: "Awaiting Release", icon: Clock },
  { key: "released", label: "Released", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getOrders({ search: search || undefined, tab: tab || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getOrderDetail(row.id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const handleRelease = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.releaseToVendor(selected.id, { released_by: "admin" });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.updateOrderStatus(selected.id, { status: newStatus });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="orders-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Orders</h1>
        <p className="text-slate-500 mt-1 text-sm">Track orders from creation through fulfillment. Release to vendors when ready.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="order-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            data-testid={`tab-${t.key || "all"}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="orders-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fulfillment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Assigned Sales</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Assigned Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...rows].sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0)).map((row) => (
                  <tr key={row.id} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`order-row-${row.id}`}>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(row.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.order_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customer_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.source_type || row.type || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(row.total_amount || row.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.payment_status || row.payment_state || "paid"} /></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status || row.fulfillment_state} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.sales_owner || "Unassigned"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">{row.vendor_name || row.vendor_count || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ShoppingCart} title="No orders found" description="Orders are created automatically when payment proofs are approved." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Order Detail" subtitle={selected?.order_number}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.order?.customer_name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{detail.order?.customer_email || ""}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-semibold text-[#20364D] text-lg mt-1">{money(detail.order?.total_amount || detail.order?.total)}</p>
                <div className="mt-1 flex gap-2">
                  <StatusBadge status={detail.order?.status} />
                  <StatusBadge status={detail.order?.release_state || "awaiting"} />
                </div>
              </div>
            </div>

            {/* Sales assignment */}
            {detail.sales_assignment && (
              <div className="rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <Users size={18} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Sales Owner</p>
                  <p className="text-sm font-semibold text-[#20364D]">{detail.sales_assignment.sales_owner_name || "Unassigned"}</p>
                </div>
              </div>
            )}

            {/* Items */}
            {detail.order?.items && detail.order.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items ({detail.order.items.length})</p>
                <div className="space-y-1.5">
                  {detail.order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-700">{item.name || item.product_name || "Item"} x{item.quantity || 1}</span>
                      <span className="font-medium text-[#20364D]">{money(item.line_total || item.total || item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor orders */}
            {detail.vendor_orders && detail.vendor_orders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vendor Orders ({detail.vendor_orders.length})</p>
                <div className="space-y-2">
                  {detail.vendor_orders.map((vo, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-[#20364D]">{vo.vendor_name || vo.vendor_id || "Vendor"}</p>
                          <p className="text-xs text-slate-500">{vo.items?.length || 0} items &middot; {money(vo.total_amount || vo.total)}</p>
                        </div>
                        <StatusBadge status={vo.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events timeline */}
            {detail.events && detail.events.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Events</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {detail.events.map((ev, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <span className="text-slate-400 whitespace-nowrap">{fmtDate(ev.created_at)}</span>
                      <span className="text-slate-700">{(ev.event || "").replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commissions */}
            {detail.commissions && detail.commissions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Commissions ({detail.commissions.length})</p>
                <div className="space-y-2">
                  {detail.commissions.map((c, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[#20364D]">{c.recipient_name || c.type || "Commission"}</p>
                        <p className="text-xs text-slate-500">{c.type || ""} &middot; {c.status || ""}</p>
                      </div>
                      <span className="font-semibold text-green-700 text-sm">{money(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {(detail.order?.release_state === "awaiting" || !detail.order?.release_state) && detail.order?.status !== "cancelled" && (
                <button onClick={handleRelease} disabled={actionLoading} data-testid="release-to-vendor-btn"
                  className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2d4a66] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Truck size={16} /> {actionLoading ? "Processing..." : "Release to Vendor"}
                </button>
              )}
              <div className="grid grid-cols-3 gap-2">
                {["processing", "shipped", "completed"].map((s) => (
                  <button key={s} onClick={() => handleStatusUpdate(s)} disabled={actionLoading || detail.order?.status === s}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold capitalize text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                    data-testid={`status-btn-${s}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Could not load details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
