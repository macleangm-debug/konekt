import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { BrandedDocPreview } from "../../components/shared/BrandedDocPreview";
import { Receipt, FileText, Download, ExternalLink, Layers, AlertTriangle } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getInvoices({ search: search || undefined, status: statusFilter || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, statusFilter]);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getInvoiceDetail(row.id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const unpaidTotal = rows.filter(r => !["paid", "cancelled"].includes(r.payment_status || r.status)).reduce((sum, r) => sum + Number(r.total_amount || r.total || 0), 0);

  return (
    <div data-testid="invoices-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Invoices</h1>
        <p className="text-slate-500 mt-1 text-sm">All invoices across cart checkouts and accepted quotes.</p>
      </div>

      {unpaidTotal > 0 && (
        <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3" data-testid="unpaid-alert">
          <Receipt size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Unpaid total:</span> {money(unpaidTotal)} across {rows.filter(r => !["paid", "cancelled"].includes(r.payment_status || r.status)).length} invoices
          </p>
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={[{
          key: "status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: "", label: "All Statuses" },
            { value: "pending_payment", label: "Unpaid" },
            { value: "paid", label: "Paid" },
            { value: "partially_paid", label: "Partially Paid" },
            { value: "overdue", label: "Overdue" },
            { value: "cancelled", label: "Cancelled" },
          ],
        }]}
      />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invoices-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Rejection</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`invoice-row-${row.id}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.invoice_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customer_name || row.customer_email || "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${row.source_type === "Quote" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                        {row.source_type || "Cart"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(row.total_amount || row.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.payment_status || row.status} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-red-600 max-w-[180px] truncate">{row.rejection_reason || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Receipt} title="No invoices found" description="Invoices will appear here after cart checkout or quote acceptance." />
      )}

      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Invoice Detail" subtitle={selected?.invoice_number}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Branded Document Preview */}
            <BrandedDocPreview type="invoice" doc={detail.invoice} splits={detail.splits || []} />

            {/* Payment Proofs */}
            {detail.proofs && detail.proofs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Proofs ({detail.proofs.length})</p>
                <div className="space-y-2">
                  {detail.proofs.map((proof, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#20364D]">{money(proof.amount_paid)}</p>
                          <p className="text-xs text-slate-500">{proof.payer_name || proof.customer_name || "-"} &middot; {fmtDate(proof.created_at)}</p>
                          {proof.transaction_reference && (
                            <p className="text-xs text-slate-400 mt-0.5">Ref: {proof.transaction_reference}</p>
                          )}
                        </div>
                        <StatusBadge status={proof.status} />
                      </div>
                      {proof.proof_url && (
                        <a href={proof.proof_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#20364D] hover:underline font-medium" data-testid="download-proof-btn">
                          <Download size={12} /> Download Proof
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Details */}
            {detail.proof_submissions && detail.proof_submissions.filter(p => p.rejection_reason).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Rejection Details</p>
                <div className="space-y-2">
                  {detail.proof_submissions.filter(p => p.rejection_reason).map((sub, idx) => (
                    <div key={idx} className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                        <AlertTriangle size={14} /> Rejection Reason
                      </div>
                      <p className="text-sm text-red-600">{sub.rejection_reason}</p>
                      <p className="text-xs text-red-400 mt-1">{fmtDate(sub.updated_at || sub.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Order */}
            {detail.order && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-green-700" />
                  <p className="text-sm font-semibold text-green-800">Order Created</p>
                </div>
                <p className="text-xs text-green-700 mt-1">{detail.order.order_number || detail.order.id}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Could not load details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
