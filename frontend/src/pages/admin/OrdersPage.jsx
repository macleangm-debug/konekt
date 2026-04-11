import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import api from "../../lib/api";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";
import AssignmentReasonBadge from "../../components/assignment/AssignmentReasonBadge";
import AssignmentDecisionDrawer from "../../components/assignment/AssignmentDecisionDrawer";
import { ShoppingCart, Truck, CheckCircle, Clock, Package, ClipboardList, Eye, Download, Activity, ArrowRight, User, MessageSquare } from "lucide-react";
import { safeDisplay, safeMoney, cellClass } from "../../utils/safeDisplay";

import { formatDate, formatDateShort } from "../../utils/dateFormat";
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const statusColors = {
  pending: "bg-slate-100 text-slate-700", confirmed: "bg-blue-100 text-blue-700", awaiting_payment: "bg-yellow-100 text-yellow-700",
  in_review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", in_production: "bg-purple-100 text-purple-700",
  quality_check: "bg-indigo-100 text-indigo-700", ready_for_dispatch: "bg-teal-100 text-teal-700", in_transit: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700", assigned: "bg-blue-100 text-blue-700",
  acknowledged: "bg-blue-50 text-blue-600", ready: "bg-teal-100 text-teal-700", delayed: "bg-amber-100 text-amber-700",
  dispatched: "bg-cyan-100 text-cyan-700", processing: "bg-slate-100 text-slate-600", completed: "bg-emerald-100 text-emerald-700",
};

const sourceStyles = {
  vendor_update: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Vendor Update" },
  vendor_confirmed: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Vendor Confirmed" },
  sales_follow_up: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Sales Follow-up" },
  admin_adjustment: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Admin Adjustment" },
  system_auto: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", label: "System" },
};

const roleStyles = {
  admin: "bg-red-50 text-red-700 border-red-200",
  sales: "bg-blue-50 text-blue-700 border-blue-200",
  vendor: "bg-purple-50 text-purple-700 border-purple-200",
  customer: "bg-green-50 text-green-700 border-green-200",
  system: "bg-slate-50 text-slate-600 border-slate-200",
};

function StatusTimeline({ entries }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center" data-testid="timeline-empty">
        <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400 font-medium">No status changes recorded yet</p>
        <p className="text-xs text-slate-300 mt-1">Changes will appear here as the order progresses</p>
      </div>
    );
  }

  return (
    <div data-testid="status-timeline">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">{entries.length} event{entries.length !== 1 ? "s" : ""}</div>
        <div className="text-xs text-slate-400">Newest first</div>
      </div>
      <div className="relative">
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" />
        {entries.map((entry, idx) => {
          const src = sourceStyles[entry.source] || sourceStyles.system_auto;
          const roleCls = roleStyles[entry.role] || roleStyles.system;
          const isExpanded = expandedIdx === idx;
          const hasLongNote = entry.note && entry.note.length > 80;

          return (
            <div key={idx} className="relative pl-10 pb-4 last:pb-0" data-testid={`timeline-entry-${idx}`}>
              <div className={`absolute left-[9px] top-1.5 w-[13px] h-[13px] rounded-full border-2 border-white ring-2 ${
                entry.new_status === "cancelled" ? "bg-red-400 ring-red-200" :
                entry.new_status === "delivered" || entry.new_status === "completed" ? "bg-emerald-400 ring-emerald-200" :
                entry.new_status === "delayed" ? "bg-amber-400 ring-amber-200" :
                "bg-[#20364D] ring-slate-200"
              }`} />
              <div className="rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 font-medium" data-testid={`timeline-timestamp-${idx}`}>{formatDate(entry.timestamp)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${src.bg} ${src.text} ${src.border}`} data-testid={`timeline-source-${idx}`}>{src.label}</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5" data-testid={`timeline-status-change-${idx}`}>
                  {entry.previous_status ? (
                    <>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[entry.previous_status] || "bg-slate-100 text-slate-600"}`}>{entry.previous_status.replace(/_/g, " ")}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </>
                  ) : null}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[entry.new_status] || "bg-slate-100 text-slate-600"}`}>{(entry.new_status || "").replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600 font-medium" data-testid={`timeline-user-${idx}`}>{entry.updated_by || "System"}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleCls}`} data-testid={`timeline-role-${idx}`}>{entry.role || "system"}</span>
                  {entry.vendor_order_no && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 font-mono">{entry.vendor_order_no}</span>
                  )}
                </div>
                {entry.note && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-slate-500 ${!isExpanded && hasLongNote ? "line-clamp-2" : ""}`} data-testid={`timeline-note-${idx}`}>{entry.note}</p>
                        {hasLongNote && (
                          <button type="button" onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-[10px] text-[#D4A843] font-semibold mt-1 hover:underline" data-testid={`timeline-expand-${idx}`}>
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [
  { key: "", label: "All Orders", icon: ShoppingCart },
  { key: "new", label: "New", icon: Clock },
  { key: "assigned", label: "Assigned", icon: Package },
  { key: "in_progress", label: "In Progress", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showAssignmentDrawer, setShowAssignmentDrawer] = useState(false);
  const [assignmentExplain, setAssignmentExplain] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const load = () => {
    setLoading(true);
    adminApi.getOrders({ search: search || undefined, tab: tab || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { adminApi.getOrdersStats().then(r => setStats(r.data)).catch(() => {}); }, []);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    setAssignmentExplain(null);
    setAuditEntries([]);
    setPurchaseOrders([]);
    try {
      const res = await adminApi.getOrder(row.id);
      setDetail(res.data);
      const order = res.data?.order || res.data;

      // Fetch assignment explanation in parallel with audit trail
      try {
        const explainRes = await api.get(`/api/admin/assignment/explain/${row.id}`);
        setAssignmentExplain(explainRes.data);
      } catch {}

      // Fetch purchase orders and audit trails
      try {
        const poRes = await api.get(`/api/admin/orders-ops/${row.id}/purchase-orders`);
        const pos = poRes.data?.purchase_orders || [];
        setPurchaseOrders(pos);

        const trails = await Promise.all(
          pos.map(po =>
            api.get(`/api/sales/orders/${po.id || po.vendor_order_no}/audit-trail`)
              .then(r => (r.data?.audit_trail || []).map(e => ({ ...e, vendor_order_no: po.vendor_order_no || po.id?.slice(0, 8) })))
              .catch(() => [])
          )
        );
        const all = trails.flat();

        // Include order-level audit trail
        if (order?.status_audit_trail?.length) {
          order.status_audit_trail.forEach(e => all.push({ ...e, vendor_order_no: null }));
        }
        // Include legacy status_history
        if (order?.status_history?.length) {
          order.status_history.forEach(h => {
            const isDupe = all.some(a => a.timestamp === h.timestamp && a.new_status === h.status);
            if (!isDupe) {
              all.push({ previous_status: "", new_status: h.status, updated_by: h.changed_by || h.updated_by || "System", role: h.role || "admin", note: h.note || "", source: h.source || "system_auto", timestamp: h.timestamp, vendor_order_no: null });
            }
          });
        }
        all.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        setAuditEntries(all);
      } catch {}
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.updateOrderStatus(selected.id, { status: newStatus });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="orders-page">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#20364D]">Orders</h1>
        <p className="text-slate-500 mt-1 text-sm">Track orders from creation through fulfillment.</p>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="mb-4">
          <StandardSummaryCardsRow
            columns={5}
            cards={[
              { label: "Total", value: stats.total, icon: ClipboardList, accent: "slate", onClick: () => setTab(""), active: tab === "" },
              { label: "New", value: stats.new, icon: Clock, accent: "amber", onClick: () => setTab("new"), active: tab === "new" },
              { label: "Assigned", value: stats.assigned, icon: Package, accent: "blue", onClick: () => setTab("assigned"), active: tab === "assigned" },
              { label: "In Progress", value: stats.in_progress, icon: Truck, accent: "violet", onClick: () => setTab("in_progress"), active: tab === "in_progress" },
              { label: "Completed", value: stats.completed, icon: CheckCircle, accent: "emerald", onClick: () => setTab("completed"), active: tab === "completed" },
            ]}
          />
        </div>
      )}

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm" data-testid="orders-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase w-[12%]">Date</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase w-[16%]">Order #</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase w-[22%]">Customer</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell w-[14%]">Payer</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase text-right w-[12%]">Total</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase w-[12%]">Payment</th>
                  <th className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase w-[12%]">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...rows].sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0)).map((row) => (
                  <tr key={row.id} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`order-row-${row.id}`}>
                    <td className="px-3 py-3 text-xs text-slate-500">{safeDisplay(formatDateShort(row.created_at), "date")}</td>
                    <td className="px-3 py-3 font-semibold text-[#20364D] truncate">{safeDisplay(row.order_number, "code")}</td>
                    <td className="px-3 py-3">
                      <CustomerLinkCell customerId={row.customer_id} customerName={row.customer_name} />
                    </td>
                    <td className={`px-3 py-3 hidden md:table-cell truncate ${cellClass(row.payer_name)}`}>{safeDisplay(row.payer_name, "person")}</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#20364D]">{safeMoney(row.total_amount || row.total)}</td>
                    <td className="px-3 py-3"><StatusBadge status={safeDisplay(row.payment_status || row.payment_state, "payment")} /></td>
                    <td className="px-3 py-3"><StatusBadge status={safeDisplay(row.status || row.fulfillment_state, "status")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ShoppingCart} title="No orders found" description="Orders are created automatically when payment proofs are approved." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Order Detail" subtitle={selected?.order_number}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            {/* A. Order Summary */}
            <section className="rounded-2xl border p-4" data-testid="drawer-order-summary">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Order Summary</p>
              <div className="grid gap-2 text-sm text-slate-700">
                <div><strong>Order No:</strong> {safeDisplay(detail.order?.order_number, "code")}</div>
                <div><strong>Date:</strong> {safeDisplay(formatDateShort(detail.order?.created_at), "date")}</div>
                <div><strong>Source Type:</strong> <span className="capitalize">{safeDisplay(detail.order?.source_type || detail.order?.type, "text")}</span></div>
                <div><strong>Linked Invoice:</strong> {safeDisplay(detail.invoice?.invoice_number, "code")}</div>
                {detail.quote && <div><strong>Linked Quote:</strong> {safeDisplay(detail.quote.quote_number, "code")}</div>}
                <div><strong>Amount:</strong> <span className="font-semibold text-[#20364D]">{safeMoney(detail.order?.total_amount || detail.order?.total)}</span></div>
                <div><strong>Approved By:</strong> {safeDisplay(detail.payment_proof?.approved_by || detail.order?.approved_by, "person")}</div>
              </div>
            </section>

            {/* B. Customer */}
            <section className="rounded-2xl border p-4" data-testid="drawer-customer">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Customer</p>
              <div className="grid gap-2 text-sm text-slate-700">
                <div><strong>Name:</strong> {safeDisplay(detail.customer?.full_name || detail.order?.customer_name, "person")}</div>
                <div><strong>Email:</strong> {safeDisplay(detail.customer?.email || detail.order?.customer_email, "email")}</div>
                <div><strong>Phone:</strong> {safeDisplay(detail.customer?.phone || detail.order?.customer_phone, "phone")}</div>
              </div>
            </section>

            {/* C. Assignment */}
            <section className="rounded-2xl border p-4" data-testid="drawer-assignment">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Assignment</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <div className="text-xs text-slate-500 font-semibold mb-1">Sales Person</div>
                  <div><strong>Name:</strong> {detail.sales_user?.full_name || detail.sales_assignment?.sales_owner_name || "Unassigned"}</div>
                  {detail.sales_user?.email && <div><strong>Email:</strong> {detail.sales_user.email}</div>}
                  {detail.sales_user?.phone && <div><strong>Phone:</strong> {detail.sales_user.phone}</div>}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold mb-1">Vendor</div>
                  {detail.vendor_orders && detail.vendor_orders.length > 0 ? detail.vendor_orders.map((vo, idx) => (
                    <div key={idx} className="mb-2">
                      <div><strong>Name:</strong> {vo.vendor_name || "-"}</div>
                      {vo.vendor_email && <div><strong>Email:</strong> {vo.vendor_email}</div>}
                      {vo.vendor_phone && <div><strong>Phone:</strong> {vo.vendor_phone}</div>}
                      <div className="mt-1"><StatusBadge status={vo.status} /></div>
                    </div>
                  )) : <div className="text-slate-400">No vendor assigned</div>}
                </div>
              </div>
              {/* Assignment Reasoning */}
              {assignmentExplain && (
                <div className="mt-3 pt-3 border-t border-slate-100" data-testid="assignment-reasoning-inline">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 font-semibold">Assignment Reasoning</span>
                    <AssignmentReasonBadge reasonCode={assignmentExplain.reason_code} />
                  </div>
                  <div className="text-xs text-slate-500">{assignmentExplain.reason_detail}</div>
                  {assignmentExplain.fallback_reason && (
                    <div className="text-xs text-amber-600 mt-1">Fallback: {assignmentExplain.fallback_reason}</div>
                  )}
                  {assignmentExplain.item_assignments && assignmentExplain.item_assignments.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {assignmentExplain.item_assignments.map((ia, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">{ia.product_name || `Item ${ia.item_index + 1}`}:</span>
                          <span className="text-slate-700">{ia.vendor_name}</span>
                          <AssignmentReasonBadge reasonCode={ia.reason_code} />
                          {ia.reserved && <span className="text-emerald-600">({ia.reserved_qty} reserved)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAssignmentDrawer(true)}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    data-testid="view-full-reasoning-btn"
                  >
                    <Eye className="h-3 w-3" /> View full reasoning
                  </button>
                </div>
              )}
            </section>
            {detail.payment_proof && (
              <section className="rounded-2xl border p-4" data-testid="drawer-payment">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Payment</p>
                <div className="grid gap-2 text-sm text-slate-700">
                  <div><strong>Payment Status:</strong> <StatusBadge status={detail.payment_proof.payment_status} /></div>
                  <div><strong>Payer Name:</strong> {detail.payment_proof.payer_name || "-"}</div>
                  <div><strong>Approved By:</strong> {detail.payment_proof.approved_by || "-"}</div>
                  <div><strong>Approval Date:</strong> {detail.payment_proof.approved_at ? formatDateShort(detail.payment_proof.approved_at) : "-"}</div>
                </div>
              </section>
            )}

            {/* E. Fulfillment / Items */}
            {detail.order?.items && detail.order.items.length > 0 && (
              <section className="rounded-2xl border p-4" data-testid="drawer-fulfillment">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Fulfillment ({detail.order.items.length} items)</p>
                <div className="space-y-2">
                  {detail.order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <div>
                        <span className="text-slate-700">{item.name || item.product_name || "Item"}</span>
                        <span className="text-slate-400 ml-2">x{item.quantity || 1}</span>
                        {item.variant && <div className="text-xs text-slate-400">{item.variant}</div>}
                        {item.brief && <div className="text-xs text-slate-400">{item.brief}</div>}
                      </div>
                      <span className="font-medium text-[#20364D]">{money(item.line_total || item.total || item.unit_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3"><strong>Fulfillment Status:</strong> <StatusBadge status={detail.order?.status} /></div>
              </section>
            )}

            {/* E.5. Vendor Purchase Orders */}
            {purchaseOrders.length > 0 && (
              <section className="rounded-2xl border p-4" data-testid="drawer-purchase-orders">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Vendor Purchase Orders</p>
                <div className="space-y-2">
                  {purchaseOrders.map((po, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <div>
                        <div className="font-medium text-[#20364D]">{po.vendor_name || `Vendor ${idx+1}`}</div>
                        <div className="text-xs text-slate-400">{po.vendor_order_no || po.id?.slice(0,8)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={po.status || "assigned"} />
                        <a href={`${API_URL}/api/pdf/purchase-orders/${po.id || po.vendor_order_no}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#20364D] text-white px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[#2a4a66] transition-colors"
                          data-testid={`download-po-pdf-${idx}`}>
                          <Download className="w-3 h-3" /> PO
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* F. Status Timeline — Full Audit Trail */}
            <section className="rounded-2xl border p-4" data-testid="drawer-timeline">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#D4A843]" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status Timeline</p>
              </div>
              <StatusTimeline entries={auditEntries} />
            </section>

            {/* G. Admin Actions */}
            <section className="pt-4 border-t border-slate-200 space-y-3" data-testid="drawer-admin-actions">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Admin Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {["assigned", "in_progress", "quality_check", "ready_for_pickup", "picked_up", "in_transit", "delivered", "completed", "cancelled"].map((s) => (
                  <button key={s} onClick={() => handleStatusUpdate(s)} disabled={actionLoading || detail.order?.status === s}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition-colors disabled:opacity-40 ${
                      detail.order?.status === s ? "bg-[#20364D] text-white border-[#20364D]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    data-testid={`status-btn-${s}`}
                  >{s.replace(/_/g, " ")}</button>
                ))}
              </div>
            </section>

            {/* Commissions */}
            {detail.commissions && detail.commissions.length > 0 && (
              <section className="rounded-2xl border p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Commissions ({detail.commissions.length})</p>
                <div className="space-y-2">
                  {detail.commissions.map((c, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[#20364D]">{c.recipient_name || c.type || "Commission"}</p>
                        <p className="text-xs text-slate-500">{c.type || ""} &middot; {c.status || ""}</p>
                      </div>
                      <span className="font-semibold text-green-700 text-sm">{money(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Could not load details.</p>
        )}
      </DetailDrawer>
      <AssignmentDecisionDrawer
        orderId={selected?.id}
        open={showAssignmentDrawer}
        onClose={() => setShowAssignmentDrawer(false)}
      />
    </div>
  );
}
