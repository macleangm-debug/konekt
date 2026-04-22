import React, { useState } from "react";
import { Phone, Mail, User, MapPin, Clock, CheckCircle, AlertTriangle, Play, MessageSquare, Calendar, Download } from "lucide-react";
import partnerApi from "../../lib/partnerApi";
import VendorEtaInput from "../vendor/VendorEtaInput";
import { useBranding } from "../../contexts/BrandingContext";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const STATUS_FLOW = {
  ready_to_fulfill: { next: "assigned", label: "Accept Order", icon: CheckCircle, color: "bg-indigo-600 hover:bg-indigo-700" },
  pending_payment_confirmation: { next: "assigned", label: "Accept Order", icon: CheckCircle, color: "bg-indigo-600 hover:bg-indigo-700" },
  assigned: { next: "work_scheduled", label: "Schedule Work", icon: Play, color: "bg-cyan-600 hover:bg-cyan-700" },
  work_scheduled: { next: "in_progress", label: "Start Work", icon: Play, color: "bg-amber-600 hover:bg-amber-700" },
  accepted: { next: "in_progress", label: "Start Work", icon: Play, color: "bg-amber-600 hover:bg-amber-700" },
  in_progress: { next: "ready_for_pickup", label: "Mark Ready for Pickup", icon: CheckCircle, color: "bg-teal-600 hover:bg-teal-700" },
  processing: { next: "in_progress", label: "Start Work", icon: Play, color: "bg-amber-600 hover:bg-amber-700" },
};

function StatusBadgeDrawer({ status }) {
  const map = {
    ready_to_fulfill: "bg-blue-100 text-blue-700",
    pending_payment_confirmation: "bg-amber-100 text-amber-700",
    assigned: "bg-indigo-100 text-indigo-700",
    accepted: "bg-cyan-100 text-cyan-700",
    work_scheduled: "bg-sky-100 text-sky-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    processing: "bg-yellow-100 text-yellow-700",
    quality_check: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    ready_for_pickup: "bg-teal-100 text-teal-700",
    picked_up: "bg-blue-100 text-blue-700",
    in_transit: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700",
    fulfilled: "bg-green-100 text-green-700",
    completed: "bg-emerald-100 text-emerald-700",
    issue_reported: "bg-red-100 text-red-700",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`} data-testid="drawer-status-badge">
      {(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}

export default function VendorOrderDrawer({ order, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [actionError, setActionError] = useState(null);
  const { brand_name } = useBranding();

  const currentStatus = order?.fulfillment_state || order?.status || "processing";
  const nextAction = STATUS_FLOW[currentStatus];
  // Vendor terminal states: ready_for_pickup (handed off to sales), completed, issue_reported
  const isTerminal = ["completed", "issue_reported", "ready_for_pickup", "picked_up", "in_transit", "delivered"].includes(currentStatus);
  const isHandedToSales = ["ready_for_pickup", "picked_up", "in_transit", "delivered", "completed"].includes(currentStatus);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    setActionError(null);
    try {
      await partnerApi.post(`/api/vendor/orders/${order.id}/status`, { status: newStatus });
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleReportIssue = async () => {
    setUpdating(true);
    setActionError(null);
    try {
      await partnerApi.post(`/api/vendor/orders/${order.id}/status`, { status: "issue_reported" });
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to report issue");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setUpdating(true);
    setActionError(null);
    try {
      await partnerApi.post(`/api/vendor/orders/${order.id}/note`, { note: noteText.trim() });
      setNoteText("");
      setShowNoteInput(false);
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to add note");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="vendor-order-drawer">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor Order</div>
          <div className="mt-1 text-xl font-bold text-[#20364D]" data-testid="drawer-order-no">
            {order?.vendor_order_no || order?.id?.slice(0, 12)}
          </div>
          <div className="mt-1 text-sm text-slate-500 capitalize">{order?.source_type || "product"} order</div>
        </div>
        <StatusBadgeDrawer status={currentStatus} />
      </div>

      {/* PO Download */}
      <a
        href={`${API_URL}/api/pdf/purchase-orders/${order?.id || order?.vendor_order_no}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] transition-colors w-full justify-center"
        data-testid="download-po-pdf"
      >
        <Download className="w-4 h-4" /> Download Purchase Order (PDF)
      </a>

      {/* Order Summary */}
      <section className="rounded-xl border p-4" data-testid="drawer-order-summary">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Order Summary</div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-500">Date:</span>{" "}
              <span className="font-medium text-slate-700">{order?.date || "-"}</span>
            </div>
          </div>
          {order?.base_price && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500">Base Price:</span>{" "}
                <span className="font-semibold text-[#20364D]">TZS {Number(order.base_price).toLocaleString()}</span>
              </div>
            </div>
          )}
          {order?.delivery_address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500">Execution Address:</span>{" "}
                <span className="font-medium text-slate-700">{order.delivery_address}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Vendor ETA */}
      {!["completed", "cancelled", "delivered"].includes(currentStatus) && (
        <VendorEtaInput
          vendorOrderId={order?.id}
          currentEta={order?.vendor_promised_date}
          onUpdated={() => onStatusUpdate?.()}
        />
      )}
      {order?.vendor_promised_date && ["completed", "delivered"].includes(currentStatus) && (
        <div className="rounded-xl border bg-slate-50 p-4 text-sm" data-testid="eta-display">
          <div className="flex items-center gap-2 text-slate-500 mb-1"><Calendar className="w-3.5 h-3.5" />Promised Delivery</div>
          <div className="font-semibold text-[#20364D]">{new Date(order.vendor_promised_date).toLocaleDateString()}</div>
        </div>
      )}

      {/* Konekt Operations Contact — Konekt is the single client for vendors */}
      <section className="rounded-xl border p-4" data-testid="drawer-sales-contact">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{brand_name} Operations (your client)</div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">{brand_name} Operations Team</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <a href="tel:+255000000000" className="text-blue-600 hover:underline">Konekt Ops hotline</a>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {brand_name} is your single client — reach us through our Ops team for all queries on this order.
          </p>
        </div>
      </section>

      {/* Work Details */}
      <section className="rounded-xl border p-4" data-testid="drawer-work-details">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Work Details</div>
        {(order?.items || []).length > 0 ? (
          <ul className="space-y-3 text-sm">
            {order.items.map((item, idx) => (
              <li key={idx} className="border-b pb-3 last:border-b-0 last:pb-0">
                <div className="font-semibold text-slate-800">{item.name || item.title || item.product_name || "Item"}</div>
                <div className="text-slate-500 mt-0.5">
                  Qty: {item.quantity || 1}
                  {item.variant || item.description ? ` — ${item.variant || item.description}` : ""}
                </div>
                {item.brief && <div className="mt-1 text-xs text-slate-400">{item.brief}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No item details available</p>
        )}
      </section>

      {/* Timeline */}
      <section className="rounded-xl border p-4" data-testid="drawer-timeline">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Timeline</div>
        {(order?.timeline || []).length > 0 ? (
          <ul className="space-y-2 text-sm">
            {order.timeline.map((evt, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#20364D]" />
                  <span className="text-slate-700">{evt.label}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{evt.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No timeline events</p>
        )}
      </section>

      {/* Actions */}
      <section className="rounded-xl border p-4" data-testid="drawer-actions">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Actions</div>

        {actionError && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="action-error">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Primary action button */}
          {nextAction && !isTerminal && (
            <button
              onClick={() => handleStatusUpdate(nextAction.next)}
              disabled={updating}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${nextAction.color}`}
              data-testid="primary-action-btn"
            >
              <nextAction.icon className="w-4 h-4" />
              {updating ? "Updating..." : nextAction.label}
            </button>
          )}

          {/* Report Issue */}
          {!isTerminal && (
            <button
              onClick={handleReportIssue}
              disabled={updating}
              className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              data-testid="report-issue-btn"
            >
              <AlertTriangle className="w-4 h-4" />
              Report Issue
            </button>
          )}

          {/* Add Note Toggle */}
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            data-testid="add-note-toggle-btn"
          >
            <MessageSquare className="w-4 h-4" />
            Add Note
          </button>

          {/* Terminal state */}
          {isTerminal && (
            <span className="flex items-center gap-2 text-sm font-medium text-green-600" data-testid="terminal-status-label">
              <CheckCircle className="w-4 h-4" />
              {currentStatus === "issue_reported" ? "Issue Reported" 
                : isHandedToSales ? `Handed to ${brand_name} Sales for Logistics` 
                : "Order Completed"}
            </span>
          )}
        </div>

        {/* Note input */}
        {showNoteInput && (
          <div className="mt-4 space-y-2" data-testid="note-input-section">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a progress note..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 resize-none"
              data-testid="note-textarea"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddNote}
                disabled={updating || !noteText.trim()}
                className="rounded-lg bg-[#20364D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4565] transition disabled:opacity-50"
                data-testid="submit-note-btn"
              >
                {updating ? "Saving..." : "Save Note"}
              </button>
              <button
                onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                data-testid="cancel-note-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Contact Konekt */}
      <section className="rounded-xl bg-slate-50 border p-4" data-testid="drawer-contact-konekt">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Need Help?</div>
        <a
          href="tel:+255000000000"
          className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4565] transition"
          data-testid="call-sales-btn"
        >
          <Phone className="w-4 h-4" /> Call {brand_name} Operations
        </a>
      </section>
    </div>
  );
}
