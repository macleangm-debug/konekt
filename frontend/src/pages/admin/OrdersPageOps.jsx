import React, { useEffect, useState, useCallback } from "react";
import { Package, Search, ArrowRight, ClipboardList, Boxes, Factory, FileText, Eye, Download, Clock, ChevronDown, ChevronUp, User, MessageSquare, Activity, ArrowRightCircle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import api from "@/lib/api";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";
import { useConfirmModal } from "@/contexts/ConfirmModalContext";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const orderStatuses = ["pending","confirmed","awaiting_payment","in_review","approved","in_production","quality_check","ready_for_dispatch","in_transit","delivered","cancelled"];
const statusColors = {
  pending: "bg-slate-100 text-slate-700", confirmed: "bg-blue-100 text-blue-700", awaiting_payment: "bg-yellow-100 text-yellow-700",
  in_review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", in_production: "bg-purple-100 text-purple-700",
  quality_check: "bg-indigo-100 text-indigo-700", ready_for_dispatch: "bg-teal-100 text-teal-700", in_transit: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700", paid: "bg-green-100 text-green-700",
};

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }
function fmtDateTime(v) { try { const d = new Date(v); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { return "-"; } }

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
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center" data-testid="timeline-empty">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-medium">No status changes recorded yet</p>
        <p className="text-xs text-slate-300 mt-1">Changes will appear here as the order progresses</p>
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid="status-timeline">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">{entries.length} event{entries.length !== 1 ? "s" : ""}</div>
        <div className="text-xs text-slate-400">Newest first</div>
      </div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" />
        {entries.map((entry, idx) => {
          const src = sourceStyles[entry.source] || sourceStyles.system_auto;
          const roleCls = roleStyles[entry.role] || roleStyles.system;
          const isExpanded = expandedIdx === idx;
          const hasLongNote = entry.note && entry.note.length > 80;

          return (
            <div
              key={idx}
              className="relative pl-10 pb-5 last:pb-0 group"
              data-testid={`timeline-entry-${idx}`}
            >
              {/* Dot */}
              <div className={`absolute left-[9px] top-1.5 w-[13px] h-[13px] rounded-full border-2 border-white ring-2 ${
                entry.new_status === "cancelled" ? "bg-red-400 ring-red-200" :
                entry.new_status === "delivered" ? "bg-emerald-400 ring-emerald-200" :
                entry.new_status === "delayed" ? "bg-amber-400 ring-amber-200" :
                "bg-[#20364D] ring-slate-200"
              }`} />

              <div className="rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors p-3 shadow-sm">
                {/* Top row: timestamp + source */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-medium" data-testid={`timeline-timestamp-${idx}`}>
                    {fmtDateTime(entry.timestamp)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${src.bg} ${src.text} ${src.border}`} data-testid={`timeline-source-${idx}`}>
                    {src.label}
                  </span>
                </div>

                {/* Status transition */}
                <div className="flex items-center gap-2 mb-2" data-testid={`timeline-status-change-${idx}`}>
                  {entry.previous_status ? (
                    <>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[entry.previous_status] || "bg-slate-100 text-slate-600"}`}>
                        {entry.previous_status.replace(/_/g, " ")}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </>
                  ) : null}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[entry.new_status] || "bg-slate-100 text-slate-600"}`}>
                    {(entry.new_status || "").replace(/_/g, " ")}
                  </span>
                </div>

                {/* Who + Role */}
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600 font-medium" data-testid={`timeline-user-${idx}`}>{entry.updated_by || "System"}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleCls}`} data-testid={`timeline-role-${idx}`}>
                    {(entry.role || "system")}
                  </span>
                  {entry.vendor_order_no && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 font-mono">
                      {entry.vendor_order_no}
                    </span>
                  )}
                </div>

                {/* Note */}
                {entry.note && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-slate-500 ${!isExpanded && hasLongNote ? "line-clamp-2" : ""}`} data-testid={`timeline-note-${idx}`}>
                          {entry.note}
                        </p>
                        {hasLongNote && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedIdx(isExpanded ? null : idx); }}
                            className="text-[10px] text-[#D4A843] font-semibold mt-1 hover:underline"
                            data-testid={`timeline-expand-${idx}`}
                          >
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

function OrderDrawer({ order, onClose, onStatusChange, onReserve, onAssignTask, onSendToProduction, onConvertToInvoice }) {
  const [statusNote, setStatusNote] = useState("");
  const [reserveForm, setReserveForm] = useState({ sku: "", quantity: 1 });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", department: "", due_date: "", priority: "medium" });
  const [productionForm, setProductionForm] = useState({ production_type: "printing", assigned_to: "", priority: "medium", due_date: "", notes: "" });
  const [activeTab, setActiveTab] = useState("timeline");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);

  useEffect(() => {
    if (!order) return;
    const oid = order.id || order.order_number;
    if (oid) {
      api.get(`/api/admin/orders-ops/${oid}/purchase-orders`).then(r => {
        const pos = r.data?.purchase_orders || [];
        setPurchaseOrders(pos);
        // Fetch audit trails from all vendor orders
        Promise.all(
          pos.map(po =>
            api.get(`/api/sales/orders/${po.id || po.vendor_order_no}/audit-trail`)
              .then(res => (res.data?.audit_trail || []).map(e => ({ ...e, vendor_order_no: po.vendor_order_no || po.id?.slice(0, 8) })))
              .catch(() => [])
          )
        ).then(trails => {
          const all = trails.flat();
          // Include order-level audit trail if present
          if (order.status_audit_trail?.length) {
            order.status_audit_trail.forEach(e => {
              all.push({ ...e, vendor_order_no: null });
            });
          }
          // Also add order.status_history entries (legacy format)
          if (order.status_history?.length) {
            order.status_history.forEach(h => {
              // Skip if already covered by status_audit_trail
              const isDupe = all.some(a => a.timestamp === h.timestamp && a.new_status === h.status);
              if (!isDupe) {
                all.push({
                  previous_status: "",
                  new_status: h.status,
                  updated_by: h.changed_by || h.updated_by || "System",
                  role: h.role || "admin",
                  note: h.note || "",
                  source: h.source || "system_auto",
                  timestamp: h.timestamp,
                  vendor_order_no: null,
                });
              }
            });
          }
          all.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
          setAuditEntries(all);
        });
      }).catch(() => {});
    }
  }, [order]);

  if (!order) return null;
  const status = order.status || order.current_status || "pending";
  const items = order.items || [];

  const statusBadge = (
    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${statusColors[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );

  return (
    <StandardDrawerShell
      open={!!order}
      onClose={onClose}
      title={order.order_number || order.id}
      subtitle="Order Detail"
      badge={statusBadge}
      width="xl"
      testId="admin-order-drawer"
    >
      <div className="space-y-5">
        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-slate-50/50">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Customer</div>
            <div className="font-semibold text-[#20364D] text-sm">{order.customer_name || "—"}</div>
            <div className="text-xs text-slate-500">{order.customer_email || ""}</div>
          </div>
          <div className="rounded-xl border p-4 bg-slate-50/50">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Amount</div>
            <div className="font-semibold text-[#20364D] text-sm">{money(order.total)}</div>
            <div className="text-xs text-slate-500">{fmtDate(order.created_at)}</div>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-[#20364D] text-sm">Items</div>
            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div><div className="font-medium text-[#20364D]">{item.name || item.product_name || `Item ${idx+1}`}</div><div className="text-xs text-slate-400">Qty {item.quantity || 1}</div></div>
                  <div className="font-semibold text-[#20364D]">{money(item.total || ((item.price || 0) * (item.quantity || 1)))}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Orders */}
        {purchaseOrders.length > 0 && (
          <div className="rounded-xl border overflow-hidden" data-testid="purchase-orders-section">
            <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-[#20364D] text-sm">Vendor Purchase Orders</div>
            <div className="divide-y divide-slate-100">
              {purchaseOrders.map((po, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{po.vendor_name || `Vendor ${idx+1}`}</div>
                    <div className="text-xs text-slate-400">{po.vendor_order_no || po.id?.slice(0,8)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[po.status] || "bg-slate-100 text-slate-700"}`}>
                      {(po.status || "assigned").replace(/_/g, " ")}
                    </span>
                    <a
                      href={`${API_URL}/api/pdf/purchase-orders/${po.id || po.vendor_order_no}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#20364D] text-white px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[#2a4a66] transition-colors"
                      data-testid={`download-po-pdf-${idx}`}
                    >
                      <Download className="w-3 h-3" /> PO
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Tabs */}
        <div className="flex border-b border-slate-200 gap-1">
          {[{id: "timeline", label: "Timeline", icon: Activity}, {id: "info", label: "Status"}, {id: "inventory", label: "Inventory"}, {id: "tasks", label: "Tasks"}, {id: "production", label: "Production"}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-1.5 ${activeTab === tab.id ? "bg-white border border-b-white border-slate-200 text-[#20364D] -mb-px" : "text-slate-500 hover:text-slate-700"}`}>
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "timeline" && (
          <StatusTimeline entries={auditEntries} />
        )}

        {activeTab === "info" && (
          <div className="space-y-3">
            <textarea className="w-full border rounded-xl px-4 py-3 text-sm" placeholder="Status note (optional)" rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            <select className="w-full border rounded-xl px-4 py-3" value={status} onChange={(e) => { onStatusChange(order.id, e.target.value, statusNote); setStatusNote(""); }} data-testid="order-status-select">
              {orderStatuses.map((s) => (<option key={s} value={s}>{s.replace(/_/g, " ")}</option>))}
            </select>
            <button type="button" onClick={() => onConvertToInvoice(order.id)} className="w-full rounded-xl bg-[#D4A843] text-slate-900 py-3 font-semibold hover:bg-[#c49936] transition flex items-center justify-center gap-2" data-testid="convert-to-invoice-btn"><ArrowRight className="w-4 h-4" /> Convert to Invoice</button>
          </div>
        )}

        {activeTab === "inventory" && (
          <form onSubmit={(e) => { e.preventDefault(); onReserve(order.id, reserveForm); setReserveForm({ sku: "", quantity: 1 }); }} className="space-y-3">
            <input className="w-full border rounded-xl px-4 py-3" placeholder="SKU" value={reserveForm.sku} onChange={(e) => setReserveForm({ ...reserveForm, sku: e.target.value })} data-testid="reserve-sku-input" />
            <input className="w-full border rounded-xl px-4 py-3" type="number" min="1" placeholder="Quantity" value={reserveForm.quantity} onChange={(e) => setReserveForm({ ...reserveForm, quantity: e.target.value })} data-testid="reserve-qty-input" />
            <button type="submit" className="w-full rounded-xl bg-[#20364D] text-white py-3 font-semibold hover:bg-[#2a4a66] transition" data-testid="reserve-btn">Reserve Stock</button>
          </form>
        )}

        {activeTab === "tasks" && (
          <form onSubmit={(e) => { e.preventDefault(); onAssignTask(order.id, taskForm); setTaskForm({ title: "", description: "", assigned_to: "", department: "", due_date: "", priority: "medium" }); }} className="space-y-3">
            <input className="w-full border rounded-xl px-4 py-3" placeholder="Task title *" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            <textarea className="w-full border rounded-xl px-4 py-3" placeholder="Description" rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-xl px-4 py-3" placeholder="Assigned to" value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Department" value={taskForm.department} onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-xl px-4 py-3" type="datetime-local" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              <select className="border rounded-xl px-4 py-3" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#20364D] text-white py-3 font-semibold hover:bg-[#2a4a66] transition">Assign Task</button>
          </form>
        )}

        {activeTab === "production" && (
          <form onSubmit={(e) => { e.preventDefault(); onSendToProduction(order, productionForm); setProductionForm({ production_type: "printing", assigned_to: "", priority: "medium", due_date: "", notes: "" }); }} className="space-y-3">
            <input className="w-full border rounded-xl px-4 py-3" placeholder="Production type" value={productionForm.production_type} onChange={(e) => setProductionForm({ ...productionForm, production_type: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-xl px-4 py-3" placeholder="Assigned to" value={productionForm.assigned_to} onChange={(e) => setProductionForm({ ...productionForm, assigned_to: e.target.value })} />
              <select className="border rounded-xl px-4 py-3" value={productionForm.priority} onChange={(e) => setProductionForm({ ...productionForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            </div>
            <input className="w-full border rounded-xl px-4 py-3" type="datetime-local" value={productionForm.due_date} onChange={(e) => setProductionForm({ ...productionForm, due_date: e.target.value })} />
            <textarea className="w-full border rounded-xl px-4 py-3" placeholder="Production notes" rows={2} value={productionForm.notes} onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })} />
            <button type="submit" className="w-full rounded-xl bg-[#D4A843] text-slate-900 py-3 font-semibold hover:bg-[#c49936] transition" data-testid="send-to-production-btn">Move to Production</button>
          </form>
        )}

      </div>
    </StandardDrawerShell>
  );
}

export default function OrdersPageOps() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { confirmAction } = useConfirmModal();

  const loadOrders = async () => {
    try { setLoading(true); const res = await adminApi.getOrders(); setOrders(res.data?.orders || res.data || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { loadOrders(); }, []);

  const changeStatus = async (orderId, status, note) => {
    try { await adminApi.updateOrderStatus(orderId, status, note || null); loadOrders(); } catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };
  const reserveInventory = async (orderId, form) => {
    try { await adminApi.reserveInventory({ order_id: orderId, items: [{ sku: form.sku, quantity: Number(form.quantity) }] }); loadOrders(); alert("Inventory reserved!"); } catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };
  const assignTask = async (orderId, form) => {
    try { await adminApi.assignOrderTask({ order_id: orderId, title: form.title, description: form.description || null, assigned_to: form.assigned_to || null, department: form.department || null, due_date: form.due_date || null, priority: form.priority }); alert("Task assigned!"); } catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };
  const sendToProduction = async (order, form) => {
    try { await adminApi.sendOrderToProduction({ order_id: order.id, order_number: order.order_number || order.id, customer_name: order.customer_name || "Customer", production_type: form.production_type, assigned_to: form.assigned_to || null, priority: form.priority, due_date: form.due_date || null, notes: form.notes || null, status: "queued" }); loadOrders(); alert("Sent to production!"); } catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };
  const convertToInvoice = async (orderId) => {
    confirmAction({
      title: "Create Invoice?",
      message: "This will generate an invoice from this order.",
      confirmLabel: "Create Invoice",
      tone: "success",
      onConfirm: async () => {
        try { await adminApi.convertOrderToInvoice(orderId, null); alert("Invoice created!"); } catch (err) { alert(err.response?.data?.detail || "Failed"); }
      },
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !searchTerm || [o.order_number, o.customer_name, o.customer_email].filter(Boolean).join(" ").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (o.status || o.current_status) === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6" data-testid="orders-ops-page">
      <div><h1 className="text-2xl font-bold text-[#20364D]">Order Operations</h1><p className="text-slate-500 text-sm">Manage orders, reserve inventory, assign tasks, send to production</p></div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4A843] outline-none" data-testid="search-orders-input" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4A843] outline-none" data-testid="filter-order-status">
          <option value="">All Statuses</option>
          {orderStatuses.map((s) => (<option key={s} value={s}>{s.replace(/_/g, " ")}</option>))}
        </select>
      </div>

      {/* Orders Table — Payment Queue Pattern */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-orders-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No orders found</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)} data-testid={`order-row-${order.id}`}>
                  <td className="px-6 py-4 text-[#20364D]">{fmtDate(order.created_at)}</td>
                  <td className="px-6 py-4 font-semibold text-[#20364D]">{order.order_number || `#${(order.id || "").slice(-6)}`}</td>
                  <td className="px-6 py-4 text-slate-600">{order.customer_name || "—"}</td>
                  <td className="px-6 py-4 font-semibold text-[#20364D]">{money(order.total)}</td>
                  <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[order.status || order.current_status] || "bg-slate-100 text-slate-700"}`}>{(order.status || order.current_status || "pending").replace(/_/g, " ")}</span></td>
                  <td className="px-6 py-4"><button type="button" className="inline-flex items-center gap-2 text-[#20364D] font-semibold text-sm hover:underline"><Eye className="w-4 h-4" /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={changeStatus} onReserve={reserveInventory} onAssignTask={assignTask} onSendToProduction={sendToProduction} onConvertToInvoice={convertToInvoice} />
    </div>
  );
}
