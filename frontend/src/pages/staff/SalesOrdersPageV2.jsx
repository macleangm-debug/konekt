import React, { useEffect, useState, useCallback } from "react";
import { Search, Package, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import api from "../../lib/api";
import SalesOrderDrawerV2 from "../../components/staff/SalesOrderDrawerV2";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "processing", label: "Processing" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_to_fulfill", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "delivered", label: "Delivered" },
];

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    ready_to_fulfill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[s] || "bg-slate-50 text-slate-600 border-slate-200"}`} data-testid="order-status-badge">
      {(status || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function shortDate(v) { return v ? String(v).slice(0, 10) : "-"; }

export default function SalesOrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const token = localStorage.getItem("konekt_admin_token");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/api/sales/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDrawer = async (orderId) => {
    try {
      const res = await api.get(`/api/sales/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedOrder(res.data);
      setDrawerOpen(true);
    } catch {
      console.error("Failed to load order detail");
    }
  };

  return (
    <div className="space-y-5" data-testid="sales-orders-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} order{total !== 1 ? "s" : ""} assigned to you</p>
        </div>
        <button onClick={fetchOrders} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" data-testid="refresh-orders-btn">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" data-testid="order-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
            placeholder="Search order number or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="order-search-input"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === opt.value ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              data-testid={`filter-${opt.value || "all"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid="orders-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No orders found
              </td></tr>
            ) : orders.map((order) => (
              <tr
                key={order.id || order.order_number}
                onClick={() => openDrawer(order.id || order.order_number)}
                className="border-b border-slate-50 cursor-pointer hover:bg-slate-50/50 transition-colors"
                data-testid={`order-row-${order.order_number}`}
              >
                <td className="px-4 py-3 font-semibold text-[#20364D]">{order.order_number || "-"}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{order.customer_name || order.customer?.full_name || "-"}</div>
                  <div className="text-xs text-slate-400">{order.customer_phone || order.customer?.phone || ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-500">{shortDate(order.created_at)}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(order.total_amount || order.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.current_status || order.status} /></td>
                <td className="px-4 py-3 text-slate-500">{order.vendor_name || order.assigned_vendor_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500" data-testid="pagination">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && selectedOrder && (
        <SalesOrderDrawerV2 order={selectedOrder} onClose={() => { setDrawerOpen(false); setSelectedOrder(null); }} />
      )}
    </div>
  );
}
