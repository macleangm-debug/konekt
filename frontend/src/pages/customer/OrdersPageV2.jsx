import React, { useEffect, useMemo, useState } from "react";
import { X, Phone, Mail, MessageCircle, CheckCircle2, Circle, Clock, Package, Truck, MapPin, RotateCcw, Loader2, Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function fulfillMeta(s, order) {
  // Use customer-safe label from API if available
  if (order && order.customer_status) {
    const label = order.customer_status;
    const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
    const map = {
      "processing": { cls: "bg-blue-100 text-blue-700" },
      "confirmed": { cls: "bg-blue-100 text-blue-700" },
      "in fulfillment": { cls: "bg-amber-100 text-amber-700" },
      "ready for pickup": { cls: "bg-teal-100 text-teal-700" },
      "dispatched": { cls: "bg-indigo-100 text-indigo-700" },
      "delivered": { cls: "bg-green-100 text-green-700" },
      "completed": { cls: "bg-emerald-100 text-emerald-700" },
      "delayed": { cls: "bg-red-100 text-red-700" },
      "cancelled": { cls: "bg-red-100 text-red-700" },
    };
    return { label: labelCap, cls: (map[label] || { cls: "bg-blue-100 text-blue-700" }).cls };
  }
  const st = (s || "processing").toLowerCase();
  if (st === "completed") return { label: "Completed", cls: "bg-emerald-100 text-emerald-700" };
  if (st === "delivered") return { label: "Delivered", cls: "bg-green-100 text-green-700" };
  if (st === "in_transit" || st === "dispatched") return { label: "Dispatched", cls: "bg-indigo-100 text-indigo-700" };
  if (st === "picked_up" || st === "ready_for_pickup" || st === "ready_to_fulfill" || st === "ready" || st === "shipped") return { label: "Ready", cls: "bg-teal-100 text-teal-700" };
  if (st === "in_progress" || st === "in_production" || st === "quality_check") return { label: "In Fulfillment", cls: "bg-amber-100 text-amber-700" };
  if (st === "cancelled") return { label: "Cancelled", cls: "bg-red-100 text-red-700" };
  if (st === "paid" || st === "confirmed" || st === "approved") return { label: "Confirmed", cls: "bg-blue-100 text-blue-700" };
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

/* Build timeline from customer-safe API data */
function buildTimeline(order) {
  // Use customer-safe steps from API
  const steps = order.timeline_steps || ["Ordered", "Confirmed", "In Progress", "Quality Check", "Ready", "Completed"];
  const currentIdx = order.timeline_index ?? 0;

  return steps.map((step, idx) => ({
    label: step,
    date: idx === 0 ? fmtDate(order.created_at) : "",
    done: idx <= currentIdx,
  }));
}

function OrderDrawer({ order, onClose }) {
  if (!order) return null;
  const fStatus = fulfillMeta(order.status || order.fulfillment_state, order);
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

  const salesName = order.sales?.name || order.assigned_sales_name || order.sales_owner_name || "";
  const salesPhone = order.sales?.phone || order.sales_phone || "";
  const salesEmail = order.sales?.email || order.sales_email || "";

  return (
    <StandardDrawerShell
      open={!!order}
      onClose={onClose}
      title="Order Details"
      subtitle={order?.order_number || order?.id || ""}
      width="xl"
      testId="order-drawer"
      badge={<span className={`text-xs px-3 py-1 rounded-full font-semibold ${fStatus.cls}`}>{fStatus.label}</span>}
    >
      <div className="space-y-5">
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

        {/* 3. Assigned Sales Person */}
        {salesName ? (
        <div className="rounded-xl border-2 border-[#20364D]/20 p-4 bg-[#20364D]/[0.02]" data-testid="sales-person-section">
          <div className="text-xs uppercase tracking-wide text-[#20364D] mb-3 font-semibold">Your Sales Contact</div>
          <div className="font-semibold text-[#20364D] text-base">{salesName}</div>
          <div className="mt-3 space-y-2">
            {salesPhone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {salesPhone}
            </div>
            )}
            {salesEmail && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {salesEmail}
            </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {salesPhone && (
            <a href={`tel:${salesPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#20364D] text-white px-3 py-2 text-xs font-semibold hover:bg-[#2a4a66] transition-colors" data-testid="call-sales-btn">
              <Phone className="w-3 h-3" /> Call
            </a>
            )}
            {salesEmail && (
            <a href={`mailto:${salesEmail}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors" data-testid="email-sales-btn">
              <Mail className="w-3 h-3" /> Email
            </a>
            )}
          </div>
        </div>
        ) : (
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50" data-testid="sales-person-section">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Sales Contact</div>
          <div className="text-sm text-slate-500">A sales representative will be assigned to your order shortly.</div>
        </div>
        )}

        {/* 4. Order Status */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Order Status</div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2"><strong className="text-slate-500">Payment:</strong> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pStatus.cls}`}>{pStatus.label}</span></div>
            <div className="flex items-center gap-2"><strong className="text-slate-500">Status:</strong> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fStatus.cls}`}>{fStatus.label}</span></div>
            {order.status_description && <div className="mt-2 text-slate-500 text-xs">{order.status_description}</div>}
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
          <div className="text-xs text-slate-500 mb-3">{salesName ? "Contact your assigned sales person for updates" : "A sales representative will be assigned shortly"}</div>
          {salesPhone && (
          <div className="flex items-center justify-center gap-2">
            <a href={`tel:${salesPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#20364D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#2a4a66] transition-colors">
              <Phone className="w-3 h-3" /> Call Sales
            </a>
          </div>
          )}
        </div>
      </div>
    </StandardDrawerShell>
  );
}

export default function OrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [reorderMsg, setReorderMsg] = useState(null);
  const { addItem } = useCartDrawer();
  const navigate = useNavigate();

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

  const handleReorder = async (e, orderId) => {
    e.stopPropagation();
    setReorderingId(orderId);
    setReorderMsg(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
      const res = await axios.post(`${API_URL}/api/customer/orders/${orderId}/reorder`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      if (data.ok && data.cart_items?.length > 0) {
        data.cart_items.forEach((item) => addItem(item));
        const msgs = [];
        if (data.added_count > 0) msgs.push(`${data.added_count} item${data.added_count > 1 ? "s" : ""} added to your cart with current pricing and promotions.`);
        if (data.warnings?.length > 0) msgs.push(`${data.warnings.length} item${data.warnings.length > 1 ? "s" : ""} could not be re-added because they are unavailable.`);
        setReorderMsg({ type: data.warnings?.length ? "warning" : "success", text: msgs.join(" ") });
        setTimeout(() => navigate("/account/cart"), 2000);
      } else if (data.warnings?.length > 0) {
        setReorderMsg({ type: "error", text: "Some items could not be re-added because they are unavailable." });
      } else {
        setReorderMsg({ type: "error", text: data.error || "No items could be added." });
      }
    } catch (err) {
      setReorderMsg({ type: "error", text: "Failed to process reorder. Please try again." });
    } finally {
      setReorderingId(null);
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const q = searchValue.toLowerCase();
    const matchesSearch = !q || [order.order_number, order.id, order.customer_status, order.status]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || order.customer_status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, searchValue, statusFilter]);

  return (
    <div data-testid="orders-page" className="space-y-6">
      <PageHeader title="My Orders" subtitle="Track order progress and contact your sales person." />

      {/* Reorder notification */}
      {reorderMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
          reorderMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          reorderMsg.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
          "bg-red-50 text-red-700 border border-red-200"
        }`} data-testid="reorder-notification">
          <span>{reorderMsg.text}</span>
          <button onClick={() => setReorderMsg(null)} className="ml-3 p-1 hover:bg-white/50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search orders..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "processing", label: "Processing" },
          { value: "confirmed", label: "Confirmed" },
          { value: "in fulfillment", label: "In Fulfillment" },
          { value: "dispatched", label: "Dispatched" },
          { value: "delivered", label: "Delivered" },
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
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">No orders found.</td></tr>
              ) : filteredOrders.map((order) => {
                const fSt = fulfillMeta(order.status || order.fulfillment_state, order);
                const pSt = paymentMeta(order.payment_status || order.payment_state);
                const oid = order.id || order.order_number;
                return (
                  <tr key={oid} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)} data-testid={`order-row-${order.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(order.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{order.order_number || order.id}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{sourceLabel(order)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(order.total_amount || order.total)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${pSt.cls}`}>{pSt.label}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${fSt.cls}`}>{fSt.label}</span></td>
                    <td className="px-6 py-4 text-center">
                      {["dispatched", "shipped", "in_transit", "awaiting_confirmation"].includes((order.status || "").toLowerCase()) ||
                       ["dispatched"].includes((order.fulfillment_status || "").toLowerCase()) ? (
                        <Link
                          to={`/confirm-completion?order=${order.order_number || order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition"
                          data-testid={`confirm-btn-${order.id}`}
                        >
                          <Check className="w-3 h-3" /> Confirm
                        </Link>
                      ) : (
                        <button
                          onClick={(e) => handleReorder(e, oid)}
                          disabled={reorderingId === oid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20364D] text-white text-xs font-semibold hover:bg-[#2a4a66] disabled:opacity-50 transition"
                          data-testid={`reorder-btn-${order.id}`}
                        >
                          {reorderingId === oid ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Reorder
                        </button>
                      )}
                    </td>
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
