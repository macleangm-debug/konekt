import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { FileText, CreditCard, Download, ArrowLeft, CheckCircle } from "lucide-react";

export default function QuoteDetailWithPayment() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      // Try quotes_v2 first, then fall back to quotes
      let res;
      try {
        res = await api.get(`/api/customer/quotes/${quoteId}`);
      } catch (e) {
        res = await api.get(`/api/quotes/${quoteId}`);
      }
      setQuote(res.data);
    } catch (err) {
      toast.error("Failed to load quote");
      navigate("/account/quotes");
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      // Convert quote to invoice and mark as paid
      await api.post(`/api/customer/quotes/${quoteId}/convert-to-invoice`);
      toast.success("Quote converted to invoice! Proceeding to payment...");
      setShowPaymentModal(true);
    } catch (err) {
      // If conversion endpoint doesn't exist, show bank payment modal directly
      setShowPaymentModal(true);
    } finally {
      setPaying(false);
    }
  };

  const handleBankPaymentConfirm = async () => {
    try {
      await api.patch(`/api/customer/quotes/${quoteId}/status`, { status: "paid" });
      toast.success("Payment recorded! Our team will verify and process your order.");
      navigate("/account/orders");
    } catch (err) {
      toast.error("Failed to record payment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20364D]"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Quote not found</p>
        <Link to="/account/quotes" className="text-[#20364D] font-medium mt-2 inline-block">
          ← Back to Quotes
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-slate-100 text-slate-800";
  };

  return (
    <div className="space-y-6" data-testid="quote-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/account/quotes" className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#20364D]">
              Quote #{quote.quote_number || quote.id.slice(0, 8).toUpperCase()}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(quote.status)}`}>
                {quote.status}
              </span>
              <span className="text-slate-500 text-sm">
                Created {new Date(quote.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-slate-50 transition">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          {quote.status === "pending" && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="flex items-center gap-2 px-5 py-2 bg-[#20364D] text-white rounded-xl font-semibold hover:bg-[#2a4563] transition disabled:opacity-50"
              data-testid="pay-now-btn"
            >
              <CreditCard className="w-4 h-4" />
              {paying ? "Processing..." : "Pay Now"}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quote Details */}
        <div className="lg:col-span-2 border rounded-2xl bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-[#20364D]" />
            <h2 className="font-bold text-lg text-[#20364D]">Quote Details</h2>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Item</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Qty</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Unit Price</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-2">
                      <div className="font-medium text-slate-800">{item.name}</div>
                      {item.sku && <div className="text-xs text-slate-500">SKU: {item.sku}</div>}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-2 text-right text-slate-600">TZS {(item.unit_price || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-medium text-slate-800">TZS {(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>TZS {(quote.subtotal || 0).toLocaleString()}</span>
            </div>
            {quote.vat_percent && (
              <div className="flex justify-between text-slate-600">
                <span>VAT ({quote.vat_percent}%)</span>
                <span>TZS {(quote.vat_amount || 0).toLocaleString()}</span>
              </div>
            )}
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-TZS {quote.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-[#20364D] pt-2">
              <span>Total</span>
              <span>TZS {(quote.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Delivery Address */}
          {quote.delivery_address && (
            <div className="border rounded-2xl bg-white p-6">
              <h3 className="font-bold text-[#20364D] mb-4">Delivery Address</h3>
              <div className="text-slate-600 space-y-1">
                <p>{quote.delivery_address.street}</p>
                <p>{quote.delivery_address.city}, {quote.delivery_address.region}</p>
                <p>{quote.delivery_address.country}</p>
                {quote.delivery_address.contact_phone && (
                  <p className="font-medium mt-2">Phone: {quote.delivery_address.contact_phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="border rounded-2xl bg-white p-6">
            <h3 className="font-bold text-[#20364D] mb-4">Payment Information</h3>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">Bank Transfer Details:</p>
              <p>Bank: CRDB Bank</p>
              <p>Account: Konekt Co. Ltd</p>
              <p>Account No: 0150XXXXXXXX</p>
              <p className="mt-2 text-xs">Use Quote # as payment reference</p>
            </div>
          </div>

          {/* Valid Until */}
          {quote.valid_until && (
            <div className="border rounded-2xl bg-white p-6">
              <h3 className="font-bold text-[#20364D] mb-2">Quote Valid Until</h3>
              <p className="text-slate-600">{new Date(quote.valid_until).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-[#20364D]">Complete Payment</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Bank Transfer Details</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Bank:</strong> CRDB Bank</p>
                  <p><strong>Account Name:</strong> Konekt Co. Ltd</p>
                  <p><strong>Account Number:</strong> 0150XXXXXXXX</p>
                  <p><strong>Reference:</strong> {quote.quote_number || quote.id.slice(0, 8).toUpperCase()}</p>
                  <p><strong>Amount:</strong> TZS {(quote.total || 0).toLocaleString()}</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600">
                After making the transfer, click the button below to notify our team. We'll verify and process your order within 24 hours.
              </p>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 border rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBankPaymentConfirm}
                className="flex-1 px-4 py-3 bg-[#20364D] text-white rounded-xl font-semibold hover:bg-[#2a4563] transition"
                data-testid="confirm-payment-btn"
              >
                I've Made Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
