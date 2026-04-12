import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Truck, Download, ArrowLeft, Check, Package, Clock } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";

const statusColors = {
  issued: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function DeliveryNotePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const rendererRef = useRef(null);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/delivery-notes/${id}`);
      setNote(res.data);
    } catch (error) {
      console.error("Failed to load delivery note:", error);
      toast.error("Failed to load delivery note");
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
      await rendererRef.current.exportAsPDF(`${note?.note_number || "delivery-note"}.pdf`);
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
      await api.patch(`/api/admin/delivery-notes/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      loadNote();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading delivery note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen">
        <div className="text-slate-500">Delivery note not found</div>
        <Button onClick={() => navigate("/admin/delivery-notes")} className="mt-4">
          Back to Delivery Notes
        </Button>
      </div>
    );
  }

  // Build line items for the renderer — DN line items may have different structure
  const lineItems = (note.line_items || []).map((item) => ({
    description: item.description || item.name || item.sku || "Item",
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    total: item.total || (item.quantity || 1) * (item.unit_price || 0),
  }));

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="delivery-note-preview-page">
      <div className="max-w-5xl mx-auto">
        {/* ═══ ACTION BAR ═══ */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/admin/delivery-notes")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            data-testid="back-to-delivery-notes"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Delivery Notes
          </button>

          <div className="flex items-center gap-3">
            <Badge
              className={`${statusColors[note.status] || "bg-slate-100 text-slate-700"} text-sm px-3 py-1`}
              data-testid="dn-status-badge"
            >
              {(note.status || "issued").replace("_", " ").toUpperCase()}
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
          </div>
        </div>

        {/* ═══ DELIVERY INFO CARD ═══ */}
        <div className="bg-white rounded-2xl border p-5 mb-6 grid md:grid-cols-3 gap-4" data-testid="delivery-info-card">
          <div>
            <div className="text-xs text-slate-500 mb-1">Delivered By</div>
            <div className="font-semibold text-[#20364D]">{note.delivered_by || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Delivered To</div>
            <div className="font-semibold text-[#20364D]">{note.delivered_to || note.customer_name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Delivery Address</div>
            <div className="font-semibold text-[#20364D]">{note.delivery_address || "—"}</div>
          </div>
          {note.vehicle_info && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Vehicle / Driver</div>
              <div className="font-semibold text-[#20364D]">{note.vehicle_info}</div>
            </div>
          )}
          {note.source_type && note.source_type !== "direct" && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Source</div>
              <div className="font-semibold text-[#20364D] capitalize">{note.source_type}: {note.source_id || "—"}</div>
            </div>
          )}
        </div>

        {/* ═══ CANONICAL DOCUMENT RENDERER ═══ */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" data-testid="dn-document-preview">
          <CanonicalDocumentRenderer
            ref={rendererRef}
            docType="delivery_note"
            docNumber={note.note_number || ""}
            docDate={note.created_at?.split("T")[0] || ""}
            status={note.status || "issued"}
            toBlock={{
              name: note.customer_name || note.delivered_to || "",
              company: note.customer_company || "",
              address: note.delivery_address || "",
              email: note.customer_email || "",
              phone: note.customer_phone || "",
              client_type: note.customer_type || "individual",
            }}
            lineItems={lineItems}
            subtotal={0}
            tax={0}
            total={0}
            currency="TZS"
            notes={note.remarks || ""}
          >
            {/* Delivery-specific: Receiver confirmation section */}
            {note.status === "delivered" && note.receiver_name && (
              <div
                style={{
                  border: "1px solid #dcfce7",
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: "#f0fdf4",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#15803d", marginBottom: 8 }}>
                  Received & Confirmed
                </div>
                <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                  <div>Receiver: {note.receiver_name}</div>
                  {note.receiver_designation && <div>Designation: {note.receiver_designation}</div>}
                  {note.received_at && <div>Date: {note.received_at?.split("T")[0]}</div>}
                </div>
              </div>
            )}
          </CanonicalDocumentRenderer>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mt-6 bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {note.status === "issued" && (
              <Button
                onClick={() => updateStatus("in_transit")}
                className="bg-amber-500 hover:bg-amber-600"
                data-testid="mark-in-transit-btn"
              >
                <Truck className="w-4 h-4 mr-2" />
                Mark In Transit
              </Button>
            )}
            {(note.status === "issued" || note.status === "in_transit") && (
              <Button
                onClick={() => updateStatus("delivered")}
                className="bg-green-600 hover:bg-green-700"
                data-testid="mark-delivered-btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as Delivered
              </Button>
            )}
            {note.status !== "cancelled" && note.status !== "delivered" && (
              <Button
                onClick={() => updateStatus("cancelled")}
                variant="outline"
                className="text-red-600"
                data-testid="cancel-dn-btn"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
