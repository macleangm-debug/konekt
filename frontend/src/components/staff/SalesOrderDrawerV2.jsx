import React, { useState } from "react";
import { Package, User, Truck, Phone, Mail, MapPin, FileText, Calendar, DollarSign, Briefcase, Loader2, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import StandardDrawerShell from "../ui/StandardDrawerShell";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function shortDate(v) { return v ? String(v).slice(0, 10) : "-"; }

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    ready_to_fulfill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ready_for_dispatch: "bg-indigo-50 text-indigo-700 border-indigo-200",
    picked_up: "bg-sky-50 text-sky-700 border-sky-200",
    in_transit: "bg-violet-50 text-violet-700 border-violet-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
    assigned: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[s] || "bg-slate-50 text-slate-600 border-slate-200"}`} data-testid="status-badge">
      {(status || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function VendorStatusIcon({ status }) {
  const s = (status || "").toLowerCase();
  if (["completed", "delivered"].includes(s)) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (["in_transit", "picked_up", "in_progress"].includes(s)) return <Clock className="w-4 h-4 text-blue-500" />;
  if (["delayed", "issue"].includes(s)) return <AlertCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-[#20364D]">{value}</span>
    </div>
  );
}

function VendorOrderCard({ vo, index }) {
  const [expanded, setExpanded] = useState(false);
  const items = vo.items || [];
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden" data-testid={`vendor-order-card-${index}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 transition"
        data-testid={`vendor-order-toggle-${index}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <VendorStatusIcon status={vo.status} />
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold text-[#20364D] truncate">{vo.vendor_name || `Vendor ${index + 1}`}</div>
            {vo.vendor_order_no && <div className="text-[10px] text-slate-400 font-mono">{vo.vendor_order_no}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={vo.status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100">
          {/* Contact info */}
          <div className="pt-2">
            {vo.contact_person && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" /> {vo.contact_person}
              </div>
            )}
            {vo.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${vo.contact_phone}`} className="hover:text-[#20364D] underline">{vo.contact_phone}</a>
              </div>
            )}
            {vo.contact_email && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${vo.contact_email}`} className="hover:text-[#20364D] underline">{vo.contact_email}</a>
              </div>
            )}
          </div>
          {/* Items assigned to this vendor */}
          {items.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Assigned Items ({items.length})</div>
              <div className="space-y-1">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 truncate pr-2">{it.name || it.product_name || `Item ${i + 1}`}</span>
                    <span className="text-slate-500 flex-shrink-0">x{it.quantity || 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function SalesOrderDrawerV2({ order, onClose }) {
  const [bufferDate, setBufferDate] = useState(order?.internal_target_date || "");
  const [savingBuffer, setSavingBuffer] = useState(false);

  const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  const saveBufferDate = async () => {
    if (!bufferDate || !order?.vendor_order_id) return;
    setSavingBuffer(true);
    try {
      await api.post(`/api/sales/delivery/${order.vendor_order_id}/internal-buffer`, {
        internal_target_date: bufferDate,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    setSavingBuffer(false);
  };

  if (!order) return null;

  const sales = order.sales || {};
  const items = order.items || order.line_items || [];

  return (
    <StandardDrawerShell
      open={!!order}
      onClose={onClose}
      title={order.order_number || "Order"}
      subtitle="Order Details"
      width="2xl"
      testId="sales-order-drawer"
      badge={<StatusBadge status={order.current_status || order.status} />}
    >
      <div className="space-y-5">
        {/* Customer */}
        <Section icon={User} title="Customer">
            <div className="text-base font-bold text-[#20364D]">{order.customer_name || order.customer?.full_name || "-"}</div>
            {(order.customer_email || order.customer?.email) && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <Mail className="w-3.5 h-3.5" /> {order.customer_email || order.customer?.email}
              </div>
            )}
            {(order.customer_phone || order.customer?.phone) && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                <Phone className="w-3.5 h-3.5" /> {order.customer_phone || order.customer?.phone}
              </div>
            )}
            {order.customer_address && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {order.customer_address}
              </div>
            )}
          </Section>

          {/* Assigned Sales */}
          <Section icon={Briefcase} title="Assigned Sales">
            {sales.name ? (
              <>
                <div className="text-base font-bold text-[#20364D]">{sales.name}</div>
                {sales.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <Mail className="w-3.5 h-3.5" /> {sales.email}
                  </div>
                )}
                {sales.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {sales.phone}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400">Not yet assigned</div>
            )}
          </Section>

          {/* Assigned Vendors (Multi-Vendor Visibility) */}
          {(order.vendor_orders && order.vendor_orders.length > 0) ? (
            <Section icon={Truck} title={`Assigned Vendors (${order.vendor_orders.length})`}>
              <div className="space-y-3" data-testid="vendor-orders-list">
                {order.vendor_orders.map((vo, idx) => (
                  <VendorOrderCard key={vo.vendor_order_id || idx} vo={vo} index={idx} />
                ))}
              </div>
            </Section>
          ) : (order.vendor_name || order.assigned_vendor_name) ? (
            <Section icon={Truck} title="Vendor / Fulfillment">
              <div className="text-base font-bold text-[#20364D]">{order.vendor_name || order.assigned_vendor_name}</div>
              {order.vendor_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {order.vendor_phone}
                </div>
              )}
              {order.vendor_email && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {order.vendor_email}
                </div>
              )}
            </Section>
          ) : null}

          {/* Line Items */}
          <Section icon={Package} title={`Line Items (${items.length})`}>
            {items.length === 0 ? (
              <div className="text-sm text-slate-400">No items</div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{item.name || item.product_name || `Item ${i + 1}`}</div>
                      <div className="text-xs text-slate-400">Qty: {item.quantity || 1}</div>
                    </div>
                    <div className="text-sm font-semibold">{money(item.line_total || item.subtotal || (item.quantity || 1) * (item.price || item.unit_price || 0))}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Financials */}
          <Section icon={DollarSign} title="Financial Summary">
            <InfoRow label="Subtotal" value={money(order.subtotal_amount || order.subtotal)} />
            <InfoRow label="VAT" value={money(order.vat_amount)} />
            <InfoRow label="Total" value={money(order.total_amount || order.total)} />
            <InfoRow label="Payment Status" value={order.payment_status || "-"} />
          </Section>

          {/* Linked Documents */}
          {(order.invoice_no || order.quote_no) && (
            <Section icon={FileText} title="Linked Documents">
              <InfoRow label="Invoice" value={order.invoice_no} />
              <InfoRow label="Quote" value={order.quote_no} />
            </Section>
          )}

          {/* Dates & Delivery Tracking */}
          <Section icon={Calendar} title="Timeline & Delivery">
            <InfoRow label="Created" value={shortDate(order.created_at)} />
            <InfoRow label="Updated" value={shortDate(order.updated_at)} />
            {order.delivery?.estimated_delivery && (
              <InfoRow label="Est. Delivery" value={shortDate(order.delivery.estimated_delivery)} />
            )}
            {order.vendor_promised_date && (
              <InfoRow label="Vendor Promised" value={shortDate(order.vendor_promised_date)} />
            )}
            {order.internal_target_date && (
              <InfoRow label="Internal Target" value={shortDate(order.internal_target_date)} />
            )}
            {order.vendor_order_id && (
              <div className="mt-3 pt-3 border-t">
                <label className="text-xs font-semibold text-slate-500">Internal Buffer Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={bufferDate}
                    onChange={(e) => setBufferDate(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="internal-buffer-date"
                  />
                  <button
                    onClick={saveBufferDate}
                    disabled={savingBuffer || !bufferDate}
                    className="rounded-lg bg-[#20364D] text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                    data-testid="save-buffer-date-btn"
                  >
                    {savingBuffer ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
                  </button>
                </div>
                {order.vendor_promised_date && (
                  <p className="text-xs text-slate-400 mt-1">Vendor promised: {shortDate(order.vendor_promised_date)} — add 1-2 day buffer</p>
                )}
              </div>
            )}
          </Section>
        </div>
    </StandardDrawerShell>
  );
}
