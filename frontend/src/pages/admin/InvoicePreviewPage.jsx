import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ArrowLeft, CreditCard, Check, AlertCircle, DollarSign } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export default function InvoicePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: "bank_transfer",
    reference: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const rendererRef = useRef(null);

  useEffect(() => {
    loadInvoice();
    loadPayments();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/invoices/${id}`);
      setInvoice(res.data);
    } catch (error) {
      console.error("Failed to load invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await api.get(`/api/admin/invoices/${id}/payments`);
      setPayments(res.data || []);
    } catch (error) {
      console.error("Failed to load payments:", error);
    }
  };

  const downloadPDF = async () => {
    if (!rendererRef.current) {
      toast.error("Document not ready");
      return;
    }
    try {
      setDownloading(true);
      await rendererRef.current.exportAsPDF(`${invoice?.invoice_number || "invoice"}.pdf`);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      setSubmittingPayment(true);
      await api.post(`/api/admin/invoices/${id}/payments`, paymentForm);
      toast.success("Payment recorded successfully");
      setShowPaymentModal(false);
      setPaymentForm({
        amount: 0,
        payment_method: "bank_transfer",
        reference: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      loadInvoice();
      loadPayments();
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error(error.response?.data?.detail || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const markAsPaid = async () => {
    try {
      await api.put(`/api/admin/invoices/${id}`, { status: "paid" });
      toast.success("Invoice marked as paid");
      loadInvoice();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen">
        <div className="text-slate-500">Invoice not found</div>
        <Button onClick={() => navigate("/admin/invoices")} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const currency = invoice.currency || "TZS";
  const paidAmount = invoice.paid_amount || payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceDue = invoice.total - paidAmount;
  const isOverdue = new Date(invoice.due_date) < new Date() && balanceDue > 0;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="invoice-preview-page">
      <div className="max-w-5xl mx-auto">
        {/* ═══ ACTION BAR (outside renderer) ═══ */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/admin/invoices")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            data-testid="back-to-invoices"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </button>

          <div className="flex items-center gap-3">
            <Badge className={`${statusColors[invoice.status]} text-sm px-3 py-1`} data-testid="invoice-status-badge">
              {invoice.status?.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              onClick={downloadPDF}
              disabled={downloading}
              data-testid="download-pdf-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            {balanceDue > 0 && (
              <Button
                onClick={() => {
                  setPaymentForm((prev) => ({ ...prev, amount: balanceDue }));
                  setShowPaymentModal(true);
                }}
                className="bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]"
                data-testid="record-payment-btn"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* ═══ PAYMENT SUMMARY CARD (outside renderer) ═══ */}
        {(paidAmount > 0 || balanceDue > 0) && (
          <div
            className={`rounded-2xl border p-4 mb-6 ${isOverdue ? "bg-red-50 border-red-200" : "bg-white"}`}
            data-testid="payment-summary"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-sm text-slate-500">Total Amount</div>
                  <div className="text-xl font-bold">{formatMoney(invoice.total, currency)}</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <div className="text-sm text-green-600">Paid</div>
                  <div className="text-xl font-bold text-green-600">{formatMoney(paidAmount, currency)}</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <div className={`text-sm ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                    {isOverdue ? "Overdue" : "Balance Due"}
                  </div>
                  <div className={`text-xl font-bold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                    {formatMoney(balanceDue, currency)}
                  </div>
                </div>
              </div>
              {isOverdue && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Payment Overdue</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min((paidAmount / invoice.total) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {Math.round((paidAmount / invoice.total) * 100)}% paid
              </div>
            </div>
          </div>
        )}

        {/* ═══ CANONICAL DOCUMENT RENDERER ═══ */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" data-testid="invoice-document-preview">
          <CanonicalDocumentRenderer
            ref={rendererRef}
            docType="invoice"
            docNumber={invoice.invoice_number || ""}
            docDate={invoice.created_at?.split("T")[0] || ""}
            dueDate={invoice.due_date?.split("T")[0] || ""}
            status={invoice.status || "draft"}
            toBlock={{
              name: invoice.customer_name || "",
              company: invoice.customer_company || "",
              address: invoice.customer_address || "",
              city: invoice.customer_city || "",
              country: invoice.customer_country || "",
              email: invoice.customer_email || "",
              phone: invoice.customer_phone || "",
              tin: invoice.customer_tin || "",
              brn: invoice.customer_brn || "",
              client_type: invoice.customer_type || "individual",
            }}
            lineItems={invoice.line_items || []}
            subtotal={invoice.subtotal || 0}
            taxRate={invoice.tax_rate}
            tax={invoice.tax || 0}
            discount={invoice.discount || 0}
            total={invoice.total || 0}
            currency={currency}
            notes={invoice.notes || ""}
            paymentTermLabel={invoice.payment_term_label || ""}
          />
        </div>

        {/* ═══ PAYMENT HISTORY (outside renderer) ═══ */}
        {payments.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border p-6" data-testid="payment-history">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment History
            </h3>
            <div className="space-y-3">
              {payments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">{formatMoney(payment.amount, currency)}</div>
                      <div className="text-sm text-slate-500">
                        {payment.payment_method?.replace("_", " ")} &bull; {payment.payment_date?.split("T")[0]}
                      </div>
                    </div>
                  </div>
                  {payment.reference && (
                    <div className="text-sm text-slate-500">Ref: {payment.reference}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ QUICK ACTIONS (outside renderer) ═══ */}
        <div className="mt-6 bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {balanceDue > 0 && (
              <Button
                onClick={() => {
                  setPaymentForm((prev) => ({ ...prev, amount: balanceDue }));
                  setShowPaymentModal(true);
                }}
                className="bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]"
                data-testid="record-full-payment-btn"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Record Full Payment ({formatMoney(balanceDue, currency)})
              </Button>
            )}
            {balanceDue === 0 && invoice.status !== "paid" && (
              <Button onClick={markAsPaid} className="bg-green-600 hover:bg-green-700" data-testid="mark-paid-btn">
                <Check className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ PAYMENT MODAL ═══ */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={recordPayment} className="space-y-4 pt-4" data-testid="payment-form">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Balance Due</span>
                <span className="font-bold">{formatMoney(balanceDue, currency)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                max={balanceDue}
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                required
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                data-testid="select-payment-method"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                data-testid="input-payment-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="e.g., Transaction ID, Cheque #"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                data-testid="input-payment-reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px]"
                placeholder="Optional notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                data-testid="input-payment-notes"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingPayment}
                className="flex-1 bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]"
                data-testid="submit-payment-btn"
              >
                {submittingPayment ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
