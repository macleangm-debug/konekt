import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Target, Users, BarChart3, Briefcase, FileText } from "lucide-react";

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const TABS = [
  { key: "leads", label: "Leads", icon: Target },
  { key: "accounts", label: "Accounts", icon: Users },
  { key: "performance", label: "Performance", icon: BarChart3 },
];

export default function SalesCrmPage() {
  const [tab, setTab] = useState("leads");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { search: search || undefined, status: statusFilter || undefined };
    const fetcher = tab === "leads" ? adminApi.getSalesCrmLeads(params)
      : tab === "accounts" ? adminApi.getSalesCrmAccounts(params)
      : adminApi.getSalesCrmPerformance();
    fetcher
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, statusFilter]);

  const handleStatusUpdate = async (leadId, newStatus) => {
    setActionLoading(true);
    try {
      await adminApi.updateLeadStatusFacade({ lead_id: leadId, status: newStatus });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="sales-crm-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Sales & CRM</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage leads, customer accounts, and track sales performance.</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="sales-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); setStatusFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`tab-${t.key}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab !== "performance" && (
        <FilterBar search={search} onSearchChange={setSearch}
          filters={tab === "leads" ? [{
            key: "status", value: statusFilter, onChange: setStatusFilter,
            options: [{ value: "", label: "All Statuses" }, { value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "qualified", label: "Qualified" }, { value: "quoting", label: "Quoting" }],
          }] : []}
        />
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : tab === "performance" ? (
        rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`perf-card-${i}`}>
                <p className="font-semibold text-[#20364D] text-lg">{r.name}</p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div><p className="text-xs text-slate-500">Leads</p><p className="text-lg font-bold text-[#20364D]">{r.leads}</p></div>
                  <div><p className="text-xs text-slate-500">Orders</p><p className="text-lg font-bold text-green-700">{r.orders}</p></div>
                  <div><p className="text-xs text-slate-500">Revenue</p><p className="text-lg font-bold text-[#D4A843]">{r.revenue}</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={BarChart3} title="No performance data" description="Sales performance data will appear once leads and orders are assigned." />
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`${tab}-table`}>
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  {tab === "leads" ? (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Assigned</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                  </>) : (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Orders</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Sales</th>
                  </>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`row-${row.id || idx}`}>
                    {tab === "leads" ? (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{(row.id || "").slice(0, 12)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.customer_name || row.customer_id || "-"}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{row.record_type || row.type || "-"}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.assigned_to || "Unassigned"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>) : (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.full_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{row.company || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.total_orders || 0}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.assigned_sales || "Unassigned"}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={tab === "leads" ? Target : Users} title={`No ${tab} found`} description={tab === "leads" ? "Leads from service requests and promo inquiries appear here." : "Customer accounts will show here."} />
      )}

      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title={tab === "leads" ? "Lead Detail" : "Account Detail"} subtitle={selected?.customer_name || selected?.full_name}>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{tab === "leads" ? "Customer" : "Name"}</p>
                <p className="font-semibold text-[#20364D] mt-1">{selected.customer_name || selected.full_name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{selected.email || selected.customer_email || ""}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{tab === "leads" ? "Status" : "Orders"}</p>
                {tab === "leads" ? <StatusBadge status={selected.status} /> : <p className="text-lg font-bold text-[#20364D] mt-1">{selected.total_orders || 0}</p>}
              </div>
            </div>
            {tab === "leads" && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {["new", "contacted", "qualified", "quoting", "converted"].map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(selected.id, s)} disabled={actionLoading || selected.status === s}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold capitalize text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      data-testid={`status-btn-${s}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {selected.notes && <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-700">{selected.notes}</p></div>}
            {selected.description && <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700">{selected.description}</p></div>}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
