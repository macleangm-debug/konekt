import React, { useEffect, useState, useCallback } from "react";
import { Search, Users, UserCheck, AlertTriangle, UserX, Receipt, ShoppingCart, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import FilterBar from "@/components/admin/shared/FilterBar";
import EmptyState from "@/components/admin/shared/EmptyState";
import CustomerDrawer360 from "@/components/admin/customers/CustomerDrawer360";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";
import SendStatementButton from "@/components/customers/SendStatementButton";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "inactive", label: "Inactive" },
];

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

export default function CustomersPageMerged() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [kpiFilter, setKpiFilter] = useState(""); // "unpaid" or "active_orders"
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getCustomers360List({ search: search || undefined, status: statusFilter || undefined })
      .then((r) => setRows(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.getCustomers360Stats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const openDrawer = async (customerId) => {
    const row = rows.find(r => r.id === customerId) || { id: customerId };
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getCustomer360Detail(customerId);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const closeDrawer = () => { setSelected(null); setDetail(null); };

  const setStatusAndLoad = (s) => {
    setKpiFilter("");
    setStatusFilter((prev) => (prev === s ? "" : s));
  };

  const toggleKpiFilter = (f) => {
    setKpiFilter((prev) => (prev === f ? "" : f));
    setStatusFilter("");
  };

  // Apply KPI filtering
  const filteredRows = rows.filter((row) => {
    if (kpiFilter === "unpaid") return row.active_invoices > 0;
    if (kpiFilter === "active_orders") return row.total_orders > 0;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="customers-page-merged">
      {/* Stats Cards */}
      {stats && (
        <StandardSummaryCardsRow
          columns={6}
          cards={[
            { label: "Total", value: stats.total, icon: Users, accent: "slate", onClick: () => { setStatusFilter(""); setKpiFilter(""); }, active: !statusFilter && !kpiFilter },
            { label: "Active", value: stats.active, icon: UserCheck, accent: "emerald", onClick: () => setStatusAndLoad("active"), active: statusFilter === "active" },
            { label: "At Risk", value: stats.at_risk, icon: AlertTriangle, accent: "amber", onClick: () => setStatusAndLoad("at_risk"), active: statusFilter === "at_risk" },
            { label: "Inactive", value: stats.inactive, icon: UserX, accent: "red", onClick: () => setStatusAndLoad("inactive"), active: statusFilter === "inactive" },
            { label: "Unpaid Invoices", value: stats.with_unpaid_invoices, icon: Receipt, accent: "violet", onClick: () => toggleKpiFilter("unpaid"), active: kpiFilter === "unpaid" },
            { label: "Active Orders", value: stats.with_active_orders, icon: ShoppingCart, accent: "blue", onClick: () => toggleKpiFilter("active_orders"), active: kpiFilter === "active_orders" },
          ]}
        />
      )}

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#20364D]">Customers</h1>
            <p className="mt-0.5 text-sm text-slate-500">{filteredRows.length} customer{filteredRows.length !== 1 ? "s" : ""} — click a name for Customer 360</p>
          </div>
        </div>

        <FilterBar>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="customer-search"
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <select
            data-testid="customer-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setKpiFilter(""); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterBar>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="customers-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent Activity</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Email</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Type</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Orders</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Invoices</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Sales</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">Loading customers...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="py-0"><EmptyState icon={Users} title="No customers found" subtitle="Customers will appear here when they register." /></td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-slate-50 ${selected?.id === row.id ? "bg-blue-50/50" : ""}`}
                    data-testid={`customer-row-${row.id}`}
                  >
                    <td className="px-5 py-3.5 text-xs text-slate-500">{fmtDate(row.last_activity_at)}</td>
                    <td className="px-5 py-3.5">
                      <CustomerLinkCell
                        customerId={row.id}
                        customerName={row.name}
                        onClickDrawer={openDrawer}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 hidden md:table-cell">{row.email}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 hidden lg:table-cell">{row.company}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.type === "business" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-center font-medium text-slate-700">{row.total_orders}</td>
                    <td className="px-5 py-3.5 text-sm text-center font-medium text-slate-700">{row.active_invoices}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 hidden md:table-cell">{row.assigned_sales_name}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wide Profile Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="customer-profile-drawer-overlay">
          <div className="absolute inset-0 bg-[#20364D]/30 backdrop-blur-[3px]" onClick={closeDrawer} />
          <div className="relative flex w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              {detail?.id && <SendStatementButton customerId={detail.id} customerName={detail.company || detail.name} compact />}
              <button
                onClick={closeDrawer}
                data-testid="close-customer-drawer"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {loadingDetail ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-sm text-slate-400">Loading customer profile...</div>
              </div>
            ) : (
              <CustomerDrawer360 customer={detail} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
