import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FileText, ArrowLeft, CheckCircle2, Clock, Download, Printer } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function CustomerQuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
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
    load();
  }, [quoteId]);

  const handleApprove = async () => {
    if (!quote) return;
    setApproving(true);
    try {
      const res = await api.post(`/api/customer/quotes/${quoteId}/approve`, {
        convert_to_invoice: true,
      });
      toast.success("Quote approved successfully!");
      
      // Update local state
      setQuote(res.data.quote);
      
      // If invoice was created, show info
      if (res.data.invoice) {
        toast.info(`Invoice ${res.data.invoice.invoice_number} has been created.`);
      }
    } catch (error) {
      console.error("Failed to approve quote:", error);
      toast.error(error.response?.data?.detail || "Failed to approve quote");
    } finally {
      setApproving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "converted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "rejected":
      case "expired":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const canApprove = quote && (quote.status === "sent" || quote.status === "pending");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
          <div className="h-8 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Quote not found.</p>
        <Link to="/dashboard/quotes">
          <Button variant="outline" className="mt-4">
            Back to Quotes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quote-detail-page">
      {/* Back button */}
      <Link
        to="/dashboard/quotes"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        data-testid="back-to-quotes"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Quotes
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{quote.quote_number}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(quote.status)}`}
            >
              {quote.status}
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            Created on{" "}
            {quote.created_at
              ? new Date(quote.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </p>
          {quote.valid_until && (
            <p className="text-sm text-slate-500 mt-1">
              Valid until: {new Date(quote.valid_until).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {canApprove && (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-[#D4A843] hover:bg-[#c49a3d]"
              data-testid="approve-quote-btn"
            >
              {approving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Quote
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Approval success message */}
      {quote.status === "approved" || quote.status === "converted" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-900">Quote Approved</h3>
              <p className="text-sm text-emerald-700 mt-1">
                {quote.status === "converted"
                  ? "This quote has been converted to an invoice. You can view it in your invoices."
                  : "This quote has been approved. An invoice will be generated shortly."}
              </p>
              {quote.invoice_id && (
                <Link to="/dashboard/invoices">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-emerald-300 text-emerald-700"
                    data-testid="view-invoice-btn"
                  >
                    View Invoice
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Quote details card */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        {/* Customer info */}
        <div className="p-6 border-b bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Quote For
          </h2>
          <p className="font-semibold text-lg">{quote.customer_name || "—"}</p>
          {quote.customer_company && (
            <p className="text-slate-600">{quote.customer_company}</p>
          )}
          {quote.customer_email && (
            <p className="text-sm text-slate-500">{quote.customer_email}</p>
          )}
        </div>

        {/* Line items */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3 pr-4 text-sm font-semibold text-slate-600">Description</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Qty</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Unit Price</th>
                  <th className="py-3 pl-4 text-sm font-semibold text-slate-600 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.line_items || []).map((item, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium">{item.description || item.name || `Item ${idx + 1}`}</p>
                      {item.notes && (
                        <p className="text-sm text-slate-500 mt-1">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">{item.quantity || 1}</td>
                    <td className="py-4 px-4 text-right">
                      {quote.currency || "TZS"} {Number(item.unit_price || 0).toLocaleString()}
                    </td>
                    <td className="py-4 pl-4 text-right font-medium">
                      {quote.currency || "TZS"} {Number(item.total || item.quantity * item.unit_price || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-6 bg-slate-50 border-t">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span>{quote.currency || "TZS"} {Number(quote.subtotal || 0).toLocaleString()}</span>
            </div>
            {quote.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span>{quote.currency || "TZS"} {Number(quote.tax || 0).toLocaleString()}</span>
              </div>
            )}
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{quote.currency || "TZS"} {Number(quote.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Notes */}
      {(quote.terms || quote.notes) && (
        <div className="rounded-3xl border bg-white p-6">
          {quote.terms && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Terms & Conditions
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}
          {quote.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Notes
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
