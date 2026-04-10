import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../lib/api";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";
import {
  CreditCard, CheckCircle2, XCircle, Clock, FileText, Eye,
  User, Building2, Mail, Phone, Receipt, Calendar, ChevronRight, Loader2,
} from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All Payments" },
  { key: "uploaded", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function StatusBadge({ status }) {
  const map = {
    uploaded: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", cls: "bg-green-50 text-green-700 border-green-200" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`} data-testid={`status-badge-${status}`}>{s.label}</span>;
}

export default function PaymentsQueuePage() {
  const { confirmAction } = useConfirmModal();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [acting, setActing] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await api.get(`/api/admin/payments/queue?${params.toString()}`);
      setProofs(res.data || []);
    } catch {
      toast.error("Failed to load payments queue");
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const openDrawer = async (proof) => {
    setSelected(proof);
    try {
      const res = await api.get(`/api/admin/payments/${proof.payment_proof_id}`);
      setDetailData(res.data);
    } catch {
      setDetailData(null);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await api.post(`/api/admin/payments/${selected.payment_proof_id}/approve`);
      toast.success("Payment approved");
      setSelected(null);
      setDetailData(null);
      loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approval failed");
    }
    setActing(false);
  };

  const handleReject = async (reason) => {
    if (!selected) return;
    setActing(true);
    try {
      await api.post(`/api/admin/payments/${selected.payment_proof_id}/reject`, {
        reason: reason || "Payment proof rejected",
      });
      toast.success("Payment rejected");
      setSelected(null);
      setDetailData(null);
      loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rejection failed");
    }
    setActing(false);
  };

  const statusCounts = {
    all: proofs.length,
    uploaded: proofs.filter(p => p.status === "uploaded").length,
    approved: proofs.filter(p => p.status === "approved").length,
    rejected: proofs.filter(p => p.status === "rejected").length,
  };

  return (
    <div data-testid="payments-queue-page" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Payments Queue</h1>
        <p className="text-sm text-slate-500 mt-1">Review, approve, or reject payment proofs submitted by customers.</p>
      </div>

      {/* Stat Cards */}
      <StandardSummaryCardsRow
        columns={4}
        cards={[
          { label: "Total", value: statusCounts.all, icon: CreditCard, accent: "slate", onClick: () => setStatusFilter("all"), active: statusFilter === "all" },
          { label: "Pending", value: statusCounts.uploaded, icon: Clock, accent: "amber", onClick: () => setStatusFilter("uploaded"), active: statusFilter === "uploaded" },
          { label: "Approved", value: statusCounts.approved, icon: CheckCircle2, accent: "emerald", onClick: () => setStatusFilter("approved"), active: statusFilter === "approved" },
          { label: "Rejected", value: statusCounts.rejected, icon: XCircle, accent: "red", onClick: () => setStatusFilter("rejected"), active: statusFilter === "rejected" },
        ]}
      />

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer, payer, invoice..."
        className="w-full max-w-sm border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
        data-testid="payment-search-input"
      />

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm" data-testid="payments-table">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
            ) : proofs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No data available yet</h3>
                <p className="text-sm text-slate-500 mt-1">Data will appear once activity is recorded</p>
              </td></tr>
            ) : proofs.map((p) => (
              <tr key={p.payment_proof_id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(p)} data-testid={`payment-row-${p.payment_proof_id}`}>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                <td className="px-4 py-3 font-semibold text-sm text-[#20364D]">{p.invoice_number || p.order_number || p.payment_reference || "—"}</td>
                <td className="px-4 py-3">
                  <CustomerLinkCell customerId={p.customer_id} customerName={p.customer_name} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-700">{p.payer_name || "—"}</div>
                  {p.payer_phone && <div className="text-xs text-slate-500">{p.payer_phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.source === "public" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                    {p.source === "public" ? "Public" : "Account"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-sm">TZS {Number(p.amount_paid || 0).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetailData(null); }} title="Payment Review">
        {selected && (
          <div className="space-y-5" data-testid="payment-drawer">
            {/* Section 1 — Status Banner */}
            <div className={`rounded-xl p-4 flex items-center gap-3 ${
              selected.status === "approved" ? "bg-green-50 border border-green-200" :
              selected.status === "rejected" ? "bg-red-50 border border-red-200" :
              "bg-amber-50 border border-amber-200"
            }`}>
              {selected.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
               selected.status === "rejected" ? <XCircle className="w-5 h-5 text-red-600" /> :
               <Clock className="w-5 h-5 text-amber-600" />}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{selected.status === "approved" ? "Approved" : selected.status === "rejected" ? "Rejected" : "Pending Review"}</p>
                  <span className="text-xs text-slate-400">{selected.source === "public" ? "Public submission" : "In-account"}</span>
                </div>
                {selected.approved_by && <p className="text-xs text-slate-500">by {selected.approved_by} {selected.approved_at ? `on ${new Date(selected.approved_at).toLocaleDateString()}` : ""}</p>}
                {selected.rejection_reason && <p className="text-xs text-red-600 mt-1">Reason: {selected.rejection_reason}</p>}
              </div>
            </div>

            {/* Section 2 — Payer Details */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3"><CreditCard className="w-3.5 h-3.5" />PAYER DETAILS</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Payer Name</span>
                  <span className="text-sm font-semibold text-[#20364D]" data-testid="drawer-payer-name">{selected.payer_name || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Payer Phone</span>
                  <span className="text-sm font-medium text-[#20364D]" data-testid="drawer-payer-phone">{selected.payer_phone || selected.contact_phone || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Payer Email</span>
                  <span className="text-sm font-medium text-[#20364D]">{selected.payer_email || selected.customer_email || "—"}</span>
                </div>
                {selected.payment_reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Reference</span>
                    <span className="text-sm font-medium text-[#20364D]">{selected.payment_reference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2b — Customer (separate from payer) */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3"><User className="w-3.5 h-3.5" />CUSTOMER / ACCOUNT</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Customer</span>
                  <span className="text-sm font-semibold text-[#20364D]" data-testid="drawer-customer-name">{selected.customer_name || "—"}</span>
                </div>
                {selected.company_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Company</span>
                    <span className="text-sm font-medium">{selected.company_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3 — Invoice / Reference Details */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3"><FileText className="w-3.5 h-3.5" />INVOICE / REFERENCE</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Invoice No.</span>
                  <p className="font-semibold text-[#20364D]">{selected.invoice_number || selected.order_number || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Expected Amount</span>
                  <p className="font-semibold text-[#20364D]">TZS {Number(selected.total_invoice_amount || selected.expected_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Amount Paid</span>
                  <p className="font-bold text-emerald-700">TZS {Number(selected.amount_paid || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Payment Mode</span>
                  <p className="font-medium capitalize">{selected.payment_mode || "full"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-xs">Submitted</span>
                  <p className="font-medium">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</p>
                </div>
              </div>
              {selected.invoice_id && (
                <a href={`/admin/invoices/${selected.invoice_id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#20364D] hover:underline mt-3" data-testid="drawer-invoice-link">
                  <FileText className="w-3.5 h-3.5" />View Invoice
                </a>
              )}
            </div>

            {/* Section 4 — Payment Proof Preview */}
            <div className="rounded-xl border p-4" data-testid="drawer-proof-section">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3"><Eye className="w-3.5 h-3.5" />PAYMENT PROOF</div>
              {selected.file_url ? (
                <>
                  {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(selected.file_url) ? (
                    <div className="space-y-2">
                      <img
                        src={selected.file_url}
                        alt="Payment proof"
                        className="w-full max-h-80 object-contain rounded-lg border bg-slate-50 cursor-pointer"
                        onClick={() => window.open(selected.file_url, "_blank")}
                        data-testid="drawer-proof-image"
                      />
                      <p className="text-xs text-slate-400 text-center">Click to view full size</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-slate-50 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#20364D]/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#20364D]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#20364D] truncate">
                          {selected.file_url.split("/").pop() || "Payment proof document"}
                        </p>
                        <p className="text-xs text-slate-400 uppercase">{selected.file_url.split(".").pop() || "file"}</p>
                      </div>
                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#20364D] hover:underline shrink-0"
                        data-testid="drawer-proof-file">
                        Open
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium">No proof uploaded</p>
                </div>
              )}
            </div>

            {/* Approval History */}
            {detailData?.approval_history?.length > 0 && (
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />APPROVAL HISTORY</p>
                <div className="space-y-2">
                  {detailData.approval_history.map((entry, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium">{entry.action}</span>
                        {entry.created_at && <span className="text-slate-400 ml-2">{new Date(entry.created_at).toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5 — Admin Actions */}
            {selected.status === "uploaded" && (
              <div className="space-y-3 pt-1" data-testid="drawer-actions">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      confirmAction({
                        title: "Approve Payment?",
                        message: `Approve TZS ${Number(selected.amount_paid || 0).toLocaleString()} from ${selected.payer_name || "payer"}?`,
                        confirmLabel: "Approve",
                        tone: "success",
                        onConfirm: handleApprove,
                      });
                    }}
                    disabled={acting}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
                    data-testid="approve-payment-btn"
                  >
                    {acting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><CheckCircle2 className="w-4 h-4" />Approve Payment</>}
                  </button>
                  <button
                    onClick={() => {
                      confirmAction({
                        title: "Reject Payment?",
                        message: "Are you sure you want to reject this payment proof?",
                        confirmLabel: "Reject",
                        tone: "danger",
                        onConfirm: () => handleReject("Payment proof rejected by admin"),
                      });
                    }}
                    disabled={acting}
                    className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-40 flex items-center justify-center gap-2"
                    data-testid="reject-payment-btn"
                  >
                    <XCircle className="w-4 h-4" />Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
