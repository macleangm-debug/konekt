import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { CreditCard, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function PaymentsQueuePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getPaymentsQueue({ search: search || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const openDetail = async (row) => {
    setSelected(row);
    setLoadingDetail(true);
    setShowReject(false);
    setRejectReason("");
    try {
      const res = await adminApi.getPaymentDetail(row.payment_proof_id);
      setDetail(res.data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.approvePayment(selected.payment_proof_id, { approver_role: "admin" });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert("Rejection reason is required");
    setActionLoading(true);
    try {
      await adminApi.rejectPayment(selected.payment_proof_id, { approver_role: "admin", reason: rejectReason });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="payments-queue-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Payments Queue</h1>
        <p className="text-slate-500 mt-1 text-sm">Review, approve, or reject payment proofs. Approval triggers order creation.</p>
      </div>

      <FilterBar search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="payments-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Payer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Paid</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right hidden md:table-cell">Invoice Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.payment_proof_id} onClick={() => openDetail(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`payment-row-${row.payment_proof_id}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.invoice_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customer_name || row.customer_email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{row.payer_name || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{money(row.amount_paid)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{money(row.total_invoice_amount)}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{row.payment_mode || "full"}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={CreditCard} title="No payments pending review" description="All payment proofs have been processed." />
      )}

      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Payment Review" subtitle={selected?.invoice_number}>
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse"><div className="h-20 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-semibold text-[#20364D] mt-1">{detail.proof?.payer_name || detail.invoice?.customer_name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{detail.invoice?.customer_email || ""}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Amount</p>
                <p className="font-semibold text-green-700 text-lg mt-1">{money(detail.proof?.amount_paid)}</p>
                <p className="text-xs text-slate-500 mt-1">of {money(detail.payment?.total_invoice_amount || detail.invoice?.total_amount)}</p>
              </div>
            </div>

            {detail.proof?.file_url && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Proof Document</p>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  {detail.proof.file_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                    <img src={detail.proof.file_url} alt="Payment proof" className="w-full max-h-[300px] object-contain bg-slate-50" />
                  ) : (
                    <a href={detail.proof.file_url} target="_blank" rel="noopener noreferrer" className="block p-4 text-center text-[#20364D] font-medium hover:bg-slate-50">
                      <Eye className="inline w-4 h-4 mr-2" /> View Proof Document
                    </a>
                  )}
                </div>
              </div>
            )}

            {detail.invoice?.items && detail.invoice.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invoice Items ({detail.invoice.items.length})</p>
                <div className="space-y-1.5">
                  {detail.invoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-700">{item.name || "Item"} x{item.quantity || 1}</span>
                      <span className="font-medium text-[#20364D]">{money(item.line_total || item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showReject ? (
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setShowReject(true)} disabled={actionLoading} data-testid="reject-payment-btn"
                  className="rounded-xl border-2 border-red-200 text-red-700 px-4 py-3 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <XCircle size={16} /> Reject
                </button>
                <button onClick={handleApprove} disabled={actionLoading} data-testid="approve-payment-btn"
                  className="rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> {actionLoading ? "Processing..." : "Approve"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <p className="text-sm font-semibold">Rejection Reason (Required)</p>
                </div>
                <textarea className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm min-h-[80px] focus:ring-2 focus:ring-red-200 outline-none" placeholder="E.g. Amount on proof does not match invoice total" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} data-testid="reject-reason-input" />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowReject(false); setRejectReason(""); }} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-[#20364D]">Cancel</button>
                  <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} data-testid="confirm-reject-btn"
                    className="rounded-xl bg-red-600 text-white px-4 py-3 font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                    {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
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
