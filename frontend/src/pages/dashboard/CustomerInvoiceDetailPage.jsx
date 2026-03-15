import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function CustomerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
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
        return "bg-amber-100 text-amber-700";
      case "paid":
        return "bg-emerald-100 text-emerald-700";
      case "partially_paid":
        return "bg-blue-100 text-blue-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const payNow = () => {
    navigate(
      `/payment/select?target_type=invoice&target_id=${invoice.id}&email=${encodeURIComponent(invoice.customer_email || "")}`,
      {
        state: {
          customerName: invoice.customer_name,
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 md:p-8 text-center">
        <p className="text-slate-500 mb-4">Invoice not found.</p>
        <Link to="/dashboard/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const balanceDue = Number(invoice.balance_due || invoice.total || 0);
  const canPay = ["sent", "partially_paid", "draft"].includes(invoice.status) && balanceDue > 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6" data-testid="invoice-detail-page">
      {/* Back link */}
      <Link
        to="/dashboard/invoices"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        data-testid="back-to-invoices"
      >
        <ArrowLeft size={16} />
        Back to Invoices
      </Link>

      {/* Header Card */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Invoice Number</div>
            <div className="text-3xl font-bold mt-2 text-[#2D3E50]">{invoice.invoice_number}</div>
            <div className="text-slate-500 mt-2">{invoice.customer_company || invoice.customer_name}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}>
            {invoice.status}
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
            {(invoice.line_items || []).map((item, idx) => (
              <tr key={idx} className="border-b last:border-b-0">
                <td className="px-5 py-4">{item.description || item.name}</td>
                <td className="px-5 py-4 text-right">{item.quantity || 1}</td>
                <td className="px-5 py-4 text-right">
                  {invoice.currency || "TZS"} {Number(item.unit_price || 0).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right">
                  {invoice.currency || "TZS"} {Number(item.total || item.quantity * item.unit_price || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Grid */}
      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        {/* Payment Details Card */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Payment Details</h2>
          <div className="space-y-3 mt-4 text-slate-600">
            <div>Terms: {invoice.payment_term_label || "-"}</div>
            <div>Due Date: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</div>
            <div>Issue Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "-"}</div>
          </div>
        </div>

        {/* Totals Card */}
        <div className="rounded-3xl border bg-white p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{invoice.currency || "TZS"} {Number(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{invoice.currency || "TZS"} {Number(invoice.tax || 0).toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{invoice.currency || "TZS"} {Number(invoice.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span>{invoice.currency || "TZS"} {Number(invoice.paid_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>Balance Due</span>
              <span className={balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}>
                {invoice.currency || "TZS"} {balanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          {canPay && (
            <Button
              type="button"
              onClick={payNow}
              className="w-full mt-6 bg-[#D4A843] hover:bg-[#c49a3d]"
              data-testid="pay-now-btn"
            >
              Pay Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
