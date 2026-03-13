import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Receipt, ArrowLeft, CheckCircle2, Clock, CreditCard, Download, Printer } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function CustomerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/customer/invoices/${invoiceId}`);
        setInvoice(res.data);
      } catch (error) {
        console.error("Failed to load invoice:", error);
        toast.error("Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Invoice not found.</p>
        <Link to="/dashboard/invoices">
          <Button variant="outline" className="mt-4">
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const hasBalance = invoice.balance_due > 0;

  return (
    <div className="space-y-6" data-testid="invoice-detail-page">
      {/* Back button */}
      <Link
        to="/dashboard/invoices"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        data-testid="back-to-invoices"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{invoice.invoice_number}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            Issued on{" "}
            {invoice.created_at
              ? new Date(invoice.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </p>
          {invoice.due_date && (
            <p className="text-sm text-slate-500 mt-1">
              Due: {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {hasBalance && !isPaid && (
            <Link to={`/payment/select?invoice=${invoice.id}`}>
              <Button
                className="bg-[#D4A843] hover:bg-[#c49a3d]"
                data-testid="pay-now-btn"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Paid status message */}
      {isPaid && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-900">Invoice Paid</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Thank you! This invoice has been paid in full.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment summary if partial */}
      {invoice.paid_amount > 0 && !isPaid && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Partial Payment Received</h3>
              <p className="text-sm text-blue-700 mt-1">
                Paid: {invoice.currency || "TZS"} {Number(invoice.paid_amount).toLocaleString()} | 
                Balance: {invoice.currency || "TZS"} {Number(invoice.balance_due).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice details card */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        {/* Customer info */}
        <div className="p-6 border-b bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Bill To
          </h2>
          <p className="font-semibold text-lg">{invoice.customer_name || "—"}</p>
          {invoice.customer_company && (
            <p className="text-slate-600">{invoice.customer_company}</p>
          )}
          {invoice.customer_email && (
            <p className="text-sm text-slate-500">{invoice.customer_email}</p>
          )}
          {invoice.customer_address_line_1 && (
            <div className="text-sm text-slate-500 mt-2">
              <p>{invoice.customer_address_line_1}</p>
              {invoice.customer_address_line_2 && <p>{invoice.customer_address_line_2}</p>}
              {invoice.customer_city && <p>{invoice.customer_city}, {invoice.customer_country}</p>}
            </div>
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
                {(invoice.line_items || []).map((item, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium">{item.description || item.name || `Item ${idx + 1}`}</p>
                      {item.notes && (
                        <p className="text-sm text-slate-500 mt-1">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">{item.quantity || 1}</td>
                    <td className="py-4 px-4 text-right">
                      {invoice.currency || "TZS"} {Number(item.unit_price || 0).toLocaleString()}
                    </td>
                    <td className="py-4 pl-4 text-right font-medium">
                      {invoice.currency || "TZS"} {Number(item.total || item.quantity * item.unit_price || 0).toLocaleString()}
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
              <span>{invoice.currency || "TZS"} {Number(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span>{invoice.currency || "TZS"} {Number(invoice.tax || 0).toLocaleString()}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{invoice.currency || "TZS"} {Number(invoice.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{invoice.currency || "TZS"} {Number(invoice.total || 0).toLocaleString()}</span>
            </div>
            {invoice.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Paid</span>
                  <span>-{invoice.currency || "TZS"} {Number(invoice.paid_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-amber-600">
                  <span>Balance Due</span>
                  <span>{invoice.currency || "TZS"} {Number(invoice.balance_due || 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Terms & Notes */}
      {(invoice.payment_term_label || invoice.notes) && (
        <div className="rounded-3xl border bg-white p-6">
          {invoice.payment_term_label && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Payment Terms
              </h3>
              <p className="text-slate-600">{invoice.payment_term_label}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Notes
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
