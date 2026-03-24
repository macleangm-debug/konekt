import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import TableCardToggle from "../common/TableCardToggle";
import { Package, Clock, ChevronRight, User, Truck } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_COLORS = {
  processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  pending_payment: "bg-amber-100 text-amber-800",
  ready_to_fulfill: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

function StatusBadge({ status }) {
  const label = (status || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const cls = STATUS_COLORS[status] || "bg-slate-100 text-slate-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export default function AdminOrdersSplitViewV2() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/admin/orders");
        setOrders(res.data?.orders || []);
        if (res.data?.orders?.length > 0) setSelected(res.data.orders[0]);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid xl:grid-cols-[420px_1fr] gap-6"><div className="h-96 bg-slate-100 rounded-[2rem]" /><div className="h-96 bg-slate-100 rounded-[2rem]" /></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6" data-testid="admin-orders-empty">
        <h1 className="text-4xl font-bold text-[#20364D]">Orders</h1>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-[#20364D] mt-4">No orders yet</h2>
          <p className="text-slate-500 mt-2">Orders appear here after finance approves payment proofs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-orders-split-view">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-[#20364D]">Orders</h1>
        <TableCardToggle view={view} setView={setView} />
      </div>

      {view === "table" ? (
        <div className="grid xl:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {orders.map((order) => (
                <button
                  key={order.id}
                  data-testid={`admin-order-row-${order.id}`}
                  onClick={() => setSelected(order)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === order.id ? "bg-[#20364D]/5 border-l-2 border-[#20364D]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#20364D] text-sm">{order.order_number || order.id?.slice(-8)}</p>
                    <StatusBadge status={order.current_status || order.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {order.customer?.full_name || order.customer_id || "Customer"} &middot; {money(order.total_amount || order.total)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="admin-order-detail">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D]">{selected.order_number || selected.id}</h2>
                  <StatusBadge status={selected.current_status || selected.status} />
                </div>
                <p className="text-2xl font-bold text-[#20364D]">{money(selected.total_amount || selected.total)}</p>
              </div>

              {selected.customer && (
                <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
                  <User size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#20364D]">{selected.customer.full_name || "Customer"}</p>
                    <p className="text-xs text-slate-500">{selected.customer.email} &middot; {selected.customer.phone || ""}</p>
                  </div>
                </div>
              )}

              {selected.delivery && (
                <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
                  <Truck size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#20364D]">{selected.delivery.recipient_name || "Delivery"}</p>
                    <p className="text-xs text-slate-500">{selected.delivery.address_line || ""}, {selected.delivery.city || ""}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Items</p>
                {(selected.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                    <div>
                      <p className="font-medium text-[#20364D]">{item.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} &times; {money(item.unit_price || item.price)}</p>
                    </div>
                    <p className="font-semibold text-[#20364D]">{money(item.line_total)}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(selected.subtotal_amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{money(selected.vat_amount)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{money(selected.total_amount || selected.total)}</span></div>
              </div>

              <p className="text-xs text-slate-400">Created: {selected.created_at?.slice(0, 10)}</p>
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
                <p className="font-bold text-[#20364D]">{order.order_number || order.id?.slice(-8)}</p>
                <StatusBadge status={order.current_status || order.status} />
              </div>
              <p className="text-sm text-slate-600">{order.customer?.full_name || "Customer"}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-[#20364D]">{money(order.total_amount || order.total)}</p>
                <p className="text-xs text-slate-400">{order.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
