import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { FileText, Briefcase, MessageSquare } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const TYPE_BADGE = {
  quote: { label: "Quote", cls: "bg-indigo-100 text-indigo-700" },
  service_request: { label: "Service Request", cls: "bg-teal-100 text-teal-700" },
  request: { label: "Request", cls: "bg-amber-100 text-amber-700" },
  promo_lead: { label: "Promo Lead", cls: "bg-pink-100 text-pink-700" },
};

export default function QuotesRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getQuotes({ search: search || undefined, status: statusFilter || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, statusFilter]);

  const openDetail = (row) => {
    setSelected(row);
    setDetail(row);
    setLoadingDetail(false);
  };

  const typeBadge = (type) => {
    const cfg = TYPE_BADGE[type] || { label: type || "Unknown", cls: "bg-slate-100 text-slate-600" };
    return <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>;
  };

  return (
    <div data-testid="quotes-requests-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Quotes & Requests</h1>
        <p className="text-slate-500 mt-1 text-sm">Unified view of quotes, service requests, and promo leads. Assign sales and track progress.</p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={[{
          key: "status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: "", label: "All Statuses" },
            { value: "pending", label: "Pending" },
            { value: "sent", label: "Sent" },
            { value: "quoting", label: "Quoting" },
            { value: "accepted", label: "Accepted" },
            { value: "expired", label: "Expired" },
            { value: "converted_to_invoice", label: "Invoiced" },
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
          ],
        }]}
      />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="quotes-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Document #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`quote-row-${row.id || idx}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.quote_number || row.request_number || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-700">{row.customer_name || row.customer_email || "-"}</div>
                      {row.customer_company && <div className="text-xs text-slate-400">{row.customer_company}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(row.total_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(row); }}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        data-testid={`view-quote-${row.id || idx}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No quotes or requests" description="Quotes, service requests, and promo leads will appear here." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Record Detail" subtitle={selected?.quote_number || selected?.request_number}>
        {detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.customer_name || detail.customer_email || "-"}</p>
                {detail.customer_email && <p className="text-xs text-slate-500 mt-1">{detail.customer_email}</p>}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Amount</p>
                <p className="font-semibold text-[#20364D] text-lg mt-1">{money(detail.total_amount)}</p>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {typeBadge(detail.record_type)}
                  <StatusBadge status={detail.status} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</p>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Assigned Sales</p>
                  <p className="font-medium text-[#20364D]">{detail.assigned_sales || "Unassigned"}</p>
                </div>
                {detail.valid_until && (
                  <div>
                    <p className="text-xs text-slate-400">Valid Until</p>
                    <p className="font-medium text-[#20364D]">{fmtDate(detail.valid_until)}</p>
                  </div>
                )}
                {detail.created_at && (
                  <div>
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="font-medium text-[#20364D]">{fmtDate(detail.created_at)}</p>
                  </div>
                )}
                {detail.invoice_id && (
                  <div>
                    <p className="text-xs text-slate-400">Invoice</p>
                    <p className="font-medium text-green-700">{detail.invoice_id}</p>
                  </div>
                )}
              </div>
            </div>

            {detail.items && detail.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Items ({detail.items.length})</p>
                <div className="space-y-1.5">
                  {detail.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-700">{item.name || item.description || "Item"} x{item.quantity || 1}</span>
                      <span className="font-medium text-[#20364D]">{money(item.line_total || item.total || item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.notes && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 uppercase">Notes</p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{detail.notes}</p>
              </div>
            )}

            {detail.description && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{detail.description}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Select a record to view details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
