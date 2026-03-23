import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Receipt, ArrowLeft, Clock, CheckCircle, AlertCircle, CreditCard, Loader2 } from "lucide-react";
import InAccountDocumentActions from "../../components/docs/InAccountDocumentActions";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function InvoiceDetailInAccountPage() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setInvoice(res.data))
      .catch(err => console.error("Failed to load invoice:", err))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const getStatusInfo = (status) => {
    switch (status) {
      case "paid":
        return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Paid" };
      case "overdue":
        return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100", label: "Overdue" };
      default:
        return { icon: Clock, color: "text-amber-600", bg: "bg-amber-100", label: "Pending Payment" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <Receipt className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <div className="text-xl font-bold text-slate-600">Invoice not found</div>
        <Link to="/dashboard/invoices" className="text-[#20364D] underline mt-2 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8" data-testid="invoice-detail-page">
      <Link 
        to="/dashboard/invoices" 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-[#20364D] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-[#20364D]" />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#20364D]">
                Invoice #{invoice.invoice_number || invoice.id?.slice(-8)}
              </div>
              <div className="text-slate-500">
                Created on {new Date(invoice.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusInfo.bg}`}>
          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Invoice Card */}
        <div className="lg:col-span-2 rounded-[2rem] border bg-white p-8 space-y-6">
          <div>
            <div className="text-sm text-slate-500 mb-1">Amount Due</div>
            <div className="text-4xl font-bold text-[#20364D]">
              TZS {Number(invoice.total || 0).toLocaleString()}
            </div>
          </div>

          {invoice.due_date && (
            <div>
              <div className="text-sm text-slate-500 mb-1">Due Date</div>
              <div className="text-lg font-semibold text-[#20364D]">
                {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            </div>
          )}

          {invoice.items && invoice.items.length > 0 && (
            <div>
              <div className="text-sm text-slate-500 mb-3">Line Items</div>
              <div className="space-y-3">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-[#20364D]">{item.name || item.product_name}</div>
                      <div className="text-sm text-slate-500">Qty: {item.quantity || 1}</div>
                    </div>
                    <div className="font-semibold text-[#20364D]">
                      TZS {Number(item.subtotal || item.price || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <InAccountDocumentActions type="invoice" id={invoiceId} />
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          {invoice.status !== "paid" && (
            <Link
              to={`/dashboard/invoices/${invoiceId}/pay`}
              className="w-full rounded-xl bg-[#20364D] text-white px-6 py-4 font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2"
              data-testid="pay-invoice-btn"
            >
              <CreditCard className="w-5 h-5" />
              Pay Invoice
            </Link>
          )}

          <div className="rounded-[2rem] border bg-white p-6">
            <div className="text-sm font-medium text-slate-500 mb-4">Need Help?</div>
            <p className="text-sm text-slate-600 mb-4">
              If you have questions about this invoice, our support team is here to help.
            </p>
            <Link
              to="/dashboard/help"
              className="text-sm text-[#20364D] font-semibold hover:underline"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
