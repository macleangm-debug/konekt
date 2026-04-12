import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Truck, Download, ArrowLeft, Check, PenLine } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";

const statusColors = {
  issued: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

/* ─── Inline Signature Pad ─── */
function MiniSignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#20364D";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; };

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div data-testid="signature-pad-container">
      <canvas
        ref={canvasRef}
        width={360}
        height={120}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        data-testid="signature-canvas"
      />
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} data-testid="clear-signature-btn">
          Clear
        </Button>
        <Button type="button" size="sm" onClick={save} className="bg-[#20364D]" data-testid="save-signature-btn">
          <PenLine className="w-3 h-3 mr-1" /> Accept Signature
        </Button>
      </div>
    </div>
  );
}

export default function DeliveryNotePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureForm, setClosureForm] = useState({
    receiver_name: "",
    receiver_designation: "",
    receiver_signature: "",
  });
  const [submittingClosure, setSubmittingClosure] = useState(false);
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

  const handleClosureSubmit = async (e) => {
    e.preventDefault();
    if (!closureForm.receiver_name.trim()) {
      toast.error("Receiver name is required");
      return;
    }
    try {
      setSubmittingClosure(true);
      await api.patch(`/api/admin/delivery-notes/${id}/status`, {
        status: "delivered",
        receiver_name: closureForm.receiver_name,
        receiver_designation: closureForm.receiver_designation,
        receiver_signature: closureForm.receiver_signature,
      });
      toast.success("Delivery confirmed with sign-off");
      setShowClosureModal(false);
      loadNote();
    } catch (error) {
      console.error("Failed to close delivery:", error);
      toast.error("Failed to confirm delivery");
    } finally {
      setSubmittingClosure(false);
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

  const lineItems = (note.line_items || []).map((item) => ({
    description: item.description || item.name || item.sku || "Item",
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    total: item.total || (item.quantity || 1) * (item.unit_price || 0),
  }));

  const isClosable = note.status === "issued" || note.status === "in_transit";

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
            <Button variant="outline" onClick={downloadPDF} disabled={downloading} data-testid="download-pdf-btn">
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            {isClosable && (
              <Button
                onClick={() => setShowClosureModal(true)}
                className="bg-green-600 hover:bg-green-700"
                data-testid="confirm-delivery-btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm Delivery
              </Button>
            )}
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

        {/* ═══ RECEIVER CONFIRMATION CARD (shown after delivery) ═══ */}
        {note.status === "delivered" && note.receiver_name && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-5 mb-6" data-testid="receiver-confirmation-card">
            <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Delivery Confirmed
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-green-600 mb-1">Receiver Name</div>
                <div className="font-semibold text-green-900">{note.receiver_name}</div>
              </div>
              {note.receiver_designation && (
                <div>
                  <div className="text-xs text-green-600 mb-1">Designation</div>
                  <div className="font-semibold text-green-900">{note.receiver_designation}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-green-600 mb-1">Confirmed At</div>
                <div className="font-semibold text-green-900">{note.received_at?.split("T")[0] || "—"}</div>
              </div>
            </div>
            {note.receiver_signature && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-green-600 mb-2">Digital Signature</div>
                <img src={note.receiver_signature} alt="Receiver signature" className="h-16 object-contain" />
              </div>
            )}
          </div>
        )}

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
            {/* Receiver confirmation block inside the document */}
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
                {note.receiver_signature && (
                  <img
                    src={note.receiver_signature}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ height: 48, objectFit: "contain", marginTop: 8, opacity: 0.8 }}
                  />
                )}
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
            {isClosable && (
              <Button
                onClick={() => setShowClosureModal(true)}
                className="bg-green-600 hover:bg-green-700"
                data-testid="mark-delivered-btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm Delivery with Sign-Off
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

      {/* ═══ DELIVERY CLOSURE MODAL ═══ */}
      <Dialog open={showClosureModal} onOpenChange={setShowClosureModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Delivery — Sign-Off</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClosureSubmit} className="space-y-4 pt-2" data-testid="closure-form">
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-200">
              Capture the receiver's details to officially close this delivery.
            </div>
            <div className="space-y-2">
              <Label>Receiver Name *</Label>
              <Input
                value={closureForm.receiver_name}
                onChange={(e) => setClosureForm((p) => ({ ...p, receiver_name: e.target.value }))}
                placeholder="Full name of person receiving goods"
                required
                data-testid="input-receiver-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation / Title</Label>
              <Input
                value={closureForm.receiver_designation}
                onChange={(e) => setClosureForm((p) => ({ ...p, receiver_designation: e.target.value }))}
                placeholder="e.g., Warehouse Manager, Procurement Officer"
                data-testid="input-receiver-designation"
              />
            </div>
            <div className="space-y-2">
              <Label>Digital Signature</Label>
              <MiniSignaturePad
                onSave={(dataUrl) => setClosureForm((p) => ({ ...p, receiver_signature: dataUrl }))}
              />
              {closureForm.receiver_signature && (
                <div className="mt-2 p-2 border rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-400 mb-1">Captured Signature:</div>
                  <img src={closureForm.receiver_signature} alt="Signature" className="h-12 object-contain" />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowClosureModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingClosure}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="submit-closure-btn"
              >
                {submittingClosure ? "Confirming..." : "Confirm Delivery"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
