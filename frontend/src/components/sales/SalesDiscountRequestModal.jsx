import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../../lib/api";
import {
  X, Loader2, AlertTriangle, Shield, Send, AlertOctagon
} from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const RISK_CONFIG = {
  safe: {
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700",
    icon: Shield, label: "Safe", badgeBg: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700",
    icon: AlertTriangle, label: "Warning", badgeBg: "bg-amber-100 text-amber-700",
  },
  critical: {
    bg: "bg-red-50", border: "border-red-200", text: "text-red-700",
    icon: AlertOctagon, label: "Critical", badgeBg: "bg-red-100 text-red-700",
  },
};

export default function SalesDiscountRequestModal({ isOpen, onClose, onSuccess, quoteRef, orderRef, customerName, customerEmail, standardPrice }) {
  const [form, setForm] = useState({
    quote_ref: quoteRef || "",
    order_ref: orderRef || "",
    customer_name: customerName || "",
    customer_email: customerEmail || "",
    discount_type: "percentage",
    discount_value: "",
    reason: "",
    notes: "",
    item_notes: "",
    urgency: "normal",
    expires_in_days: 7,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef(null);

  // Debounced preview call when discount value or type changes
  const fetchPreview = useCallback(async (discountValue, discountType, quoteRef, orderRef) => {
    const val = Number(discountValue);
    if (!val || val <= 0 || (!quoteRef && !orderRef)) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await api.post("/api/staff/discount-requests", {
        mode: "preview",
        quote_ref: quoteRef || "",
        order_ref: orderRef || "",
        discount_type: discountType,
        discount_value: val,
      });
      if (res.data?.ok && res.data.preview) {
        setPreview(res.data.preview);
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      fetchPreview(form.discount_value, form.discount_type, form.quote_ref, form.order_ref);
    }, 500);
    return () => clearTimeout(previewTimer.current);
  }, [form.discount_value, form.discount_type, form.quote_ref, form.order_ref, fetchPreview]);

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...prev,
        quote_ref: quoteRef || prev.quote_ref,
        order_ref: orderRef || prev.order_ref,
        customer_name: customerName || prev.customer_name,
        customer_email: customerEmail || prev.customer_email,
      }));
      setResult(null);
      setError("");
    }
  }, [isOpen, quoteRef, orderRef, customerName, customerEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      setError("Please enter a valid discount value");
      return;
    }
    if (!form.reason.trim()) {
      setError("Reason / justification is required");
      return;
    }
    if (!form.quote_ref && !form.order_ref) {
      setError("Please provide a Quote or Order reference");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/api/staff/discount-requests", {
        ...form,
        discount_value: Number(form.discount_value),
      });
      if (res.data?.ok) {
        setResult(res.data.request);
        if (onSuccess) onSuccess(res.data.request);
      } else {
        setError(res.data?.error || "Failed to submit request");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="discount-request-modal">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#0f172a]">Request Discount</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="close-modal-btn">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {result ? (
          // Success State
          <div className="px-6 py-8 text-center space-y-4" data-testid="discount-request-success">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${result.margin_safe ? "bg-emerald-100" : "bg-amber-100"}`}>
              {result.margin_safe ? (
                <Shield className="w-7 h-7 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">Request Submitted</p>
              <p className="text-sm text-slate-500 mt-1">ID: {result.request_id}</p>
            </div>
            {result.margin_warning && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                {result.margin_warning}
              </p>
            )}
            <p className="text-sm text-slate-500">Admin will review and respond.</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-[#1a2b3c] text-white text-sm font-medium hover:bg-[#2a3b4c] transition"
              data-testid="close-success-btn"
            >
              Done
            </button>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-center gap-2" data-testid="form-error">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* References */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Quote Ref</label>
                <input
                  type="text"
                  value={form.quote_ref}
                  onChange={(e) => setForm({ ...form, quote_ref: e.target.value })}
                  placeholder="QTN-..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="input-quote-ref"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Order Ref</label>
                <input
                  type="text"
                  value={form.order_ref}
                  onChange={(e) => setForm({ ...form, order_ref: e.target.value })}
                  placeholder="ORD-..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="input-order-ref"
                />
              </div>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="input-customer-email"
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Discount Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="select-discount-type"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (TZS)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Value {form.discount_type === "percentage" ? "(%)" : "(TZS)"}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 50000"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                data-testid="select-urgency"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Reason (required) */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reason / Justification *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why should this discount be approved?"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none resize-none"
                rows={3}
                data-testid="input-reason"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional context..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none resize-none"
                rows={2}
                data-testid="input-notes"
              />
            </div>

            {/* Item-Specific Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Item-Specific Notes (optional)</label>
              <input
                type="text"
                value={form.item_notes}
                onChange={(e) => setForm({ ...form, item_notes: e.target.value })}
                placeholder="e.g. Apply to branded caps only"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none"
                data-testid="input-item-notes"
              />
            </div>

            {/* Live Margin Risk Preview */}
            {(preview || previewLoading) && (
              <div data-testid="discount-risk-preview">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking margin impact...
                  </div>
                ) : preview && (() => {
                  const rl = preview.risk_level || "safe";
                  const rc = RISK_CONFIG[rl] || RISK_CONFIG.safe;
                  const RiskIcon = rc.icon;
                  return (
                    <div className={`rounded-xl border ${rc.border} ${rc.bg} p-3 space-y-2`}>
                      <div className="flex items-center gap-2">
                        <RiskIcon className={`w-4 h-4 ${rc.text}`} />
                        <span className={`text-xs font-bold uppercase ${rc.text}`}>{rc.label}</span>
                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.badgeBg}`} data-testid={`preview-risk-badge-${rl}`}>
                          {money(preview.remaining_margin_after_discount)} remaining
                        </span>
                      </div>
                      <p className={`text-xs ${rc.text}`}>{preview.risk_message}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                        <div>Max safe discount: <strong data-testid="preview-max-safe">{money(preview.max_safe_discount)}</strong></div>
                        <div>Requested: <strong className="text-red-600">-{money(preview.requested_discount)}</strong></div>
                        <div>Dist. margin: <strong>{money(preview.total_distributable_margin)}</strong></div>
                        <div>Op. margin: <strong>{money(preview.total_operational_margin)}</strong></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-[#1a2b3c] text-white text-sm font-semibold hover:bg-[#2a3b4c] disabled:opacity-50 transition flex items-center justify-center gap-2"
              data-testid="submit-discount-request-btn"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit Discount Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
