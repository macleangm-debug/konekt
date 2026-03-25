import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, Send, ArrowLeft, Building, Mail, Phone, Calendar, Clock, Check, X, Edit2 } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import BrandLogo from "@/components/branding/BrandLogo";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  converted: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700",
};

export default function QuotePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadQuote();
    loadSettings();
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/quotes/${id}`);
      setQuote(res.data);
    } catch (error) {
      console.error("Failed to load quote:", error);
      toast.error("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/admin/settings/company");
      setSettings(res.data || {});
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const downloadPDF = async () => {
    try {
      setDownloading(true);
      const response = await api.get(`/api/admin/pdf/quote/${id}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${quote?.quote_number || "quote"}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.put(`/api/admin/quotes/${id}`, { status: newStatus });
      toast.success(`Quote marked as ${newStatus}`);
      loadQuote();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const convertToOrder = async () => {
    try {
      const res = await api.post(`/api/admin/quotes/${id}/convert-to-order`);
      toast.success("Quote converted to order");
      navigate(`/admin/orders`);
    } catch (error) {
      console.error("Failed to convert quote:", error);
      toast.error(error.response?.data?.detail || "Failed to convert quote");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading quote...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen">
        <div className="text-slate-500">Quote not found</div>
        <Button onClick={() => navigate("/admin/quotes")} className="mt-4">
          Back to Quotes
        </Button>
      </div>
    );
  }

  const currency = quote.currency || "TZS";

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="quote-preview-page">
      <div className="max-w-5xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/admin/quotes")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            data-testid="back-to-quotes"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes
          </button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/quotes/${id}/edit`)}
              data-testid="edit-quote-btn"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={downloadPDF}
              disabled={downloading}
              data-testid="download-pdf-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Downloading..." : "Download PDF"}
            </Button>
            {quote.status === "approved" && (
              <Button
                onClick={convertToOrder}
                className="bg-green-600 hover:bg-green-700"
                data-testid="convert-to-order-btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Convert to Order
              </Button>
            )}
          </div>
        </div>

        {/* Document Preview Card */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          {/* Navy Header */}
          <div className="bg-[#2D3E50] text-white p-8">
            <div className="flex items-start justify-between">
              <div>
                <BrandLogo size="md" variant="light" className="mb-4" />
                <h1 className="text-3xl font-bold">QUOTE</h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold mb-2">{quote.quote_number}</div>
                <Badge className={`${statusColors[quote.status]} text-sm px-3 py-1`}>
                  {quote.status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Company & Customer Info */}
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {/* From */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">FROM</h3>
                <div className="font-bold text-lg">{settings.company_name || "Konekt Limited"}</div>
                <div className="text-slate-600 text-sm space-y-1 mt-2">
                  {settings.address_line_1 && <div>{settings.address_line_1}</div>}
                  {settings.city && <div>{settings.city}, {settings.country}</div>}
                  {settings.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{settings.email}</div>}
                  {settings.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{settings.phone}</div>}
                  {settings.tin_number && <div>TIN: {settings.tin_number}</div>}
                </div>
              </div>

              {/* Bill To */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">BILL TO</h3>
                <div className="font-bold text-lg">{quote.customer_name}</div>
                <div className="text-slate-600 text-sm space-y-1 mt-2">
                  {quote.customer_company && <div className="flex items-center gap-2"><Building className="w-3 h-3" />{quote.customer_company}</div>}
                  {quote.customer_email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{quote.customer_email}</div>}
                  {quote.customer_phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{quote.customer_phone}</div>}
                  {quote.customer_address && <div>{quote.customer_address}</div>}
                  {quote.customer_tin && <div>TIN: {quote.customer_tin}</div>}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Issue Date</span>
                    <span className="font-medium">{quote.created_at?.split("T")[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Valid Until</span>
                    <span className="font-medium">{quote.valid_until?.split("T")[0] || "—"}</span>
                  </div>
                  {quote.payment_term_label && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Payment Terms</span>
                      <span className="font-medium">{quote.payment_term_label}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border rounded-2xl overflow-hidden mb-8">
              <table className="w-full">
                <thead className="bg-[#2D3E50] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.line_items || []).map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                      <td className="px-4 py-3 text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatMoney(item.unit_price, currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatMoney(item.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 bg-white border rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatMoney(quote.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT ({quote.tax_rate || 18}%)</span>
                  <span>{formatMoney(quote.tax, currency)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span className="text-red-600">-{formatMoney(quote.discount, currency)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-[#D4A843]">{formatMoney(quote.total, currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">Notes</h3>
                <p className="text-slate-600 text-sm">{quote.notes}</p>
              </div>
            )}

            {/* Terms */}
            {quote.terms && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">Terms & Conditions</h3>
                <p className="text-slate-600 text-sm">{quote.terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div className="mt-6 bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {quote.status === "draft" && (
              <Button onClick={() => updateStatus("sent")} data-testid="mark-sent-btn">
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button onClick={() => updateStatus("approved")} className="bg-green-600 hover:bg-green-700" data-testid="mark-approved-btn">
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Approved
                </Button>
                <Button onClick={() => updateStatus("rejected")} variant="outline" className="text-red-600" data-testid="mark-rejected-btn">
                  <X className="w-4 h-4 mr-2" />
                  Mark as Rejected
                </Button>
              </>
            )}
            {quote.status === "approved" && (
              <Button onClick={convertToOrder} className="bg-emerald-600 hover:bg-emerald-700" data-testid="convert-order-btn">
                <FileText className="w-4 h-4 mr-2" />
                Convert to Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
