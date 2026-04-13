import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Package, Truck, CheckCircle, Clock, AlertCircle,
  ArrowLeft, CreditCard, MapPin, ShoppingBag, ArrowRight, Mail, Phone, Copy, Check,
} from "lucide-react";
import api from "../../lib/api";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";
import OrderCodeCard from "../../components/tracking/OrderCodeCard";
import RatingPrompt from "../../components/public/RatingPrompt";

const API_URL = process.env.REACT_APP_BACKEND_URL;
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_MAP = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700", icon: Clock },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700", icon: CreditCard },
  payment_verified: { label: "Payment Verified", color: "bg-green-100 text-green-700", icon: CheckCircle },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Package },
  in_production: { label: "In Production", color: "bg-blue-100 text-blue-700", icon: Package },
  ready: { label: "Ready", color: "bg-indigo-100 text-indigo-700", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  in_transit: { label: "In Transit", color: "bg-purple-100 text-purple-700", icon: Truck },
  awaiting_confirmation: { label: "Awaiting Confirmation", color: "bg-amber-100 text-amber-700", icon: Clock },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed_signed: { label: "Completed (Signed)", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed_confirmed: { label: "Completed (Confirmed)", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function TrackOrderPageContent() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+255");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [trackMethod, setTrackMethod] = useState("phone");
  const [order, setOrder] = useState(null);
  const [groupDeals, setGroupDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    setGroupDeals([]);

    try {
      if (trackMethod === "phone") {
        const fullPhone = combinePhone(phonePrefix, phoneNumber);
        if (!fullPhone || fullPhone.length < 6) { setError("Please enter a valid phone number."); return; }
        // Search group deals by phone
        try {
          const gdRes = await api.get(`/api/public/group-deals/track?phone=${encodeURIComponent(fullPhone)}`);
          if (gdRes.data && gdRes.data.length > 0) {
            setGroupDeals(gdRes.data);
          } else {
            setError("No records found for this phone number.");
          }
        } catch { setError("No records found. Please check and try again."); }

      } else if (trackMethod === "reference") {
        const query = orderNumber.trim();
        if (!query) { setError("Please enter an order or deal reference."); return; }
        if (query.startsWith("GDC-")) {
          try {
            const res = await api.get(`/api/public/group-deals/track?ref=${encodeURIComponent(query)}`);
            setGroupDeals(res.data || []);
            if (!res.data || res.data.length === 0) setError("Commitment not found.");
          } catch { setError("Commitment not found. Please check the reference."); }
        } else {
          try {
            const res = await api.get(`/api/orders/track/${query}`);
            setOrder(res.data);
          } catch { setError("Order not found. Please check the reference."); }
        }

      } else if (trackMethod === "email") {
        if (!email.trim()) { setError("Please enter an email address."); return; }
        setError("Email lookup is coming soon. Please use phone number or order reference.");
      }
    } finally { setLoading(false); }
  };

  const statusInfo = order ? (STATUS_MAP[order.status] || STATUS_MAP.pending) : null;
  const paymentInfo = order ? (STATUS_MAP[order.payment_status] || null) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10" data-testid="track-order-page">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-[#20364D]">Track Your Order</h1>
      <p className="text-slate-600 mt-2 mb-8">
        Enter your order number, group deal reference, or phone number to check your status.
      </p>

      {/* Grid layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Search + result */}
        <div className="space-y-6">
          {/* Search Form — Single Input Selector */}
          <div className="rounded-2xl border bg-white p-6" data-testid="track-search-form">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Identifier type selector */}
              <div>
                <label className="block text-sm font-semibold text-[#20364D] mb-2">How would you like to track?</label>
                <div className="flex gap-2 flex-wrap" data-testid="track-method-selector">
                  {[
                    { key: "phone", label: "Phone Number" },
                    { key: "reference", label: "Order / Deal Reference" },
                    { key: "email", label: "Email" },
                  ].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setTrackMethod(key)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
                        trackMethod === key ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`} data-testid={`track-method-${key}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional single input */}
              {trackMethod === "phone" && (
                <PhoneNumberField
                  label="Phone Number"
                  prefix={phonePrefix}
                  number={phoneNumber}
                  onPrefixChange={setPhonePrefix}
                  onNumberChange={setPhoneNumber}
                  testIdPrefix="track-phone"
                />
              )}
              {trackMethod === "reference" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Order / Deal Reference</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. ORD-20260406-XXXXX or GDC-XXXX-XXXXX"
                      className="w-full border-2 border-[#20364D]/20 rounded-xl pl-11 pr-4 py-3.5 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D]"
                      data-testid="order-number-input"
                    />
                  </div>
                </div>
              )}
              {trackMethod === "email" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email used when placing the order"
                    className="w-full border-2 border-[#20364D]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D]"
                    data-testid="order-email-input"
                  />
                </div>
              )}

              <p className="text-xs text-slate-500">Use your phone number, order number (ORD-...), or group deal reference (GDC-...).</p>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#20364D] text-white px-6 py-3.5 font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
                data-testid="track-submit-btn"
              >
                {loading ? "Searching..." : "Track Order"}
              </button>
            </form>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3" data-testid="track-error">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Order Result — header + items */}
          {order && statusInfo && (
            <div className="space-y-5" data-testid="order-result">
              {/* Order code card */}
              <OrderCodeCard orderNumber={order.order_number || order.id} />

              {/* Status header */}
              <div className="rounded-2xl border bg-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Order Number</p>
                    <h2 className="text-xl font-bold text-[#20364D] font-mono" data-testid="result-order-number">
                      {order.order_number || order.id}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Placed {order.created_at ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${statusInfo.color}`} data-testid="result-status">
                      {statusInfo.label}
                    </span>
                    {paymentInfo && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`} data-testid="result-payment-status">
                        Payment: {paymentInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {(order.items || order.line_items || []).length > 0 && (
                <div className="rounded-2xl border bg-white p-6">
                  <h3 className="text-lg font-bold text-[#20364D] mb-4">Items Ordered</h3>
                  <div className="space-y-3">
                    {(order.items || order.line_items || []).map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-slate-800">{item.product_name || item.description}</p>
                          <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-sm">{money(item.subtotal || item.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3 flex justify-between font-bold text-[#20364D]">
                    <span>Total</span>
                    <span>{money(order.total || order.total_amount)}</span>
                  </div>
                </div>
              )}

              {/* Delivery address */}
              {order.delivery_address && (
                <div className="rounded-2xl border bg-white p-6">
                  <h3 className="text-lg font-bold text-[#20364D] mb-3">Delivery</h3>
                  <div className="flex items-start gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{order.delivery_address}</p>
                      {order.city && <p>{order.city}{order.country ? `, ${order.country}` : ""}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Completion CTA — fulfillment-aware */}
              {(order.fulfillment_status === "dispatched" || order.status === "shipped" || order.status === "in_transit" || order.status === "awaiting_confirmation") && !["delivered","completed","completed_signed","completed_confirmed","cancelled"].includes(order.status) && (() => {
                const ft = order.fulfillment_type || order.order_type || "delivery";
                const ctaLabel = ft === "pickup" ? "Confirm Pickup" : ft === "service" ? "Confirm Service Handover" : "Confirm Delivery";
                return (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center" data-testid="confirm-delivery-cta">
                    <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-[#20364D] mb-1">Awaiting Your Confirmation</h3>
                    <p className="text-sm text-slate-600 mb-4">Your order is ready. Please confirm completion.</p>
                    <Link
                      to={`/confirm-completion?order=${order.order_number || order.id}`}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition text-base"
                      data-testid="confirm-delivery-btn"
                    >
                      <Check className="w-5 h-5" /> {ctaLabel}
                    </Link>
                  </div>
                );
              })()}

              {/* Rating Prompt — shown for completed orders */}
              {["completed","completed_signed","completed_confirmed","closed","delivered"].includes((order.status || "").toLowerCase()) && (
                <RatingPrompt orderNumber={order.order_number || order.id} phone={order.customer_phone || ""} />
              )}
            </div>
          )}
        </div>

        {/* Group Deal Results — full-width grid row */}
        {groupDeals.length > 0 && (
          <div className="lg:col-span-2 space-y-4" data-testid="group-deal-track-results">
            <h3 className="text-lg font-bold text-[#20364D]">Group Deal Status</h3>
            {groupDeals.map((gd) => {
              const campaign = gd.campaign || {};
              const progress = campaign.display_target > 0 ? Math.round((campaign.current_committed / campaign.display_target) * 100) : 0;
              const daysLeft = campaign.deadline ? Math.max(0, Math.ceil((new Date(campaign.deadline) - new Date()) / 86400000)) : 0;
              const spotsLeft = Math.max(0, (campaign.display_target || 0) - (campaign.current_committed || 0));

              const statusMap = {
                pending_payment: { label: "Awaiting Payment", cls: "bg-amber-100 text-amber-700", desc: "Please submit your payment to secure your spot." },
                payment_submitted: { label: "Payment Under Review", cls: "bg-blue-100 text-blue-700", desc: "We are verifying your payment. This may take a short time." },
                committed: { label: "Payment Approved", cls: "bg-green-100 text-green-700", desc: "You are part of the deal. Waiting for the target to be reached." },
                order_created: { label: "Deal Successful", cls: "bg-emerald-100 text-emerald-700", desc: "Your order has been created and is being prepared." },
                refund_pending: { label: "Refund Pending", cls: "bg-orange-100 text-orange-700", desc: "The deal did not complete. Your refund is being processed." },
                refunded: { label: "Refunded", cls: "bg-slate-100 text-slate-600", desc: "Your refund has been completed." },
              };
              const st = statusMap[gd.status] || statusMap.pending_payment;

              return (
                <div key={gd.commitment_ref} className="rounded-2xl border bg-white overflow-hidden" data-testid={`gd-track-${gd.commitment_ref}`}>
                  <div className={`px-5 py-3 flex items-center justify-between ${
                    gd.status === "committed" || gd.status === "order_created" ? "bg-green-50 border-b border-green-200" :
                    gd.status === "refund_pending" || gd.status === "refunded" ? "bg-red-50 border-b border-red-200" :
                    "bg-blue-50 border-b border-blue-200"
                  }`}>
                    <div>
                      <p className="text-xs text-slate-500">Commitment Reference</p>
                      <p className="font-bold font-mono text-[#20364D]">{gd.commitment_ref}</p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#20364D]">{gd.campaign_name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{st.desc}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-slate-400 text-xs">Quantity</span><div className="font-bold text-[#20364D]">{gd.quantity} units</div></div>
                      <div><span className="text-slate-400 text-xs">Amount</span><div className="font-bold text-[#D4A843]">{money(gd.amount)}</div></div>
                      <div><span className="text-slate-400 text-xs">Customer</span><div className="font-bold text-[#20364D]">{gd.customer_name}</div></div>
                      <div><span className="text-slate-400 text-xs">Joined</span><div className="font-bold text-[#20364D]">{gd.created_at ? new Date(gd.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "-"}</div></div>
                    </div>
                    {campaign.id && (gd.status === "committed" || gd.status === "payment_submitted" || gd.status === "pending_payment") && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-[#20364D]">Campaign Progress</span>
                          <span className="text-slate-500">{spotsLeft} units to go</span>
                        </div>
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-[#D4A843]"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{campaign.current_committed}/{campaign.display_target} units</span>
                          <span>{campaign.buyer_count || 0} buyers</span>
                          {daysLeft > 0 && <span>{daysLeft}d left</span>}
                        </div>
                      </div>
                    )}
                    {gd.status === "order_created" && gd.order_number && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <p className="text-sm font-semibold text-emerald-800">Order created: <span className="font-mono">{gd.order_number}</span></p>
                      </div>
                    )}
                    {gd.status === "refunded" && (
                      <div className="bg-slate-50 border rounded-xl p-4 text-center">
                        <p className="text-sm font-semibold text-slate-700">Refund of {money(gd.amount)} processed</p>
                      </div>
                    )}
                    {gd.status === "refund_pending" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                        <p className="text-sm font-semibold text-orange-800">Refund of {money(gd.amount)} is being processed</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Right: Timeline (shown when order found) */}
        <div>
          {order && statusInfo && (
            <div className="rounded-2xl border bg-white p-6 sticky top-24">
              <h3 className="text-lg font-bold text-[#20364D] mb-5">Order Progress</h3>
              <div className="space-y-0">
                {(() => {
                  const fulfillment = order.fulfillment_type || order.order_type || "delivery";
                  const isComplete = ["delivered", "completed", "completed_signed", "completed_confirmed"].includes(order.status);
                  const readyLabel = fulfillment === "pickup" ? "Ready for Pickup" : fulfillment === "service" ? "Service Ready" : "Ready / Dispatched";
                  const awaitLabel = "Awaiting Confirmation";
                  const completeLabel = "Completed";

                  const steps = [
                    { key: "placed", label: "Order Placed", time: order.created_at },
                    { key: "confirmed", label: "Confirmed", time: order.payment_status === "approved" || order.status !== "pending" ? (order.approved_at || order.updated_at) : null },
                    { key: "processing", label: "In Progress", time: ["processing", "in_production"].includes(order.status) || ["ready", "shipped", "in_transit", "delivered", "completed", "completed_signed", "completed_confirmed", "awaiting_confirmation"].includes(order.status) ? order.updated_at : null },
                    { key: "ready", label: readyLabel, time: ["ready", "shipped", "in_transit", "delivered", "completed", "completed_signed", "completed_confirmed", "awaiting_confirmation"].includes(order.status) || order.fulfillment_status === "dispatched" ? order.updated_at : null },
                    { key: "awaiting", label: awaitLabel, time: ["awaiting_confirmation"].includes(order.status) || (order.fulfillment_status === "dispatched" && !isComplete) ? order.updated_at : (isComplete ? order.updated_at : null) },
                    { key: "completed", label: completeLabel, time: isComplete ? order.updated_at : null },
                  ];

                  return steps.map((step, idx, arr) => {
                    const done = !!step.time;
                    const isCurrent = done && (idx === arr.length - 1 || !arr[idx + 1].time);
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? (isCurrent ? "bg-[#D4A843]" : "bg-[#20364D]") : "bg-slate-200"}`}>
                            {done ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                          </div>
                          {!isLast && <div className={`w-0.5 h-8 ${done ? "bg-[#20364D]" : "bg-slate-200"}`} />}
                        </div>
                        <div className="pb-6">
                          <p className={`font-medium text-sm ${done ? (isCurrent ? "text-[#D4A843]" : "text-[#20364D]") : "text-slate-400"}`}>{step.label}</p>
                          {step.time && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(step.time).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Completion Summary (after closure) */}
              {["completed", "completed_signed", "completed_confirmed", "delivered"].includes(order.status) && order.receiver_name && (
                <div className="mt-4 pt-4 border-t border-slate-100" data-testid="completion-summary">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Completion Details</div>
                  <div className="text-sm space-y-1">
                    <div><span className="text-slate-500">Receiver:</span> <span className="font-medium">{order.receiver_name}</span></div>
                    {order.closure_method && <div><span className="text-slate-500">Method:</span> <span className="font-medium capitalize">{order.closure_method.replace(/_/g, " ")}</span></div>}
                    {order.completed_at && <div><span className="text-slate-500">Completed:</span> <span className="font-medium">{new Date(order.completed_at).toLocaleDateString("en-GB")}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help section — always visible */}
          <div className={`rounded-2xl bg-slate-50 border p-6 text-center ${order || groupDeals.length > 0 ? "mt-6" : ""}`}>
            <h3 className="font-bold text-[#20364D] mb-2">Need help with your order?</h3>
            <p className="text-slate-600 text-sm mb-4">Contact our team for assistance.</p>
            <div className="flex flex-col gap-3">
              <a href="mailto:sales@konekt.co.tz"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition text-sm"
                data-testid="track-email-support">
                <Mail className="w-4 h-4" /> Email Support
              </a>
              <Link to="/help"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#20364D] text-[#20364D] px-5 py-2.5 font-semibold hover:bg-[#20364D] hover:text-white transition text-sm"
                data-testid="track-help-link">
                Help Center <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
