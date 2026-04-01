import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import { ShoppingCart, Truck, CheckCircle, Clock, Package, ClipboardList } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

function StatCard({ label, value, icon: Icon, accent, onClick, active }) {
  const colors = {
    slate: { border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-600" },
    amber: { border: "border-amber-200", iconBg: "bg-amber-100", text: "text-amber-700" },
    blue: { border: "border-blue-200", iconBg: "bg-blue-100", text: "text-blue-700" },
    violet: { border: "border-violet-200", iconBg: "bg-violet-100", text: "text-violet-700" },
    emerald: { border: "border-emerald-200", iconBg: "bg-emerald-100", text: "text-emerald-700" },
  };
  const c = colors[accent] || colors.slate;
  return (
    <button
      onClick={onClick}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${c.border} ${active ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value ?? 0}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </button>
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
    try {
      const res = await adminApi.getOrder(row.id);
      setDetail(res.data);
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4" data-testid="orders-stats-cards">
          <StatCard label="Total" value={stats.total} icon={ClipboardList} accent="slate" onClick={() => setTab("")} active={tab === ""} />
          <StatCard label="New" value={stats.new} icon={Clock} accent="amber" onClick={() => setTab("new")} active={tab === "new"} />
          <StatCard label="Assigned" value={stats.assigned} icon={Package} accent="blue" onClick={() => setTab("assigned")} active={tab === "assigned"} />
          <StatCard label="In Progress" value={stats.in_progress} icon={Truck} accent="violet" onClick={() => setTab("in_progress")} active={tab === "in_progress"} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle} accent="emerald" onClick={() => setTab("completed")} active={tab === "completed"} />
        </div>
      )}

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="orders-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Payer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...rows].sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0)).map((row) => (
                  <tr key={row.id} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`order-row-${row.id}`}>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(row.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.order_number || "-"}</td>
                    <td className="px-4 py-3">
                      <CustomerLinkCell customerId={row.customer_id} customerName={row.customer_name} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{row.payer_name || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(row.total_amount || row.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.payment_status || row.payment_state || "paid"} /></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status || row.fulfillment_state} /></td>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Order Summary</p>
              <div className="grid gap-2 text-sm text-slate-700">
                <div><strong>Order No:</strong> {detail.order?.order_number || "-"}</div>
                <div><strong>Date:</strong> {fmtDate(detail.order?.created_at)}</div>
                <div><strong>Source Type:</strong> <span className="capitalize">{detail.order?.source_type || detail.order?.type || "-"}</span></div>
                <div><strong>Linked Invoice:</strong> {detail.invoice?.invoice_number || "-"}</div>
                {detail.quote && <div><strong>Linked Quote:</strong> {detail.quote.quote_number || "-"}</div>}
                <div><strong>Amount:</strong> <span className="font-semibold text-[#20364D]">{money(detail.order?.total_amount || detail.order?.total)}</span></div>
                <div><strong>Approved By:</strong> {detail.payment_proof?.approved_by || detail.order?.approved_by || "-"}</div>
              </div>
            </section>

            {/* B. Customer */}
            <section className="rounded-2xl border p-4" data-testid="drawer-customer">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer</p>
              <div className="grid gap-2 text-sm text-slate-700">
                <div><strong>Name:</strong> {detail.customer?.full_name || detail.order?.customer_name || "-"}</div>
                <div><strong>Email:</strong> {detail.customer?.email || detail.order?.customer_email || "-"}</div>
                <div><strong>Phone:</strong> {detail.customer?.phone || detail.order?.customer_phone || "-"}</div>
              </div>
            </section>

            {/* C. Assignment */}
            <section className="rounded-2xl border p-4" data-testid="drawer-assignment">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Assignment</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <div className="text-xs text-slate-400 font-semibold mb-1">Sales Person</div>
                  <div><strong>Name:</strong> {detail.sales_user?.full_name || detail.sales_assignment?.sales_owner_name || "Unassigned"}</div>
                  {detail.sales_user?.email && <div><strong>Email:</strong> {detail.sales_user.email}</div>}
                  {detail.sales_user?.phone && <div><strong>Phone:</strong> {detail.sales_user.phone}</div>}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold mb-1">Vendor</div>
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
            </section>

            {/* D. Payment */}
            {detail.payment_proof && (
              <section className="rounded-2xl border p-4" data-testid="drawer-payment">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment</p>
                <div className="grid gap-2 text-sm text-slate-700">
                  <div><strong>Payment Status:</strong> <StatusBadge status={detail.payment_proof.payment_status} /></div>
                  <div><strong>Payer Name:</strong> {detail.payment_proof.payer_name || "-"}</div>
                  <div><strong>Approved By:</strong> {detail.payment_proof.approved_by || "-"}</div>
                  <div><strong>Approval Date:</strong> {detail.payment_proof.approved_at ? fmtDate(detail.payment_proof.approved_at) : "-"}</div>
                </div>
              </section>
            )}

            {/* E. Fulfillment / Items */}
            {detail.order?.items && detail.order.items.length > 0 && (
              <section className="rounded-2xl border p-4" data-testid="drawer-fulfillment">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fulfillment ({detail.order.items.length} items)</p>
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

            {/* F. Timeline / Progress */}
            {detail.events && detail.events.length > 0 && (
              <section className="rounded-2xl border p-4" data-testid="drawer-timeline">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Timeline</p>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {detail.events.map((ev, idx) => (
                    <div key={idx} className="flex gap-3 items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-[#20364D] shrink-0" />
                      <span className="text-slate-700 capitalize">{(ev.event || "").replace(/_/g, " ")}</span>
                      <span className="text-slate-400 ml-auto whitespace-nowrap">{fmtDate(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* G. Admin Actions */}
            <section className="pt-4 border-t border-slate-200 space-y-3" data-testid="drawer-admin-actions">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin Actions</p>
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Commissions ({detail.commissions.length})</p>
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
    </div>
  );
}
