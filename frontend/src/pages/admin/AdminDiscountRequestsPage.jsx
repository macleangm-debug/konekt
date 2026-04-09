import React, { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import {
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  Loader2, Filter, Shield, TrendingDown, AlertOctagon
} from "lucide-react";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

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

const STATUS_STYLES = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending", icon: Clock },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Approved", icon: CheckCircle },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejected", icon: XCircle },
};

const URGENCY_STYLES = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return "-"; }
}

export default function AdminDiscountRequestsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [criticalConfirmed, setCriticalConfirmed] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await api.get(`/api/admin/discount-requests${params}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load discount requests", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDrawer = async (requestId) => {
    try {
      const res = await api.get(`/api/admin/discount-requests/${requestId}`);
      if (res.data?.ok) {
        setSelected(res.data.request);
        setDrawerOpen(true);
        setAdminNote("");
        setCriticalConfirmed(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (action) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.put(`/api/admin/discount-requests/${selected.request_id}/${action}`, {
        admin_note: adminNote,
      });
      setDrawerOpen(false);
      setSelected(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="discount-requests-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const items = data?.items || [];

  return (
    <div className="space-y-6" data-testid="admin-discount-requests-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Discount Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Review and manage sales discount requests</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="discount-kpi-row">
        {[
          { label: "Total", value: kpis.total || 0, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Pending", value: kpis.pending || 0, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Approved", value: kpis.approved || 0, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Rejected", value: kpis.rejected || 0, color: "text-red-700", bg: "bg-red-50" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.bg}`} data-testid={`kpi-${kpi.label.toLowerCase()}`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3" data-testid="discount-filters">
        <Filter className="w-4 h-4 text-slate-400" />
        {["", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setLoading(true); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              statusFilter === s
                ? "bg-[#1a2b3c] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            data-testid={`filter-${s || "all"}`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="discount-requests-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Sales Rep</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Reference</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Standard Price</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Discount</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Final Price</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Margin</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    No discount requests found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const st = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                  const StatusIcon = st.icon;
                  return (
                    <tr
                      key={item.request_id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => openDrawer(item.request_id)}
                      data-testid={`request-row-${item.request_id}`}
                    >
                      <td className="px-4 py-3 text-slate-600">{shortDate(item.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.sales_rep_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item.customer_name || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {item.quote_ref || item.order_ref || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{money(item.standard_price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        -{money(item.discount_amount)}
                        <span className="text-xs text-slate-400 ml-1">
                          ({item.discount_type === "percentage" ? `${item.discount_value}%` : "fixed"})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(item.proposed_final_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const rl = item.margin_impact?.risk_level || (item.margin_safe ? "safe" : "critical");
                          const rc = RISK_CONFIG[rl] || RISK_CONFIG.safe;
                          const RiskIcon = rc.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rc.badgeBg}`}>
                              <RiskIcon className="w-3 h-3" /> {rc.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{shortDate(item.updated_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <StandardDrawerShell
        open={drawerOpen && !!selected}
        onClose={() => setDrawerOpen(false)}
        title="Discount Request"
        subtitle={selected?.request_id || ""}
        testId="discount-detail-drawer"
        badge={selected && (() => {
          const st = STATUS_STYLES[selected.status] || STATUS_STYLES.pending;
          const Icon = st.icon;
          return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              <Icon className="w-3 h-3" />{st.label}
            </span>
          );
        })()}
        footer={selected?.status === "pending" ? (
          <div className="space-y-3">
            {/* Risk Overlay Panel */}
            {selected.margin_impact && (() => {
              const rl = selected.margin_impact?.risk_level || (selected.margin_safe ? "safe" : "critical");
              const rc = RISK_CONFIG[rl] || RISK_CONFIG.safe;
              const RiskIcon = rc.icon;
              const isCritical = rl === "critical";
              const isBlocked = isCritical && !criticalConfirmed;

              return (
                <div className={`rounded-xl border ${rc.border} ${rc.bg} p-3 space-y-2`} data-testid="risk-overlay-panel">
                  <div className="flex items-center gap-2">
                    <RiskIcon className={`w-4 h-4 ${rc.text}`} />
                    <span className={`text-xs font-bold uppercase ${rc.text}`}>{rc.label}</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.badgeBg}`} data-testid={`risk-badge-${rl}`}>
                      Margin: {money(selected.margin_impact.remaining_margin_after_discount)} remaining
                    </span>
                  </div>
                  <p className={`text-xs ${rc.text}`}>{selected.margin_impact.risk_message}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <div>Max safe discount: <strong>{money(selected.margin_impact.max_safe_discount)}</strong></div>
                    <div>Requested: <strong className="text-red-600">-{money(selected.margin_impact.requested_discount)}</strong></div>
                    <div>Dist. margin: <strong>{money(selected.margin_impact.total_distributable_margin)}</strong></div>
                    <div>Op. margin: <strong>{money(selected.margin_impact.total_operational_margin)}</strong></div>
                  </div>
                  {isCritical && (
                    <label className="flex items-center gap-2 text-xs text-red-700 font-medium cursor-pointer pt-1 border-t border-red-200 mt-1">
                      <input
                        type="checkbox"
                        checked={criticalConfirmed}
                        onChange={(e) => setCriticalConfirmed(e.target.checked)}
                        className="rounded border-red-300 text-red-600"
                        data-testid="critical-confirm-checkbox"
                      />
                      I confirm this discount exceeds safe limits and accept the margin impact
                    </label>
                  )}
                </div>
              );
            })()}

            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Admin note (optional)..."
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4A843]/40 focus:border-[#D4A843] outline-none resize-none"
              rows={2}
              data-testid="admin-note-input"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("approve")}
                disabled={actionLoading || (selected.margin_impact?.risk_level === "critical" && !criticalConfirmed)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                data-testid="approve-discount-btn"
              >
                {actionLoading ? "Processing..." : "Approve Discount"}
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                data-testid="reject-discount-btn"
              >
                {actionLoading ? "Processing..." : "Reject"}
              </button>
            </div>
          </div>
        ) : null}
      >
        {selected && (
          <div className="space-y-6">
            {/* Status + Urgency */}
            <div className="flex items-center gap-3">
              {selected.urgency && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${URGENCY_STYLES[selected.urgency] || URGENCY_STYLES.normal}`}>
                  {selected.urgency.charAt(0).toUpperCase() + selected.urgency.slice(1)}
                </span>
              )}
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="Sales Rep" value={selected.sales_rep_name} />
              <InfoBlock label="Customer" value={selected.customer_name} />
              <InfoBlock label="Quote Ref" value={selected.quote_ref || "-"} />
              <InfoBlock label="Order Ref" value={selected.order_ref || "-"} />
              <InfoBlock label="Standard Price" value={money(selected.standard_price)} />
              <InfoBlock label="Proposed Final" value={money(selected.proposed_final_price)} highlight />
            </div>

            {/* Discount Details */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Discount Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Type:</span>{" "}
                  <span className="font-medium capitalize">{selected.discount_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Value:</span>{" "}
                  <span className="font-medium">
                    {selected.discount_type === "percentage"
                      ? `${selected.discount_value}%`
                      : money(selected.discount_value)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Amount:</span>{" "}
                  <span className="font-bold text-red-600">-{money(selected.discount_amount)}</span>
                </div>
              </div>
            </div>

            {/* Margin Impact */}
            {selected.margin_impact && (() => {
              const rl = selected.margin_impact?.risk_level || (selected.margin_safe ? "safe" : "critical");
              const rc = RISK_CONFIG[rl] || RISK_CONFIG.safe;
              const RiskIcon = rc.icon;
              return (
                <div className={`rounded-xl border p-4 space-y-3 ${rc.border} ${rc.bg}`}
                  data-testid="margin-impact-block"
                >
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <RiskIcon className={`w-4 h-4 ${rc.text}`} />
                    Margin Impact
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.badgeBg}`}>{rc.label}</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Base Cost:</span> <span className="font-medium">{money(selected.margin_impact.total_base_cost)}</span></div>
                    <div><span className="text-slate-500">Op. Margin:</span> <span className="font-medium">{money(selected.margin_impact.total_operational_margin)}</span></div>
                    <div><span className="text-slate-500">Dist. Margin:</span> <span className="font-medium">{money(selected.margin_impact.total_distributable_margin)}</span></div>
                    <div><span className="text-slate-500">Max Safe Discount:</span> <span className="font-medium">{money(selected.margin_impact.max_safe_discount)}</span></div>
                    <div className="col-span-2"><span className="text-slate-500">After Discount:</span> <span className="font-medium">{money(selected.margin_impact.remaining_margin_after_discount)}</span></div>
                  </div>
                  {selected.margin_impact.risk_message && (
                    <p className={`text-xs mt-2 flex items-start gap-1.5 ${rc.text}`}>
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {selected.margin_impact.risk_message}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Reason & Notes */}
            <div className="space-y-3">
              {selected.reason && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reason / Justification</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.reason}</p>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.notes}</p>
                </div>
              )}
              {selected.item_notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Item-Specific Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.item_notes}</p>
                </div>
              )}
            </div>

            {/* Admin Review */}
            {selected.reviewed_by && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Admin Review</p>
                <p className="text-sm"><span className="text-slate-500">By:</span> <span className="font-medium">{selected.reviewed_by}</span></p>
                <p className="text-sm"><span className="text-slate-500">At:</span> {shortDate(selected.reviewed_at)}</p>
                {selected.admin_note && <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mt-2">{selected.admin_note}</p>}
              </div>
            )}

            {/* Expiry */}
            {selected.expires_at && (
              <p className="text-xs text-slate-400">
                Expires: {shortDate(selected.expires_at)}
              </p>
            )}
          </div>
        )}
      </StandardDrawerShell>
    </div>
  );
}

function InfoBlock({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? "text-[#D4A843] font-bold" : "text-slate-800"}`}>
        {value || "-"}
      </p>
    </div>
  );
}
