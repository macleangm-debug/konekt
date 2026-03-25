import React, { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Check, X, Clock, DollarSign, Search, ChevronRight, Image, FileText } from "lucide-react";
import BrandLogo from "../branding/BrandLogo";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_BADGE = {
  uploaded: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

export default function FinancePaymentsQueuePage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin-flow-fixes/finance/queue?q=${encodeURIComponent(search)}`);
      setRows(res.data || []);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    if (!selected) return;
    setApproving(true);
    try {
      await api.post("/api/admin-flow-fixes/finance/approve-proof", {
        payment_proof_id: selected.payment_proof_id,
        approver_role: "finance",
      });
      await load();
      setSelected(null);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setApproving(false);
  };

  const reject = async () => {
    if (!selected) return;
    setApproving(true);
    try {
      await api.post("/api/admin-flow-fixes/finance/reject-proof", {
        payment_proof_id: selected.payment_proof_id,
        approver_role: "finance",
        reason: rejectReason,
      });
      await load();
      setSelected(null);
      setShowReject(false);
      setRejectReason("");
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setApproving(false);
  };

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100 rounded-xl w-64" /><div className="h-96 bg-slate-100 rounded-[2rem]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="finance-payments-queue">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Payments Queue</h1>
        <p className="text-slate-500 mt-1 text-sm">Review and approve payment proofs. Orders are created only after approval.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input data-testid="finance-search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, invoice number..."
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <DollarSign size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No proofs pending</h2>
          <p className="text-slate-500 mt-2">Payment proofs awaiting review will appear here.</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-[420px_1fr] gap-6">
          {/* List */}
          <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-500">{rows.length} proof{rows.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {rows.map((row) => (
                <button key={row.payment_proof_id} data-testid={`queue-item-${row.payment_proof_id}`}
                  onClick={() => { setSelected(row); setShowReject(false); }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.payment_proof_id === row.payment_proof_id ? "bg-[#20364D]/5 border-l-2 border-[#20364D]" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#20364D] text-sm">{row.customer_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[row.status] || "bg-slate-100"}`}>
                      {row.status === "uploaded" ? "Pending" : row.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{row.invoice_number} &middot; {money(row.amount_paid)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(row.created_at)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          {selected ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="finance-detail-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D]">{selected.customer_name}</h2>
                  <p className="text-sm text-slate-500">{selected.invoice_number}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_BADGE[selected.status] || "bg-slate-100"}`}>
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
                  <p className="text-2xl font-bold text-[#20364D] mt-1">{money(selected.total_invoice || selected.amount_due)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Payer</span><span className="font-medium text-[#20364D]">{selected.payer_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="font-medium text-[#20364D] capitalize">{selected.payment_mode || "full"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="font-medium text-[#20364D]">{fmtDate(selected.created_at)}</span></div>
              </div>

              {/* Proof preview */}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium mb-2">Payment Proof</p>
                {selected.file_url && !selected.file_url.startsWith("blob:") ? (
                  /\.(png|jpg|jpeg|webp)$/i.test(selected.file_url) ? (
                    <div className="space-y-3">
                      <img src={selected.file_url} alt="Payment proof" className="w-full max-h-72 object-contain rounded-xl border border-slate-200 bg-slate-50" />
                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#20364D] font-medium hover:underline">
                        <Image size={14} /> Open Full Proof
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 flex items-center gap-2 text-sm text-[#20364D]"><FileText size={14} /> Proof document attached</div>
                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#20364D] font-medium hover:underline">
                        <FileText size={14} /> Open Proof Document
                      </a>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500">Proof submitted. File preview will be available when object storage is connected.</p>
                )}
              </div>

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

              {selected.status === "uploaded" && !showReject && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button data-testid="approve-proof-btn" onClick={approve} disabled={approving}
                    className="rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                    <Check size={16} /> {approving ? "Approving..." : "Approve"}
                  </button>
                  <button data-testid="reject-proof-btn" onClick={() => setShowReject(true)}
                    className="rounded-xl border border-red-200 text-red-600 px-4 py-3 font-semibold hover:bg-red-50 flex items-center justify-center gap-2">
                    <X size={16} /> Reject
                  </button>
                </div>
              )}

              {showReject && (
                <div className="space-y-3 pt-2">
                  <textarea data-testid="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[80px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowReject(false)} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-[#20364D]">Cancel</button>
                    <button onClick={reject} disabled={approving}
                      className="rounded-xl bg-red-600 text-white px-4 py-3 font-semibold hover:bg-red-700 disabled:opacity-60">
                      {approving ? "Rejecting..." : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              )}

              {selected.status !== "uploaded" && (
                <p className="text-sm text-slate-500 text-center">This proof has been {selected.status}.</p>
              )}
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
