import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function CustomerQuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/api/customer/quotes/${quoteId}`);
      setQuote(res.data);
    } catch (error) {
      console.error("Failed to load quote:", error);
      toast.error("Failed to load quote details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [quoteId]);

  const approveAndConvert = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/api/customer/quotes/${quoteId}/approve`, {
        convert_to_invoice: true,
      });

      toast.success("Quote approved and converted to invoice!");
      const invoice = res.data?.invoice;
      if (invoice?.id) {
        navigate(`/dashboard/invoices/${invoice.id}`);
      } else {
        navigate("/account/invoices");
      }
    } catch (error) {
      console.error("Failed to approve quote:", error);
      toast.error(error?.response?.data?.detail || "Failed to approve quote");
    } finally {
      setActionLoading(false);
    }
  };

  const approveOnly = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/customer/quotes/${quoteId}/approve`, {
        convert_to_invoice: false,
      });
      toast.success("Quote approved successfully!");
      await load();
    } catch (error) {
      console.error("Failed to approve quote:", error);
      toast.error(error?.response?.data?.detail || "Failed to approve quote");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "converted":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 md:p-8 text-center">
        <p className="text-slate-500 mb-4">Quote not found.</p>
        <Link to="/account/quotes">
          <Button variant="outline">Back to Quotes</Button>
        </Link>
      </div>
    );
  }

  const canApprove = ["draft", "sent", "pending", "approved"].includes(quote.status);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6" data-testid="quote-detail-page">
      {/* Back link */}
      <Link
        to="/account/quotes"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        data-testid="back-to-quotes"
      >
        <ArrowLeft size={16} />
        Back to Quotes
      </Link>

      {/* Header Card */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Quote Number</div>
            <div className="text-3xl font-bold mt-2 text-[#2D3E50]">{quote.quote_number}</div>
            <div className="text-slate-500 mt-2">{quote.customer_company || quote.customer_name}</div>
          </div>

          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(quote.status)}`}>
            {quote.status}
          </span>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-5 py-4 text-sm font-semibold text-slate-600">Description</th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-600 text-right">Qty</th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-600 text-right">Unit Price</th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-600 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(quote.line_items || []).map((item, idx) => (
              <tr key={idx} className="border-b last:border-b-0">
                <td className="px-5 py-4">{item.description || item.name}</td>
                <td className="px-5 py-4 text-right">{item.quantity || 1}</td>
                <td className="px-5 py-4 text-right">
                  {quote.currency || "TZS"} {Number(item.unit_price || 0).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right">
                  {quote.currency || "TZS"} {Number(item.total || item.quantity * item.unit_price || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Grid */}
      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        {/* Terms Card */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Commercial Terms</h2>
          <div className="space-y-3 mt-4 text-slate-600">
            <div>Payment Terms: {quote.payment_term_label || "-"}</div>
            <div>Valid Until: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "-"}</div>
            {quote.notes && <div>Notes: {quote.notes}</div>}
          </div>
        </div>

        {/* Totals Card */}
        <div className="rounded-3xl border bg-white p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{quote.currency || "TZS"} {Number(quote.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{quote.currency || "TZS"} {Number(quote.tax || 0).toLocaleString()}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{quote.currency || "TZS"} {Number(quote.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>Total</span>
              <span>{quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}</span>
            </div>
          </div>

          {canApprove && (
            <div className="space-y-3 mt-6">
              <Button
                type="button"
                onClick={approveAndConvert}
                disabled={actionLoading}
                className="w-full bg-[#2D3E50] hover:bg-[#253242]"
                data-testid="approve-convert-btn"
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Approve & Convert to Invoice"
                )}
              </Button>

              <Button
                type="button"
                onClick={approveOnly}
                disabled={actionLoading}
                variant="outline"
                className="w-full"
                data-testid="approve-only-btn"
              >
                Approve Only
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
