import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import TableCardToggle from "../common/TableCardToggle";
import { Package, Clock, ChevronRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_COLORS = {
  "Unpaid": "bg-amber-100 text-amber-800",
  "Payment Under Review": "bg-blue-100 text-blue-800",
  "Paid": "bg-green-100 text-green-800",
  "Processing": "bg-indigo-100 text-indigo-800",
  "Ready to Fulfill": "bg-purple-100 text-purple-800",
  "Awaiting Your Approval": "bg-orange-100 text-orange-800",
};

function StatusBadge({ label }) {
  const cls = STATUS_COLORS[label] || "bg-slate-100 text-slate-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function OrdersSplitView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("table");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await api.get(`/api/commercial-flow/orders/split-view?customer_id=${user.id}`);
        setOrders(res.data || []);
        if (res.data?.length > 0) setSelected(res.data[0]);
      } catch {}
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid xl:grid-cols-[380px_1fr] gap-6">
          <div className="h-64 bg-slate-100 rounded-[2rem]" />
          <div className="h-64 bg-slate-100 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6" data-testid="orders-empty-state">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#20364D]">My Orders</h1>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-[#20364D] mt-4">No orders yet</h2>
          <p className="text-slate-600 mt-2">Your product orders will appear here once you complete checkout.</p>
          <Link to="/account/marketplace" className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orders-split-view">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-[#20364D]">My Orders</h1>
        <TableCardToggle view={view} setView={setView} />
      </div>

      {view === "table" ? (
        <div className="grid xl:grid-cols-[380px_1fr] gap-6">
          {/* Orders List */}
          <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {orders.map((order) => (
                <button
                  key={order.id}
                  data-testid={`order-row-${order.id}`}
                  onClick={() => setSelected(order)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === order.id ? "bg-[#20364D]/5 border-l-2 border-[#20364D]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#20364D] text-sm">{order.order_number}</p>
                    <StatusBadge label={order.preview?.status_label || order.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""} &middot; {money(order.total_amount)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Order Detail Preview */}
          {selected ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="order-detail-preview">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D]">{selected.order_number}</h2>
                  <StatusBadge label={selected.preview?.status_label || selected.status} />
                </div>
                <p className="text-2xl font-bold text-[#20364D]">{money(selected.total_amount)}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-500">Items</h3>
                {(selected.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#20364D]">{item.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} &times; {money(item.unit_price)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#20364D]">{money(item.line_total)}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(selected.subtotal_amount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">VAT (18%)</span><span className="font-medium">{money(selected.vat_amount)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-1"><span>Total</span><span>{money(selected.total_amount)}</span></div>
              </div>

              {(selected.preview?.events || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-500">Timeline</h3>
                  {selected.preview.events.map((evt, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span className="text-[#20364D] capitalize">{evt.event?.replace(/_/g, " ")}</span>
                      <span className="text-xs text-slate-400 ml-auto">{evt.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400">
              Select an order to view details
            </div>
          )}
        </div>
      ) : (
        /* Card View */
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:shadow-md transition-shadow" data-testid={`order-card-${order.id}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#20364D]">{order.order_number}</p>
                <StatusBadge label={order.preview?.status_label || order.status} />
              </div>
              <p className="text-sm text-slate-600">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-[#20364D]">{money(order.total_amount)}</p>
                <Link to={`/account/orders/${order.id}`} className="text-sm text-[#20364D] font-semibold flex items-center gap-1 hover:underline">
                  View <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
