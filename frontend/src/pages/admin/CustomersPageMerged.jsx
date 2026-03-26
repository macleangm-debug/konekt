import React, { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import DetailDrawer from "@/components/admin/shared/DetailDrawer";
import FilterBar from "@/components/admin/shared/FilterBar";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import EmptyState from "@/components/admin/shared/EmptyState";
import CustomerDrawer360 from "@/components/admin/customers/CustomerDrawer360";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

export default function CustomersPageMerged() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getCustomers360List({ search: search || undefined, status: statusFilter || undefined })
      .then((r) => setRows(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openDrawer = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getCustomer360Detail(row.id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const closeDrawer = () => { setSelected(null); setDetail(null); };

  return (
    <div className="space-y-4" data-testid="customers-page-merged">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#20364D]">Customers</h1>
            <p className="mt-0.5 text-sm text-slate-500">{rows.length} customer{rows.length !== 1 ? "s" : ""} — click a row for full 360 view</p>
          </div>
        </div>

        {/* Filters */}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterBar>

        {/* Table */}
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
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="py-0"><EmptyState icon={<Users className="w-10 h-10 text-slate-300" />} title="No customers found" subtitle="Customers will appear here when they register or are created." /></td></tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDrawer(row)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    data-testid={`customer-row-${row.id}`}
                  >
                    <td className="px-5 py-3.5 text-xs text-slate-500">{fmtDate(row.last_activity_at)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#20364D]">{row.name}</td>
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

      {/* Detail Drawer */}
      <DetailDrawer open={!!selected} onClose={closeDrawer}>
        {loadingDetail ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm text-slate-400">Loading customer summary...</div>
          </div>
        ) : (
          <CustomerDrawer360 customer={detail} />
        )}
      </DetailDrawer>
    </div>
  );
}
