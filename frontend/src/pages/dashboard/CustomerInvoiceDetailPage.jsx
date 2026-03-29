import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Coins } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import PointsUsageBox from "../../components/checkout/PointsUsageBox";

export default function CustomerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pointsPreview, setPointsPreview] = useState(null);
  const [requestedPoints, setRequestedPoints] = useState(0);
  const [applyingPoints, setApplyingPoints] = useState(false);

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

  useEffect(() => {
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

  const applyPoints = async () => {
    if (!requestedPoints || requestedPoints <= 0) {
      toast.error("No points to apply");
      return;
    }
    try {
      setApplyingPoints(true);
      const res = await api.post(`/api/customer/points-apply/invoice/${invoice.id}`, {
        requested_points: requestedPoints,
      });
      setInvoice(res.data.invoice);
      setPointsPreview(null);
      setRequestedPoints(0);
      toast.success(`Applied ${res.data.applied_points} points successfully! Saved TZS ${Number(res.data.discount_value).toLocaleString()}`);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Failed to apply points");
    } finally {
      setApplyingPoints(false);
    }
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
        <Link to="/account/invoices">
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
        to="/account/invoices"
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
      <div className="grid md:grid-cols-[1fr_380px] gap-6">
        {/* Payment Details Card */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Payment Details</h2>
          <div className="space-y-3 mt-4 text-slate-600">
            <div>Terms: {invoice.payment_term_label || "-"}</div>
            <div>Due Date: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</div>
            <div>Issue Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "-"}</div>
          </div>

          {/* Points Usage Section */}
          {canPay && (
            <div className="mt-6">
              <PointsUsageBox
                subtotal={balanceDue}
                onApplied={(preview) => {
                  setPointsPreview(preview);
                  setRequestedPoints(preview?.usable_points || 0);
                }}
              />

              {pointsPreview?.usable_points > 0 && (
                <Button
                  type="button"
                  onClick={applyPoints}
                  disabled={applyingPoints}
                  variant="outline"
                  className="mt-4 w-full border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10"
                  data-testid="apply-points-btn"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {applyingPoints ? "Applying..." : `Apply ${pointsPreview.usable_points.toLocaleString()} Points`}
                </Button>
              )}
            </div>
          )}
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
              className="w-full mt-6 bg-[#2D3E50] hover:bg-[#1e2d3d]"
              data-testid="pay-now-btn"
            >
              Pay Now
            </Button>
          )}

          {invoice.status === "paid" && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-center">
              <span className="font-semibold">Fully Paid</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      {(invoice.payments || []).length > 0 && (
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Payment History</h2>
          <div className="mt-4 space-y-3">
            {invoice.payments.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div>
                  <div className="font-medium capitalize">{payment.type?.replace(/_/g, " ") || "Payment"}</div>
                  <div className="text-sm text-slate-500">
                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "-"}
                  </div>
                  {payment.reference && (
                    <div className="text-xs text-slate-400 mt-1">Ref: {payment.reference}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">
                    {invoice.currency || "TZS"} {Number(payment.amount || 0).toLocaleString()}
                  </div>
                  {payment.points_used && (
                    <div className="text-xs text-slate-500">{payment.points_used} points used</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
