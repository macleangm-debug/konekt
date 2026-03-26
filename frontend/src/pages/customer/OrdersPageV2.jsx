import React, { useEffect, useMemo, useState } from "react";
import { X, Phone, Mail, MessageCircle, CheckCircle2, Circle, Clock, Package, Truck, MapPin } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function fulfillMeta(s) {
  const st = (s || "processing").toLowerCase();
  if (st === "completed" || st === "delivered") return { label: "Completed", cls: "bg-emerald-100 text-emerald-700" };
  if (st === "ready_to_fulfill" || st === "ready" || st === "shipped") return { label: "Ready", cls: "bg-blue-100 text-blue-700" };
  if (st === "in_progress") return { label: "In Progress", cls: "bg-amber-100 text-amber-700" };
  if (st === "cancelled") return { label: "Cancelled", cls: "bg-red-100 text-red-700" };
  if (st === "paid") return { label: "Pending", cls: "bg-slate-100 text-slate-600" };
  return { label: "Processing", cls: "bg-blue-100 text-blue-700" };
}

function paymentMeta(s) {
  const st = (s || "paid").toLowerCase();
  if (st === "paid") return { label: "Paid", cls: "bg-green-100 text-green-700" };
  if (st === "partial" || st === "partially_paid") return { label: "Partial", cls: "bg-amber-100 text-amber-700" };
  if (st === "under_review") return { label: "Under Review", cls: "bg-blue-100 text-blue-700" };
  if (st === "pending" || st === "pending_payment") return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
  return { label: (st || "paid").replace(/_/g, " "), cls: "bg-slate-100 text-slate-600" };
}

function sourceLabel(order) {
  const t = (order.type || order.source_type || "product").toLowerCase();
  if (t.includes("service")) return "Service";
  if (t.includes("promo")) return "Promo";
  return "Product";
}

/* Build timeline from order data */
function buildTimeline(order) {
  const events = [];
  if (order.created_at) events.push({ label: "Order Created", date: fmtDate(order.created_at), done: true });

  const ps = (order.payment_status || "").toLowerCase();
  if (ps === "paid") events.push({ label: "Payment Approved", date: fmtDate(order.updated_at), done: true });
  else events.push({ label: "Payment Approved", date: "", done: false });

  // Use status_history if available
  const history = order.status_history || [];
  const hasVendor = history.some(h => (h.status || "").includes("vendor") || (h.status || "").includes("assigned"));
  if (hasVendor || order.vendor_ids?.length) events.push({ label: "Vendor Assigned", date: "", done: true });
  else events.push({ label: "Vendor Assigned", date: "", done: false });

  const fs = (order.status || order.fulfillment_state || "").toLowerCase();
  if (["in_progress", "ready", "ready_to_fulfill", "shipped", "completed", "delivered"].includes(fs)) {
    events.push({ label: "Work Started", date: "", done: true });
  } else {
    events.push({ label: "Work Started", date: "", done: false });
  }

  if (["completed", "delivered"].includes(fs)) {
    events.push({ label: "Completed", date: fmtDate(order.updated_at), done: true });
  } else {
    events.push({ label: "Completed", date: "", done: false });
  }

  return events;
}

function OrderDrawer({ order, onClose }) {
  if (!order) return null;
  const fStatus = fulfillMeta(order.status || order.fulfillment_state);
  const pStatus = paymentMeta(order.payment_status || order.payment_state);
  const items = order.items || order.line_items || [];
  const delivery = order.delivery || {};
  const billing = order.billing || {};
  const timeline = buildTimeline(order);
  const total = Number(order.total_amount || order.total || 0);
  const src = sourceLabel(order);

  const customerName = delivery.client_name || billing.invoice_client_name || order.customer_name || "Customer";
  const customerPhone = delivery.client_phone || billing.invoice_client_phone || order.customer_phone || "";
  const customerAddress = delivery.address_line ? `${delivery.address_line}, ${delivery.city || ""}` : "";

  const salesName = order.assigned_sales_name || order.sales_owner_name || "Konekt Sales Team";
  const salesPhone = order.sales_phone || "+255 XXX XXX XXX";
  const salesEmail = order.sales_email || "sales@konekt.co.tz";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="order-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[560px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f]">
          <div className="px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo size="md" variant="light" className="mb-3" />
                <div className="text-lg font-semibold">Order Details</div>
                <div className="text-xs text-white/70 mt-1">{order.order_number || order.id}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${fStatus.cls}`}>{fStatus.label}</span>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20" data-testid="close-order-drawer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 1. Order Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Order Summary</div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div><strong className="text-slate-500">Order:</strong> {order.order_number || order.id}</div>
                <div><strong className="text-slate-500">Date:</strong> {fmtDate(order.created_at)}</div>
                <div><strong className="text-slate-500">Source:</strong> <span className="capitalize">{src}</span></div>
                {order.invoice_id && <div><strong className="text-slate-500">Invoice:</strong> {order.invoice_number || order.invoice_id}</div>}
                {order.quote_id && <div><strong className="text-slate-500">Quote:</strong> {order.quote_number || order.quote_id}</div>}
              </div>
            </div>

            {/* 2. Customer Details */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Customer</div>
              <div className="font-semibold text-[#20364D] text-sm">{customerName}</div>
              {customerPhone && <div className="text-xs text-slate-500 mt-1">{customerPhone}</div>}
              {customerAddress && <div className="text-xs text-slate-500 flex items-start gap-1 mt-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{customerAddress}</div>}
            </div>
          </div>

          {/* 3. Assigned Sales Person — KEY SECTION */}
          <div className="rounded-xl border-2 border-[#20364D]/20 p-4 bg-[#20364D]/[0.02]" data-testid="sales-person-section">
            <div className="text-xs uppercase tracking-wide text-[#20364D] mb-3 font-semibold">Assigned Sales Person</div>
            <div className="font-semibold text-[#20364D] text-base">{salesName}</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {salesPhone}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {salesEmail}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a href={`tel:${salesPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#20364D] text-white px-3 py-2 text-xs font-semibold hover:bg-[#2a4a66] transition-colors" data-testid="call-sales-btn">
                <Phone className="w-3 h-3" /> Call
              </a>
              <a href={`mailto:${salesEmail}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors" data-testid="email-sales-btn">
                <Mail className="w-3 h-3" /> Email
              </a>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 text-green-700 px-3 py-2 text-xs font-semibold hover:bg-green-50 transition-colors" data-testid="whatsapp-sales-btn">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
            </div>
          </div>

          {/* 4. Fulfillment / Vendor */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Fulfillment</div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2"><strong className="text-slate-500">Vendor:</strong> {order.vendor_name || "Pending assignment"}</div>
              <div className="flex items-center gap-2"><strong className="text-slate-500">Payment:</strong> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pStatus.cls}`}>{pStatus.label}</span></div>
              <div className="flex items-center gap-2"><strong className="text-slate-500">Status:</strong> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fStatus.cls}`}>{fStatus.label}</span></div>
            </div>
          </div>

          {/* 5. Items / Work Details */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-[#20364D] text-sm">{src === "Service" ? "Work Details" : "Order Items"}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{item.name || item.title || `Item ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400">
                      Qty {item.quantity || 1}
                      {item.variant && ` · ${item.variant}`}
                      {item.description && ` · ${item.description}`}
                    </div>
                  </div>
                  <div className="font-semibold text-[#20364D]">{money(item.line_total || (Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-400 text-center">No items</div>}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(order.subtotal_amount || order.subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT</span><span className="font-medium text-[#20364D]">{money(order.vat_amount)}</span></div>
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-[#20364D]">Total</span>
              <span className="font-bold text-[#20364D]">{money(total)}</span>
            </div>
          </div>

          {/* 6. Timeline */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50" data-testid="order-timeline">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-3 font-semibold">Timeline</div>
            <div className="space-y-0">
              {timeline.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    {evt.done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                    {idx < timeline.length - 1 && <div className={`w-0.5 h-5 mt-0.5 ${evt.done ? "bg-green-300" : "bg-slate-200"}`} />}
                  </div>
                  <div className="flex-1 flex items-center justify-between min-h-[20px]">
                    <span className={`text-sm ${evt.done ? "text-[#20364D] font-medium" : "text-slate-400"}`}>{evt.label}</span>
                    {evt.date && <span className="text-xs text-slate-400">{evt.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Need help? */}
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center bg-slate-50/30" data-testid="need-help-section">
            <div className="text-sm font-semibold text-[#20364D] mb-1">Need help with this order?</div>
            <div className="text-xs text-slate-500 mb-3">Contact your assigned sales person for updates</div>
            <div className="flex items-center justify-center gap-2">
              <a href={`tel:${salesPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#20364D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#2a4a66] transition-colors">
                <Phone className="w-3 h-3" /> Call Sales
              </a>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 text-green-700 px-4 py-2 text-xs font-semibold hover:bg-green-50 transition-colors">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
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
      .then((res) => {
        const sorted = (res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setOrders(sorted);
      })
      .catch((err) => console.error("Failed to load orders:", err))
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
      <PageHeader title="My Orders" subtitle="Track fulfillment progress and contact your sales person." />
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search orders..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "processing", label: "Processing" },
          { value: "in_progress", label: "In Progress" },
          { value: "ready_to_fulfill", label: "Ready" },
          { value: "completed", label: "Completed" },
        ] }]}
      />

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="orders-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Order No</th>
                <th className="px-6 py-4 text-left">Source</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Payment</th>
                <th className="px-6 py-4 text-left">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No orders found.</td></tr>
              ) : filteredOrders.map((order) => {
                const fSt = fulfillMeta(order.status || order.fulfillment_state);
                const pSt = paymentMeta(order.payment_status || order.payment_state);
                return (
                  <tr key={order.id || order._id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)} data-testid={`order-row-${order.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(order.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{order.order_number || order.id}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{sourceLabel(order)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(order.total_amount || order.total)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${pSt.cls}`}>{pSt.label}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${fSt.cls}`}>{fSt.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}
