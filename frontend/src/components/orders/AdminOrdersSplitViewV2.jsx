import React, { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import TableCardToggle from "../common/TableCardToggle";
import { Package, Search, User, Truck, Clock } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } }

const STATUS_COLORS = {
  processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  pending_payment: "bg-amber-100 text-amber-800",
  ready_to_fulfill: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
};

function StatusBadge({ status }) {
  const label = (status || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-slate-100 text-slate-700"}`}>{label}</span>;
}

export default function AdminOrdersSplitViewV2() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin-flow-fixes/admin/orders-split?q=${encodeURIComponent(search)}`);
      const items = res.data || [];
      setOrders(items);
      if (items.length > 0 && !selected) setSelected(items[0]);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100 rounded-xl w-48" /><div className="h-96 bg-slate-100 rounded-[2rem]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-orders-split-view">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#20364D]">Orders</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..." data-testid="orders-search"
              className="border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-[220px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" />
          </div>
          <TableCardToggle view={view} setView={setView} />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No orders yet</h2>
          <p className="text-slate-500 mt-2">Orders appear after finance approves payment proofs.</p>
        </div>
      ) : view === "table" ? (
        <div className="grid xl:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {orders.map((order) => (
                <button key={order.id} data-testid={`admin-order-row-${order.id}`}
                  onClick={() => setSelected(order)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === order.id ? "bg-[#20364D]/5 border-l-2 border-[#20364D]" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#20364D] text-sm">{order.order_number}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{order.customer_name} &middot; {money(order.total_amount)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(order.created_at)}</p>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="admin-order-detail">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D]">{selected.order_number}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-2xl font-bold text-[#20364D]">{money(selected.total_amount)}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
                <User size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-[#20364D]">{selected.customer_name}</p>
                  <p className="text-xs text-slate-500">Invoice: {selected.invoice_number || "—"}</p>
                </div>
              </div>

              {selected.delivery && Object.keys(selected.delivery).length > 0 && (
                <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
                  <Truck size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#20364D]">{selected.delivery.recipient_name || "Delivery"}</p>
                    <p className="text-xs text-slate-500">{[selected.delivery.address_line, selected.delivery.city].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                </div>
              )}

              {(selected.items || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Items</p>
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <div>
                        <p className="font-medium text-[#20364D]">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} &times; {money(item.unit_price)}</p>
                      </div>
                      <p className="font-semibold text-[#20364D]">{money(item.line_total)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} /> Payment: {selected.payment_status || "—"} &middot; Created: {fmtDate(selected.created_at)}
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400">
              Select an order to view details
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#20364D]">{order.order_number}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-slate-600">{order.customer_name}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-[#20364D]">{money(order.total_amount)}</p>
                <p className="text-xs text-slate-400">{fmtDate(order.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
