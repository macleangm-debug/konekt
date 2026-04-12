import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Truck, Download, ArrowLeft, Check, PenLine, ShieldCheck, Lock, Clock } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";

const statusConfig = {
  issued: { color: "bg-blue-100 text-blue-700", label: "Issued" },
  in_transit: { color: "bg-amber-100 text-amber-700", label: "In Transit" },
  pending_confirmation: { color: "bg-purple-100 text-purple-700", label: "Pending Confirmation" },
  completed_signed: { color: "bg-green-100 text-green-700", label: "Completed (Signed)" },
  completed_confirmed: { color: "bg-emerald-100 text-emerald-700", label: "Completed (Confirmed)" },
  delivered: { color: "bg-green-100 text-green-700", label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-700", label: "Cancelled" },
};

const AUTHORIZATION_SOURCES = [
  { value: "in_person", label: "In Person" },
  { value: "phone", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

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
  const startDraw = (e) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e); };
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
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, 360, 120); };
  const save = () => { onSave(canvasRef.current.toDataURL("image/png")); };

  return (
    <div data-testid="signature-pad-container">
      <canvas
        ref={canvasRef} width={360} height={120}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair touch-none"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        data-testid="signature-canvas"
      />
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} data-testid="clear-signature-btn">Clear</Button>
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
  const [closureMode, setClosureMode] = useState("signed"); // "signed" | "confirmed_without_signature"
  const [closureForm, setClosureForm] = useState({
    receiver_name: "",
    receiver_designation: "",
    receiver_signature: "",
    completion_note: "",
    authorization_source: "in_person",
  });
  const [submittingClosure, setSubmittingClosure] = useState(false);
  const rendererRef = useRef(null);

  useEffect(() => { loadNote(); }, [id]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/delivery-notes/${id}`);
      setNote(res.data);
    } catch (error) {
      toast.error("Failed to load delivery note");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!rendererRef.current) return;
    try {
      setDownloading(true);
      await rendererRef.current.exportAsPDF(`${note?.note_number || "delivery-note"}.pdf`);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to download PDF"); }
    finally { setDownloading(false); }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.patch(`/api/admin/delivery-notes/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      loadNote();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
  };

  const handleClosureSubmit = async (e) => {
    e.preventDefault();
    if (!closureForm.receiver_name.trim()) { toast.error("Receiver name is required"); return; }
    if (closureMode === "signed" && !closureForm.receiver_signature) { toast.error("Signature is required for signed closure"); return; }
    if (closureMode === "confirmed_without_signature" && !closureForm.completion_note.trim()) { toast.error("Completion note is required"); return; }

    try {
      setSubmittingClosure(true);
      await api.post(`/api/admin/delivery-notes/${id}/close`, {
        closure_method: closureMode,
        receiver_name: closureForm.receiver_name,
        receiver_designation: closureForm.receiver_designation,
        receiver_signature: closureMode === "signed" ? closureForm.receiver_signature : undefined,
        completion_note: closureMode === "confirmed_without_signature" ? closureForm.completion_note : undefined,
        authorization_source: closureMode === "confirmed_without_signature" ? closureForm.authorization_source : undefined,
      });
      toast.success(closureMode === "signed" ? "Delivery confirmed with signature" : "Delivery confirmed by staff");
      setShowClosureModal(false);
      loadNote();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to close delivery");
    } finally {
      setSubmittingClosure(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="text-slate-500">Loading delivery note...</div></div>;
  if (!note) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-screen">
      <div className="text-slate-500">Delivery note not found</div>
      <Button onClick={() => navigate("/admin/delivery-notes")} className="mt-4">Back to Delivery Notes</Button>
    </div>
  );

  const lineItems = (note.line_items || []).map((item) => ({
    description: item.description || item.name || item.sku || "Item",
    quantity: item.quantity || 1, unit_price: item.unit_price || 0,
    total: item.total || (item.quantity || 1) * (item.unit_price || 0),
  }));

  const isClosable = ["issued", "in_transit", "pending_confirmation"].includes(note.status);
  const isCompleted = note.status?.startsWith("completed_") || note.status === "delivered";
  const isLocked = note.closure_locked || isCompleted;
  const sc = statusConfig[note.status] || statusConfig.issued;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="delivery-note-preview-page">
      <div className="max-w-5xl mx-auto">
        {/* ═══ ACTION BAR ═══ */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/admin/delivery-notes")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900" data-testid="back-to-delivery-notes">
            <ArrowLeft className="w-4 h-4" /> Back to Delivery Notes
          </button>
          <div className="flex items-center gap-3">
            <Badge className={`${sc.color} text-sm px-3 py-1`} data-testid="dn-status-badge">{sc.label}</Badge>
            {isLocked && <Badge className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5" data-testid="locked-badge"><Lock className="w-3 h-3 mr-1 inline" />Locked</Badge>}
            <Button variant="outline" onClick={downloadPDF} disabled={downloading} data-testid="download-pdf-btn">
              <Download className="w-4 h-4 mr-2" /> {downloading ? "Generating..." : "Download PDF"}
            </Button>
            {isClosable && (
              <Button onClick={() => setShowClosureModal(true)} className="bg-green-600 hover:bg-green-700" data-testid="confirm-delivery-btn">
                <Check className="w-4 h-4 mr-2" /> Complete & Close
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
          {note.vehicle_info && <div><div className="text-xs text-slate-500 mb-1">Vehicle / Driver</div><div className="font-semibold text-[#20364D]">{note.vehicle_info}</div></div>}
          {note.source_type && note.source_type !== "direct" && <div><div className="text-xs text-slate-500 mb-1">Source</div><div className="font-semibold text-[#20364D] capitalize">{note.source_type}: {note.source_id || "—"}</div></div>}
        </div>

        {/* ═══ COMPLETION SUMMARY CARD ═══ */}
        {isCompleted && (
          <div className={`rounded-2xl border p-5 mb-6 ${note.closure_method === "signed" ? "bg-green-50 border-green-200" : "bg-emerald-50 border-emerald-200"}`} data-testid="completion-summary-card">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: note.closure_method === "signed" ? "#15803d" : "#047857" }}>
              {note.closure_method === "signed" ? <PenLine className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {note.closure_method === "signed" ? "Completed — Signed by Receiver" : "Completed — Confirmed by Staff"}
              <Lock className="w-3.5 h-3.5 ml-1 opacity-50" />
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs opacity-70 mb-1">Receiver / Approver</div>
                <div className="font-semibold">{note.receiver_name || "—"}</div>
              </div>
              {note.receiver_designation && <div><div className="text-xs opacity-70 mb-1">Designation</div><div className="font-semibold">{note.receiver_designation}</div></div>}
              <div>
                <div className="text-xs opacity-70 mb-1">Completed At</div>
                <div className="font-semibold">{note.completed_at ? new Date(note.completed_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : note.received_at?.split("T")[0] || "—"}</div>
              </div>
              <div>
                <div className="text-xs opacity-70 mb-1">Closure Method</div>
                <div className="font-semibold capitalize">{(note.closure_method || "signed").replace(/_/g, " ")}</div>
              </div>
              {note.confirmed_by_user_name && <div><div className="text-xs opacity-70 mb-1">Recorded By</div><div className="font-semibold">{note.confirmed_by_user_name}</div></div>}
              {note.authorization_source && note.closure_method === "confirmed_without_signature" && <div><div className="text-xs opacity-70 mb-1">Authorization Via</div><div className="font-semibold capitalize">{note.authorization_source.replace(/_/g, " ")}</div></div>}
            </div>
            {note.closure_method === "signed" && note.receiver_signature && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                <div className="text-xs opacity-70 mb-2">Digital Signature</div>
                <img src={note.receiver_signature} alt="Receiver signature" className="h-16 object-contain" />
              </div>
            )}
            {note.closure_method === "confirmed_without_signature" && note.completion_note && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                <div className="text-xs opacity-70 mb-2">Confirmation Note</div>
                <div className="text-sm font-medium">{note.completion_note}</div>
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
            subtotal={0} tax={0} total={0} currency="TZS"
            notes={note.remarks || ""}
          >
            {/* Closure proof inside document for PDF */}
            {isCompleted && note.receiver_name && (
              <div style={{ border: note.closure_method === "signed" ? "1px solid #dcfce7" : "1px solid #d1fae5", borderRadius: 12, padding: 16, backgroundColor: note.closure_method === "signed" ? "#f0fdf4" : "#ecfdf5" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: note.closure_method === "signed" ? "#15803d" : "#047857", marginBottom: 8 }}>
                  {note.closure_method === "signed" ? "Received & Signed" : "Confirmed by Authorized Staff"}
                </div>
                <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                  <div>Receiver: {note.receiver_name}</div>
                  {note.receiver_designation && <div>Designation: {note.receiver_designation}</div>}
                  <div>Date: {note.completed_at ? new Date(note.completed_at).toLocaleDateString("en-GB") : note.received_at?.split("T")[0] || "—"}</div>
                  {note.closure_method === "confirmed_without_signature" && note.completion_note && <div>Note: {note.completion_note}</div>}
                </div>
                {note.closure_method === "signed" && note.receiver_signature && (
                  <img src={note.receiver_signature} alt="" crossOrigin="anonymous" style={{ height: 48, objectFit: "contain", marginTop: 8, opacity: 0.8 }} />
                )}
              </div>
            )}
          </CanonicalDocumentRenderer>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        {!isLocked && (
          <div className="mt-6 bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {note.status === "issued" && (
                <>
                  <Button onClick={() => updateStatus("in_transit")} className="bg-amber-500 hover:bg-amber-600" data-testid="mark-in-transit-btn">
                    <Truck className="w-4 h-4 mr-2" /> Mark In Transit
                  </Button>
                  <Button onClick={() => updateStatus("pending_confirmation")} variant="outline" data-testid="mark-pending-btn">
                    <Clock className="w-4 h-4 mr-2" /> Mark Pending Confirmation
                  </Button>
                </>
              )}
              {note.status === "in_transit" && (
                <Button onClick={() => updateStatus("pending_confirmation")} variant="outline" data-testid="mark-pending-btn">
                  <Clock className="w-4 h-4 mr-2" /> Mark Pending Confirmation
                </Button>
              )}
              {isClosable && (
                <Button onClick={() => setShowClosureModal(true)} className="bg-green-600 hover:bg-green-700" data-testid="mark-delivered-btn">
                  <Check className="w-4 h-4 mr-2" /> Complete & Close Job
                </Button>
              )}
              {!isCompleted && note.status !== "cancelled" && (
                <Button onClick={() => updateStatus("cancelled")} variant="outline" className="text-red-600" data-testid="cancel-dn-btn">Cancel</Button>
              )}
            </div>
          </div>
        )}
        {isLocked && (
          <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center text-sm text-slate-500" data-testid="locked-notice">
            <Lock className="w-5 h-5 mx-auto mb-2 text-slate-400" />
            This delivery note is locked. Completion records are protected business evidence.
          </div>
        )}
      </div>

      {/* ═══ CLOSURE MODAL — Dual Mode ═══ */}
      <Dialog open={showClosureModal} onOpenChange={setShowClosureModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete & Close Delivery</DialogTitle>
            <DialogDescription>Choose how to confirm this delivery. This action is permanent and locks the record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClosureSubmit} className="space-y-4 pt-1" data-testid="closure-form">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-2" data-testid="closure-mode-select">
              <button
                type="button"
                onClick={() => setClosureMode("signed")}
                className={`rounded-xl border-2 p-3 text-left transition-all ${closureMode === "signed" ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}
                data-testid="mode-signed"
              >
                <PenLine className={`w-5 h-5 mb-1 ${closureMode === "signed" ? "text-green-600" : "text-slate-400"}`} />
                <div className="text-sm font-semibold">Sign with Receiver</div>
                <div className="text-[11px] text-slate-500">Client signs directly</div>
              </button>
              <button
                type="button"
                onClick={() => setClosureMode("confirmed_without_signature")}
                className={`rounded-xl border-2 p-3 text-left transition-all ${closureMode === "confirmed_without_signature" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                data-testid="mode-confirmed"
              >
                <ShieldCheck className={`w-5 h-5 mb-1 ${closureMode === "confirmed_without_signature" ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="text-sm font-semibold">Confirm by Staff</div>
                <div className="text-[11px] text-slate-500">Staff confirms on behalf</div>
              </button>
            </div>

            {/* Common Fields */}
            <div className="space-y-2">
              <Label>Receiver / Approver Name *</Label>
              <Input value={closureForm.receiver_name} onChange={(e) => setClosureForm((p) => ({ ...p, receiver_name: e.target.value }))} placeholder="Full name" required data-testid="input-receiver-name" />
            </div>
            <div className="space-y-2">
              <Label>Designation / Title</Label>
              <Input value={closureForm.receiver_designation} onChange={(e) => setClosureForm((p) => ({ ...p, receiver_designation: e.target.value }))} placeholder="e.g., Warehouse Manager" data-testid="input-receiver-designation" />
            </div>

            {/* Signed Mode — Signature Pad */}
            {closureMode === "signed" && (
              <div className="space-y-2">
                <Label>Digital Signature *</Label>
                <MiniSignaturePad onSave={(dataUrl) => setClosureForm((p) => ({ ...p, receiver_signature: dataUrl }))} />
                {closureForm.receiver_signature && (
                  <div className="mt-2 p-2 border rounded-lg bg-slate-50">
                    <div className="text-[10px] text-slate-400 mb-1">Captured:</div>
                    <img src={closureForm.receiver_signature} alt="Sig" className="h-12 object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Confirmed Mode — Note + Source */}
            {closureMode === "confirmed_without_signature" && (
              <>
                <div className="space-y-2">
                  <Label>Authorization Source</Label>
                  <select className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white text-sm" value={closureForm.authorization_source} onChange={(e) => setClosureForm((p) => ({ ...p, authorization_source: e.target.value }))} data-testid="select-auth-source">
                    {AUTHORIZATION_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Confirmation Note *</Label>
                  <textarea className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px] text-sm" placeholder="e.g., Client verbally confirmed receipt via phone call" value={closureForm.completion_note} onChange={(e) => setClosureForm((p) => ({ ...p, completion_note: e.target.value }))} data-testid="input-completion-note" />
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <input type="checkbox" required className="mt-0.5" data-testid="confirm-checkbox" />
                  <label className="text-xs text-amber-800">I confirm the client has approved receipt/completion of this delivery.</label>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setShowClosureModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={submittingClosure} className="flex-1 bg-green-600 hover:bg-green-700" data-testid="submit-closure-btn">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                {submittingClosure ? "Closing..." : "Complete & Lock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
