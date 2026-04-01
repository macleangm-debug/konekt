import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../lib/api";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import {
  CreditCard, CheckCircle2, XCircle, Clock, FileText, Eye,
  User, Building2, Mail, Phone, Receipt, Calendar, ChevronRight,
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="payments-stats-cards">
        {[
          { key: "all", label: "Total", value: statusCounts.all, Icon: CreditCard, accent: "border-slate-200", iconBg: "bg-slate-100", iconColor: "text-slate-600" },
          { key: "uploaded", label: "Pending", value: statusCounts.uploaded, Icon: Clock, accent: "border-amber-200", iconBg: "bg-amber-100", iconColor: "text-amber-700" },
          { key: "approved", label: "Approved", value: statusCounts.approved, Icon: CheckCircle2, accent: "border-emerald-200", iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
          { key: "rejected", label: "Rejected", value: statusCounts.rejected, Icon: XCircle, accent: "border-red-200", iconBg: "bg-red-100", iconColor: "text-red-700" },
        ].map(({ key, label, value, Icon, accent, iconBg, iconColor }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            data-testid={`stat-card-${label.toLowerCase()}`}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${accent} ${statusFilter === key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#20364D]">{value}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          </button>
        ))}
      </div>

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
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Invoice</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Payer</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Approved By</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : proofs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No payments found</td></tr>
            ) : proofs.map((p) => (
              <tr key={p.payment_proof_id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(p)} data-testid={`payment-row-${p.payment_proof_id}`}>
                <td className="px-4 py-3 text-slate-600">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-3 font-medium text-[#20364D]">{p.invoice_number || "-"}</td>
                <td className="px-4 py-3">
                  <CustomerLinkCell customerId={p.customer_id} customerName={p.customer_name} />
                </td>
                <td className="px-4 py-3 text-slate-600">{p.payer_name || "-"}</td>
                <td className="px-4 py-3 text-right font-medium">TZS {Number(p.amount_paid || 0).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.approved_by || "-"}</td>
                <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetailData(null); }} title="Payment Details">
        {selected && (
          <div className="space-y-6" data-testid="payment-drawer">
            {/* Status Banner */}
            <div className={`rounded-xl p-4 flex items-center gap-3 ${
              selected.status === "approved" ? "bg-green-50 border border-green-200" :
              selected.status === "rejected" ? "bg-red-50 border border-red-200" :
              "bg-amber-50 border border-amber-200"
            }`}>
              {selected.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
               selected.status === "rejected" ? <XCircle className="w-5 h-5 text-red-600" /> :
               <Clock className="w-5 h-5 text-amber-600" />}
              <div>
                <p className="font-semibold text-sm">{selected.status === "approved" ? "Approved" : selected.status === "rejected" ? "Rejected" : "Pending Review"}</p>
                {selected.approved_by && <p className="text-xs text-slate-500">by {selected.approved_by} {selected.approved_at ? `on ${new Date(selected.approved_at).toLocaleDateString()}` : ""}</p>}
                {selected.rejection_reason && <p className="text-xs text-red-600 mt-1">Reason: {selected.rejection_reason}</p>}
              </div>
            </div>

            {/* Customer & Payer */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2"><User className="w-3.5 h-3.5" />CUSTOMER</div>
                <p className="font-semibold text-[#20364D]" data-testid="drawer-customer-name">{selected.customer_name || "-"}</p>
                {selected.company_name && <p className="text-xs text-slate-500 mt-1"><Building2 className="w-3 h-3 inline mr-1" />{selected.company_name}</p>}
                {selected.customer_email && <p className="text-xs text-slate-500 mt-1"><Mail className="w-3 h-3 inline mr-1" />{selected.customer_email}</p>}
                {selected.contact_phone && <p className="text-xs text-slate-500 mt-1"><Phone className="w-3 h-3 inline mr-1" />{selected.contact_phone}</p>}
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2"><CreditCard className="w-3.5 h-3.5" />PAYER</div>
                <p className="font-semibold text-[#20364D]" data-testid="drawer-payer-name">{selected.payer_name || "-"}</p>
                {selected.payment_reference && <p className="text-xs text-slate-500 mt-1"><Receipt className="w-3 h-3 inline mr-1" />Ref: {selected.payment_reference}</p>}
              </div>
            </div>

            {/* Financial Details */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-500 mb-2"><FileText className="w-3.5 h-3.5 inline mr-1" />FINANCIAL DETAILS</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Invoice:</span> <span className="font-semibold">{selected.invoice_number || "-"}</span></div>
                <div><span className="text-slate-500">Amount Paid:</span> <span className="font-semibold">TZS {Number(selected.amount_paid || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Invoice Total:</span> <span className="font-medium">TZS {Number(selected.total_invoice_amount || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Payment Mode:</span> <span className="font-medium">{selected.payment_mode || "full"}</span></div>
                <div><span className="text-slate-500">Submitted:</span> <span className="font-medium">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}</span></div>
              </div>
            </div>

            {/* Invoice Link */}
            {selected.invoice_id && (
              <a href={`/admin/invoices/${selected.invoice_id}`} className="flex items-center gap-2 text-sm font-semibold text-[#20364D] hover:underline" data-testid="drawer-invoice-link">
                <FileText className="w-4 h-4" />View Linked Invoice ({selected.invoice_number})
              </a>
            )}

            {/* Payment Proof File */}
            {selected.file_url && (
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">PAYMENT PROOF</p>
                <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline" data-testid="drawer-proof-file">
                  <Eye className="w-4 h-4" />View uploaded proof
                </a>
              </div>
            )}

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

            {/* Actions */}
            {selected.status === "uploaded" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-40"
                  data-testid="approve-payment-btn"
                >
                  {acting ? "Processing..." : "Approve Payment"}
                </button>
                <button
                  onClick={() => {
                    const reason = window.prompt("Rejection reason:");
                    if (reason !== null) handleReject(reason);
                  }}
                  disabled={acting}
                  className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-40"
                  data-testid="reject-payment-btn"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
