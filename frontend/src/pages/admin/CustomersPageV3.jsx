import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Users, ShoppingCart, Receipt } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

export default function CustomersPageV3() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getCustomersList({ search: search || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getCustomerDetail(row.id || row.email);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  return (
    <div data-testid="customers-page-v3">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Customers</h1>
        <p className="text-slate-500 mt-1 text-sm">All registered customer accounts with order history and sales assignments.</p>
      </div>

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="customers-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Orders</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Referral</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`customer-row-${row.id || idx}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.full_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{row.company || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{row.total_orders || 0}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.referral_code || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.assigned_sales || "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Users} title="No customers found" description="Customer accounts will appear here after registration." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Customer Detail" subtitle={selected?.full_name}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.customer?.full_name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{detail.customer?.email}</p>
                {detail.customer?.phone && <p className="text-xs text-slate-500 mt-1">{detail.customer.phone}</p>}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Company</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.customer?.company || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">Role: {detail.customer?.role || "-"}</p>
              </div>
            </div>
            {detail.orders && detail.orders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Recent Orders ({detail.orders.length})</p>
                <div className="space-y-2">
                  {detail.orders.slice(0, 10).map((o, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-[#20364D]">{o.order_number || o.id?.slice(0,12)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{money(o.total_amount || o.total)}</span>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail.invoices && detail.invoices.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Recent Invoices ({detail.invoices.length})</p>
                <div className="space-y-2">
                  {detail.invoices.slice(0, 10).map((inv, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-[#20364D]">{inv.invoice_number || inv.id?.slice(0,12)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{money(inv.total_amount || inv.total)}</span>
                        <StatusBadge status={inv.payment_status || inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Could not load customer details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
