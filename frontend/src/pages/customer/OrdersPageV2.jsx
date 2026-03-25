import React, { useEffect, useMemo, useState } from "react";
import { Eye, Package, Phone, Mail, X } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogoFinal from "../../components/branding/BrandLogoFinal";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB"); } catch { return "-"; } }
function badge(status) {
  const styles = {
    paid: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    ready_to_fulfill: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
  };
  return styles[status] || "bg-slate-100 text-slate-700";
}

function OrderDrawer({ order, onClose }) {
  if (!order) return null;
  const sales = order.sales || {};
  const vendor = order.vendor || {};
  const items = order.items || [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="order-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f] text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <BrandLogoFinal size="md" light className="!h-7 mb-3" />
              <div className="text-lg font-semibold">Order Details</div>
              <div className="text-xs text-white/75 mt-1">{order.order_number || order.id}</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Order Status</div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge(order.status || order.fulfillment_state)}`}>{(order.status || order.fulfillment_state || "processing").replace(/_/g, " ")}</span>
              <div className="text-sm text-slate-500 mt-3">Payment</div>
              <div className="font-semibold text-[#20364D]">{(order.payment_status || order.payment_state || "paid").replace(/_/g, " ")}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Assigned Vendor</div>
              <div className="font-semibold text-[#20364D]">{vendor.name || order.vendor_name || "Pending assignment"}</div>
              <div className="text-sm text-slate-500 mt-3">Created</div>
              <div className="font-semibold text-[#20364D]">{fmtDate(order.created_at)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 bg-white">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Assigned Sales Person</div>
            <div className="font-semibold text-[#20364D]">{sales.name || order.sales_owner_name || "Konekt Sales Team"}</div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {sales.phone || order.sales_phone || "Sales contact will appear here"}</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {sales.email || order.sales_email || "support@konekt.co.tz"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-[#20364D]">Items</div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{item.name || item.title || `Item ${idx + 1}`}</div>
                    <div className="text-slate-500">Qty {item.quantity || 1}</div>
                  </div>
                  <div className="font-semibold text-[#20364D]">{money(item.line_total || (Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-500">No items found on this order.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setOrders(res.data || []))
      .catch(err => console.error("Failed to load orders:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const q = searchValue.toLowerCase();
    const matchesSearch = !q || [order.order_number, order.id, order.status, order.payment_status]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || (order.status === statusFilter || order.fulfillment_state === statusFilter);
    return matchesSearch && matchesStatus;
  }), [orders, searchValue, statusFilter]);

  return (
    <div data-testid="orders-page" className="space-y-6">
      <PageHeader title="My Orders" subtitle="Track order progress and contact your assigned sales person." />
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search orders..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "processing", label: "Processing" },
          { value: "ready_to_fulfill", label: "Ready to Fulfill" },
          { value: "completed", label: "Completed" },
        ] }]}
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Payment</th>
                <th className="px-6 py-4 text-left">Fulfillment</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No orders found.</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id || order._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="px-6 py-4 font-medium text-[#20364D]">{fmtDate(order.created_at)}</td>
                  <td className="px-6 py-4 font-semibold text-[#20364D]">{order.order_number || order.id}</td>
                  <td className="px-6 py-4 capitalize text-slate-600">{order.type || order.source_type || "product"}</td>
                  <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${badge(order.payment_status || order.payment_state)}`}>{(order.payment_status || order.payment_state || "paid").replace(/_/g, " ")}</span></td>
                  <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${badge(order.status || order.fulfillment_state)}`}>{(order.status || order.fulfillment_state || "processing").replace(/_/g, " ")}</span></td>
                  <td className="px-6 py-4"><button type="button" className="inline-flex items-center gap-2 text-[#20364D] font-semibold"><Eye className="w-4 h-4" /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}
