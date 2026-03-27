import React, { useEffect, useMemo, useState } from "react";
import { Package, Search, RefreshCw, AlertCircle } from "lucide-react";
import partnerApi from "../../lib/partnerApi";
import VendorOrderDrawer from "../../components/partner/VendorOrderDrawer";

const STATUS_OPTIONS = [
  { value: "all", label: "All Orders" },
  { value: "ready_to_fulfill", label: "Ready" },
  { value: "pending_payment_confirmation", label: "Pending Payment" },
  { value: "in_progress", label: "In Progress" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "completed", label: "Completed" },
  { value: "issue_reported", label: "Issues" },
];

function StatusBadge({ status }) {
  const map = {
    ready_to_fulfill: "bg-blue-100 text-blue-700",
    pending_payment_confirmation: "bg-amber-100 text-amber-700",
    assigned: "bg-indigo-100 text-indigo-700",
    accepted: "bg-cyan-100 text-cyan-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    processing: "bg-yellow-100 text-yellow-700",
    fulfilled: "bg-green-100 text-green-700",
    completed: "bg-emerald-100 text-emerald-700",
    issue_reported: "bg-red-100 text-red-700",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  const label = (status || "unknown").replace(/_/g, " ");
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`} data-testid={`status-badge-${status}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    urgent: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    normal: "bg-slate-50 text-slate-600 border-slate-200",
    low: "bg-gray-50 text-gray-500 border-gray-200",
  };
  const cls = map[priority] || map.normal;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {priority || "normal"}
    </span>
  );
}

export default function MyOrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await partnerApi.get(`/api/vendor/orders${params}`);
      setRows(res.data || []);
    } catch (err) {
      console.error("Failed to load vendor orders:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const filteredAndSorted = useMemo(() => {
    let data = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r =>
        (r.vendor_order_no || "").toLowerCase().includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.order_id || "").toLowerCase().includes(q)
      );
    }
    return data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [rows, searchQuery]);

  const openDrawer = (row) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  const handleStatusUpdate = () => {
    load();
    closeDrawer();
  };

  return (
    <div className="space-y-5" data-testid="vendor-my-orders-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]" data-testid="my-orders-heading">My Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assigned vendor orders — click a row to view details and take action.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          data-testid="refresh-orders-btn"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                filterStatus === opt.value
                  ? "bg-[#20364D] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`filter-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 w-60"
            data-testid="search-orders-input"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700" data-testid="orders-error">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-white overflow-hidden" data-testid="orders-table-container">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400" data-testid="orders-loading">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading orders...
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="py-16 text-center" data-testid="orders-empty">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-600">No orders found</h3>
            <p className="text-sm text-slate-400 mt-1">
              {filterStatus !== "all"
                ? `No orders with status "${filterStatus.replace(/_/g, " ")}"`
                : "You don't have any assigned vendor orders yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="orders-table">
              <thead>
                <tr className="border-b bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Vendor Order No</th>
                  <th className="px-5 py-3.5">Source Type</th>
                  <th className="px-5 py-3.5">Base Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Priority</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50/60 transition-colors"
                    onClick={() => openDrawer(row)}
                    data-testid={`order-row-${row.id}`}
                  >
                    <td className="px-5 py-4 text-sm text-slate-600">{row.date || "-"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#20364D]">{row.vendor_order_no || row.id?.slice(0, 12)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 capitalize">{row.source_type || "-"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#20364D]">{row.base_price ? `TZS ${Number(row.base_price).toLocaleString()}` : "-"}</td>
                    <td className="px-5 py-4"><StatusBadge status={row.fulfillment_state || row.status} /></td>
                    <td className="px-5 py-4"><PriorityBadge priority={row.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Count footer */}
        {!loading && filteredAndSorted.length > 0 && (
          <div className="border-t px-5 py-3 text-xs text-slate-400" data-testid="orders-count">
            Showing {filteredAndSorted.length} order{filteredAndSorted.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" data-testid="vendor-order-drawer-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-[#20364D]" data-testid="drawer-title">Order Details</h2>
              <button
                onClick={closeDrawer}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                data-testid="close-drawer-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {selected && <VendorOrderDrawer order={selected} onStatusUpdate={handleStatusUpdate} />}
          </div>
        </div>
      )}
    </div>
  );
}
