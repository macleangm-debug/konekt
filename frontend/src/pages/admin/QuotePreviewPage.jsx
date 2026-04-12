import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, Send, ArrowLeft, Check, X, Edit2, Image } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";

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
  const [downloading, setDownloading] = useState(false);
  const rendererRef = useRef(null);

  useEffect(() => {
    loadQuote();
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/quotes-v2/${id}`);
      setQuote(res.data);
    } catch (error) {
      console.error("Failed to load quote:", error);
      toast.error("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!rendererRef.current) {
      toast.error("Document not ready");
      return;
    }
    try {
      setDownloading(true);
      await rendererRef.current.exportAsPDF(`${quote?.quote_number || "quote"}.pdf`);
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
      await api.patch(`/api/admin/quotes-v2/${id}/status`, null, { params: { status: newStatus } });
      toast.success(`Quote marked as ${newStatus}`);
      loadQuote();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const convertToOrder = async () => {
    try {
      await api.post(`/api/admin/quotes-v2/convert-to-order`, { quote_id: id });
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
        {/* ═══ ACTION BAR (outside renderer) ═══ */}
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
            <Badge className={`${statusColors[quote.status]} text-sm px-3 py-1`} data-testid="quote-status-badge">
              {quote.status?.toUpperCase()}
            </Badge>
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
              {downloading ? "Generating..." : "Download PDF"}
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

        {/* ═══ CANONICAL DOCUMENT RENDERER ═══ */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" data-testid="quote-document-preview">
          <CanonicalDocumentRenderer
            ref={rendererRef}
            docType="quote"
            docNumber={quote.quote_number || ""}
            docDate={quote.created_at?.split("T")[0] || ""}
            dueDate={quote.valid_until?.split("T")[0] || ""}
            status={quote.status || "draft"}
            toBlock={{
              name: quote.customer_name || "",
              company: quote.customer_company || "",
              address: quote.customer_address || "",
              city: quote.customer_city || "",
              country: quote.customer_country || "",
              email: quote.customer_email || "",
              phone: quote.customer_phone || "",
              tin: quote.customer_tin || "",
              brn: quote.customer_brn || "",
              client_type: quote.customer_type || "individual",
            }}
            lineItems={quote.line_items || []}
            subtotal={quote.subtotal || 0}
            taxRate={quote.tax_rate}
            tax={quote.tax || 0}
            discount={quote.discount || 0}
            total={quote.total || 0}
            currency={currency}
            notes={quote.notes || ""}
            terms={quote.terms || ""}
            paymentTermLabel={quote.payment_term_label || ""}
          />
        </div>

        {/* ═══ QUICK ACTIONS (outside renderer) ═══ */}
        <div className="mt-6 bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4" data-testid="quick-actions-title">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {quote.status === "draft" && (
              <Button onClick={() => updateStatus("sent")} data-testid="mark-sent-btn">
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button
                  onClick={() => updateStatus("approved")}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="mark-approved-btn"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Approved
                </Button>
                <Button
                  onClick={() => updateStatus("rejected")}
                  variant="outline"
                  className="text-red-600"
                  data-testid="mark-rejected-btn"
                >
                  <X className="w-4 h-4 mr-2" />
                  Mark as Rejected
                </Button>
              </>
            )}
            {quote.status === "approved" && (
              <Button
                onClick={convertToOrder}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="convert-order-btn"
              >
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
