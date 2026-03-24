import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Package, Clock, Search, ChevronRight, Truck, CheckCircle, X, CreditCard } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_CONFIG = {
  created:    { label: "Created",    color: "bg-blue-100 text-blue-800",   icon: Package },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-800", icon: Clock },
  shipped:    { label: "Shipped",    color: "bg-indigo-100 text-indigo-800", icon: Truck },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-700",    icon: X },
  pending:    { label: "Pending",    color: "bg-slate-100 text-slate-600", icon: Clock },
};

const PAYMENT_CONFIG = {
  paid:            { label: "Paid",            color: "bg-green-100 text-green-800" },
  partially_paid:  { label: "Partially Paid",  color: "bg-orange-100 text-orange-800" },
  pending:         { label: "Pending",         color: "bg-amber-100 text-amber-800" },
};

function StatusBadge({ status, config = STATUS_CONFIG }) {
  const cfg = config[status] || { label: (status || "").replace(/_/g, " "), color: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>;
}

export default function OrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(order => {
    const matchSearch = !search || (order.order_number || order.id || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const OrderDetailDrawer = ({ order, onClose }) => {
    if (!order) return null;
    const items = order.items || [];
    const scfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const StatusIcon = scfg.icon || Package;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose} data-testid="order-detail-drawer">
        <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#20364D]">{order.order_number || `Order #${(order.id || "").slice(-8)}`}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" data-testid="close-order-drawer">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Banner */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${scfg.color.replace("text-", "").split(" ")[0]}`}>
              <StatusIcon size={24} className={scfg.color.split(" ")[1]} />
              <div>
                <p className="font-bold text-[#20364D]">{scfg.label}</p>
                <p className="text-xs text-slate-600">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p>
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Payment</span>
              </div>
              <StatusBadge status={order.payment_status || "pending"} config={PAYMENT_CONFIG} />
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-bold text-[#20364D] uppercase tracking-wider mb-3">Items ({items.length})</h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-[#20364D] text-sm">{item.name || item.title || "Item"}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                    </div>
                    <p className="font-semibold text-[#20364D] text-sm">{money(item.line_total || item.unit_price || item.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{money(order.subtotal_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">VAT</span>
                <span className="font-medium">{money(order.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#20364D] pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{money(order.total || order.total_amount)}</span>
              </div>
            </div>

            {/* Delivery */}
            {order.delivery && (order.delivery.address || order.delivery.city) && (
              <div>
                <h3 className="text-sm font-bold text-[#20364D] uppercase tracking-wider mb-2">Delivery</h3>
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  {order.delivery.address && <p>{order.delivery.address}</p>}
                  {order.delivery.city && <p>{order.delivery.city}{order.delivery.country ? `, ${order.delivery.country}` : ""}</p>}
                  {order.delivery.notes && <p className="text-xs text-slate-400 mt-1">{order.delivery.notes}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="orders-page">
      <PageHeader
        title="My Orders"
        subtitle="View and track all your orders."
        actions={
          <BrandButton href="/account/marketplace" variant="primary">
            <ShoppingBag className="w-4 h-4 mr-2" /> New Order
          </BrandButton>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="orders-search" />
        </div>
        <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="orders-status-filter">
          <option value="">All Statuses</option>
          <option value="created">Created</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="orders-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)} data-testid={`order-row-${order.id}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{order.order_number || `#${(order.id || "").slice(-8)}`}</td>
                    <td className="px-4 py-3 text-slate-600">{order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{(order.items || []).length} item{(order.items || []).length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(order.total || order.total_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status || "pending"} /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={order.payment_status || "pending"} config={PAYMENT_CONFIG} /></td>
                    <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-400" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No orders yet</h2>
          <p className="text-slate-500 mt-2 mb-6">Your order history will appear here once you make your first purchase.</p>
          <Link to="/account/marketplace" className="inline-block rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">Browse Marketplace</Link>
        </div>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}
