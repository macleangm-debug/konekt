import React, { useEffect, useState } from "react";
import { CreditCard, Search, Eye, CheckCircle, XCircle, RefreshCcw, FileText } from "lucide-react";
import { paymentApi } from "@/lib/paymentApi";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import { useConfirmModal } from "@/contexts/ConfirmModalContext";

const providerLabels = {
  kwikpay: "KwikPay Mobile",
  bank_transfer: "Bank Transfer",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { confirmAction } = useConfirmModal();

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await paymentApi.getAdminPayments(params);
      setPayments(res.data || []);
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [filterStatus]);

  const verifyPayment = async (paymentId) => {
    confirmAction({
      title: "Verify Payment?",
      message: "This will confirm the payment as verified and paid.",
      confirmLabel: "Verify & Confirm",
      tone: "success",
      onConfirm: async () => {
        try {
          await paymentApi.verifyAdminPayment(paymentId);
          loadPayments();
          alert("Payment verified successfully");
        } catch (error) {
          console.error(error);
          alert(error?.response?.data?.detail || "Failed to verify payment");
        }
      },
    });
  };

  const rejectPayment = async (paymentId) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await paymentApi.rejectAdminPayment(paymentId, reason);
      loadPayments();
      alert("Payment rejected");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to reject payment");
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.document_number?.toLowerCase().includes(term) ||
      p.customer_name?.toLowerCase().includes(term) ||
      p.customer_email?.toLowerCase().includes(term) ||
      p.reference?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString() + " " + new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => ["pending", "payment_submitted", "awaiting_customer_payment"].includes(p.status)).length,
    paid: payments.filter((p) => p.status === "paid").length,
    failed: payments.filter((p) => p.status === "failed").length,
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="admin-payments-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-[#D4A843]" />
              Payments
            </h1>
            <p className="text-slate-600 mt-1">Review and verify mobile money and bank transfer payments</p>
          </div>
          <button
            onClick={loadPayments}
            className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total Payments</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-600">Pending Review</p>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm text-emerald-600">Verified/Paid</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.paid}</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">Failed/Rejected</p>
            <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-payments-input"
            />
          </div>
          <select
            className="border border-slate-300 rounded-xl px-4 py-3"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="payment_submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              No payments found
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border bg-white p-6"
                data-testid={`payment-card-${payment.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">{payment.document_number || payment.reference}</span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100">
                        {providerLabels[payment.provider] || payment.provider}
                      </span>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <p className="text-slate-600">
                      {payment.customer_name} • {payment.customer_email}
                    </p>
                    <div className="flex items-center gap-6 mt-2 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        {payment.currency} {Number(payment.amount || 0).toLocaleString()}
                      </span>
                      <span>Ref: {payment.reference}</span>
                      <span>{formatDate(payment.created_at)}</span>
                    </div>
                    {payment.transaction_reference && (
                      <p className="text-xs text-slate-500 mt-2">
                        Bank Ref: {payment.transaction_reference}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {payment.proof_url && (
                      <a
                        href={payment.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                        data-testid={`view-proof-${payment.id}`}
                      >
                        <Eye className="w-4 h-4" />
                        View Proof
                      </a>
                    )}

                    {!["paid", "failed"].includes(payment.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => verifyPayment(payment.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700"
                          data-testid={`verify-payment-${payment.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectPayment(payment.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
                          data-testid={`reject-payment-${payment.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}

                    {payment.target_type && payment.target_id && (
                      <a
                        href={`/admin/${payment.target_type === "order" ? "orders" : "invoices"}/${payment.target_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <FileText className="w-4 h-4" />
                        View {payment.target_type}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
