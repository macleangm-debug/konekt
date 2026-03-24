import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Check, X, Clock, DollarSign, FileText, Eye, ChevronRight } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_COLORS = {
  uploaded: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

export default function FinancePaymentsQueuePage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/api/payments-governance/finance/queue");
      setRows(res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (proofId) => {
    setApproving(true);
    try {
      const res = await api.post("/api/payments-governance/finance/approve", {
        payment_proof_id: proofId,
        approver_role: "finance",
      });
      if (res.data?.ok) {
        await load();
        setSelected(null);
      }
    } catch (err) {
      alert("Approval failed: " + (err.response?.data?.detail || err.message));
    }
    setApproving(false);
  };

  const reject = async (proofId) => {
    setApproving(true);
    try {
      await api.post("/api/payments-governance/finance/reject", {
        payment_proof_id: proofId,
        approver_role: "finance",
        reason: rejectReason,
      });
      await load();
      setSelected(null);
      setShowReject(false);
      setRejectReason("");
    } catch (err) {
      alert("Rejection failed: " + (err.response?.data?.detail || err.message));
    }
    setApproving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-64" />
        <div className="grid xl:grid-cols-[420px_1fr] gap-6">
          <div className="h-96 bg-slate-100 rounded-[2rem]" />
          <div className="h-96 bg-slate-100 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="finance-payments-queue">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">Finance Payments Queue</h1>
        <p className="text-slate-500 mt-2">Review and approve customer payment proofs. Orders are created only after approval.</p>
      </div>

      {rows.length === 0 && !selected ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <DollarSign size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-[#20364D] mt-4">No proofs pending review</h2>
          <p className="text-slate-500 mt-2">Payment proofs awaiting approval will appear here.</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-[420px_1fr] gap-6">
          {/* Queue List */}
          <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">{rows.length} proof{rows.length !== 1 ? "s" : ""} pending</p>
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Clock size={12} /> Awaiting review
              </span>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {rows.map((row) => (
                <button
                  key={row.payment_proof_id}
                  data-testid={`queue-item-${row.payment_proof_id}`}
                  onClick={() => { setSelected(row); setShowReject(false); }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.payment_proof_id === row.payment_proof_id ? "bg-[#20364D]/5 border-l-2 border-[#20364D]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#20364D] text-sm">{row.invoice_number || "Invoice"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || "bg-slate-100"}`}>
                      {row.status === "uploaded" ? "Pending" : row.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{row.customer_name || row.payer_name || "Customer"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-bold text-[#20364D]">{money(row.amount_paid)}</p>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          {selected ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="finance-detail-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D]">{selected.invoice_number}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Proof submitted by {selected.payer_name || selected.customer_name || "Customer"}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status] || "bg-slate-100"}`}>
                  {selected.status === "uploaded" ? "Pending Review" : selected.status}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Amount Paid</p>
                  <p className="text-2xl font-bold text-[#20364D] mt-1">{money(selected.amount_paid)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Invoice Total</p>
                  <p className="text-2xl font-bold text-[#20364D] mt-1">{money(selected.total_invoice_amount || selected.amount_due)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Payment Details</p>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Payer</span><span className="font-medium text-[#20364D]">{selected.payer_name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Mode</span><span className="font-medium text-[#20364D] capitalize">{selected.payment_mode || "full"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Submitted</span><span className="font-medium text-[#20364D]">{selected.created_at?.slice(0, 10)}</span></div>
              </div>

              {selected.file_url && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium mb-2">Proof Attachment</p>
                  <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#20364D] font-medium hover:underline">
                    <Eye size={14} /> View Uploaded Proof
                  </a>
                </div>
              )}

              {(selected.items || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Invoice Items</p>
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
                      <span className="text-[#20364D]">{item.name} x{item.quantity}</span>
                      <span className="font-semibold text-[#20364D]">{money(item.line_total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!showReject ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    data-testid="approve-proof-btn"
                    onClick={() => approve(selected.payment_proof_id)}
                    disabled={approving}
                    className="rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> {approving ? "Approving..." : "Approve Payment"}
                  </button>
                  <button
                    data-testid="reject-proof-btn"
                    onClick={() => setShowReject(true)}
                    className="rounded-xl border border-red-200 text-red-600 px-4 py-3 font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <textarea
                    data-testid="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[80px]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowReject(false)} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-[#20364D]">Cancel</button>
                    <button
                      onClick={() => reject(selected.payment_proof_id)}
                      disabled={approving}
                      className="rounded-xl bg-red-600 text-white px-4 py-3 font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      {approving ? "Rejecting..." : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">Only Finance and Admin can approve or reject payment proofs.</p>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400">
              Select a payment proof to review
            </div>
          )}
        </div>
      )}
    </div>
  );
}
