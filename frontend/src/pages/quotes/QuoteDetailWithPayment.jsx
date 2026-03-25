import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { FileText, Download, ArrowLeft, CheckCircle, XCircle, Layers, Loader2 } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_MAP = {
  sent: { label: "Awaiting Your Review", color: "bg-amber-100 text-amber-800" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Accepted", color: "bg-green-100 text-green-800" },
  converted: { label: "Converted", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-700" },
};

export default function QuoteDetailWithPayment() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => { loadQuote(); }, [quoteId]);

  const loadQuote = async () => {
    try {
      const res = await api.get(`/api/customer/quotes/${quoteId}`);
      setQuote(res.data);
    } catch (err) {
      toast.error("Failed to load quote");
      navigate("/dashboard/quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/api/customer/quotes/${quoteId}/approve`, { convert_to_invoice: true });
      toast.success("Quote accepted! Invoice created.");
      const invoiceId = res.data?.invoice?.id;
      if (invoiceId) {
        navigate(`/dashboard/invoices/${invoiceId}/pay`);
      } else {
        navigate("/dashboard/invoices");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to accept quote");
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/customer/quotes/${quoteId}/reject`, { reason: rejectReason });
      toast.success("Quote rejected.");
      setShowRejectModal(false);
      navigate("/dashboard/quotes");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject quote");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="quote-detail-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12" data-testid="quote-not-found">
        <p className="text-slate-500">Quote not found</p>
        <Link to="/dashboard/quotes" className="text-[#20364D] font-medium mt-2 inline-block">Back to Quotes</Link>
      </div>
    );
  }

  const si = STATUS_MAP[quote.status] || { label: quote.status, color: "bg-slate-100 text-slate-600" };
  const total = Number(quote.total_amount || quote.total || 0);
  const items = quote.items || quote.line_items || [];
  const canAct = ["sent", "pending", "draft"].includes(quote.status);

  return (
    <div className="space-y-6" data-testid="quote-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/quotes" className="p-2 hover:bg-slate-100 rounded-lg transition" data-testid="back-to-quotes">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#20364D]">
              {quote.quote_number || `Quote ${(quote.id || "").slice(-8)}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${si.color}`}>{si.label}</span>
              <span className="text-slate-500 text-sm">Created {new Date(quote.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canAct && (
            <>
              <button onClick={handleAccept} disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                data-testid="accept-quote-btn">
                <CheckCircle className="w-4 h-4" /> {actionLoading ? "Processing..." : "Accept Quote"}
              </button>
              <button onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition"
                data-testid="reject-quote-btn">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {quote.status === "converted" && (quote.invoice_id || quote.splits?.length > 0) && (
            <Link to={`/dashboard/invoices/${quote.invoice_id}/pay`}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D4A843] text-[#17283C] rounded-xl font-semibold hover:bg-[#c49a3d] transition"
              data-testid="go-to-invoice-btn">
              Pay Invoice
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-[2rem] border bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="w-5 h-5 text-[#20364D]" />
              <h2 className="font-bold text-lg text-[#20364D]">Quote Details</h2>
            </div>
            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="quote-items-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Item</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Qty</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Unit Price</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3 px-2">
                          <div className="font-medium text-slate-800">{item.name || item.description || "Item"}</div>
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600">{item.quantity || 1}</td>
                        <td className="py-3 px-2 text-right text-slate-600">{money(item.unit_price)}</td>
                        <td className="py-3 px-2 text-right font-medium text-slate-800">{money(item.line_total || (item.unit_price || 0) * (item.quantity || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No itemized breakdown available.</p>
            )}

            {/* Totals */}
            <div className="mt-6 pt-4 border-t space-y-2">
              {quote.subtotal_amount > 0 && (
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Subtotal</span>
                  <span>{money(quote.subtotal_amount || quote.subtotal)}</span>
                </div>
              )}
              {(quote.vat_amount > 0 || quote.vat_percent > 0) && (
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>VAT</span>
                  <span>{money(quote.vat_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-[#20364D] pt-2">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="rounded-[2rem] border bg-white p-6">
              <h3 className="font-bold text-[#20364D] mb-3">Notes & Terms</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Type */}
          <div className="rounded-[2rem] border bg-white p-6" data-testid="payment-type-panel">
            <h3 className="font-bold text-[#20364D] mb-3">Payment Terms</h3>
            {quote.payment_type === "installment" && quote.deposit_percent > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                  <Layers className="w-4 h-4" /> Installment Payment
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Deposit ({quote.deposit_percent}%)</span>
                    <span className="font-semibold text-amber-800">{money(total * quote.deposit_percent / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Balance ({100 - quote.deposit_percent}%)</span>
                    <span className="font-semibold text-amber-800">{money(total * (100 - quote.deposit_percent) / 100)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Pay the deposit first. Balance due before delivery/completion.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Full Payment</span> required upon acceptance.
              </div>
            )}
          </div>

          {/* Validity */}
          {quote.valid_until && (
            <div className="rounded-[2rem] border bg-white p-6">
              <h3 className="font-bold text-[#20364D] mb-2">Valid Until</h3>
              <p className="text-slate-600">{new Date(quote.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
          )}

          {/* Bank Details */}
          <div className="rounded-[2rem] border bg-white p-6">
            <h3 className="font-bold text-[#20364D] mb-3">Bank Transfer Details</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Bank:</strong> CRDB Bank</p>
              <p><strong>Account:</strong> KONEKT LIMITED</p>
              <p><strong>Account No:</strong> 015C8841347002</p>
              <p><strong>SWIFT:</strong> CORUTZTZ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="reject-modal">
            <h2 className="text-xl font-bold text-[#20364D] mb-4">Reject Quote</h2>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejecting this quote (optional).</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-4"
              rows={3}
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="reject-reason-input"
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 rounded-xl bg-red-600 text-white px-4 py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
                data-testid="confirm-reject-btn">
                {actionLoading ? "Rejecting..." : "Reject Quote"}
              </button>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="flex-1 rounded-xl border px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
