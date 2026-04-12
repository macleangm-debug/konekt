import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Package, Check, PenLine, ShieldCheck, Lock, ArrowLeft, ArrowRight, Phone, Hash, CheckCircle, AlertCircle, Truck } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import { combinePhone } from "@/utils/phoneUtils";

const AUTHORIZATION_SOURCES = [
  { value: "in_person", label: "In Person" },
  { value: "phone", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

/* ─── Signature Pad ─── */
function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e); };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#20364D"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos;
  };
  const end = () => { drawing.current = false; };
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, 400, 140); };
  return (
    <div>
      <canvas ref={canvasRef} width={400} height={140}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-crosshair touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        data-testid="public-signature-canvas" />
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>Clear</Button>
        <Button type="button" size="sm" onClick={() => onSave(canvasRef.current.toDataURL("image/png"))} className="bg-[#20364D]">
          <PenLine className="w-3 h-3 mr-1" /> Accept
        </Button>
      </div>
    </div>
  );
}

/* ─── Step Indicator ─── */
function StepIndicator({ current }) {
  const steps = ["Find Order", "Review", "Confirm"];
  return (
    <div className="flex items-center justify-center gap-1 mb-6" data-testid="step-indicator">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 ${i <= current ? "text-[#20364D]" : "text-slate-300"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < current ? "bg-[#20364D] text-white" : i === current ? "bg-[#20364D] text-white" : "bg-slate-200 text-slate-400"}`}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < current ? "bg-[#20364D]" : "bg-slate-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ConfirmCompletionPage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [step, setStep] = useState(0); // 0=find, 1=review, 2=confirm
  const [lookupMode, setLookupMode] = useState("phone"); // phone | order
  const [phonePrefix, setPhonePrefix] = useState("+255");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderInput, setOrderInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [selectedDN, setSelectedDN] = useState(null);

  const [closureMode, setClosureMode] = useState("signed");
  const [form, setForm] = useState({ receiver_name: "", receiver_designation: "", receiver_signature: "", completion_note: "", authorization_source: "in_person" });
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  // Auto-resolve token
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get(`/api/public/completion/token/${token}`)
      .then((r) => {
        setSelectedDN(r.data);
        if (r.data.closure_locked) {
          setCompleted(true);
          setCompletionResult(r.data);
          setStep(2);
        } else {
          setStep(1);
        }
      })
      .catch(() => setError("This confirmation link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLookup = async () => {
    setLoading(true); setError(""); setDeliveryNotes([]);
    try {
      if (lookupMode === "phone") {
        const phone = combinePhone(phonePrefix, phoneNumber);
        const r = await api.get(`/api/public/completion/phone/${encodeURIComponent(phone)}`);
        const dns = r.data.delivery_notes || [];
        if (dns.length === 0) { setError("No pending deliveries found for this phone number."); return; }
        setDeliveryNotes(dns);
        if (dns.length === 1) { setSelectedDN(dns[0]); setStep(1); }
        else { setStep(1); }
      } else {
        const r = await api.get(`/api/public/completion/order/${encodeURIComponent(orderInput.trim())}`);
        const dns = r.data.delivery_notes || [];
        if (dns.length === 0) { setError("No delivery notes found for this order."); return; }
        setDeliveryNotes(dns);
        if (dns.length === 1) { setSelectedDN(dns[0]); }
        setStep(1);
      }
    } catch { setError("No results found. Please check and try again."); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.receiver_name.trim()) { setError("Receiver name is required"); return; }
    if (closureMode === "signed" && !form.receiver_signature) { setError("Please draw your signature"); return; }
    if (closureMode === "confirmed_without_signature" && !form.completion_note.trim()) { setError("Completion note is required"); return; }

    setSubmitting(true); setError("");
    try {
      const r = await api.post(`/api/public/completion/close/${selectedDN.id}`, {
        closure_method: closureMode,
        receiver_name: form.receiver_name,
        receiver_designation: form.receiver_designation,
        receiver_signature: closureMode === "signed" ? form.receiver_signature : undefined,
        completion_note: closureMode === "confirmed_without_signature" ? form.completion_note : undefined,
        authorization_source: closureMode === "confirmed_without_signature" ? form.authorization_source : undefined,
      });
      setCompleted(true);
      setCompletionResult(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to confirm completion");
    } finally { setSubmitting(false); }
  };

  // ═══ LOADING STATE ═══
  if (loading && step === 0 && token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-500">Loading confirmation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="confirm-completion-page">
      {/* Header */}
      <div className="bg-[#20364D] text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/track-order" className="text-white/60 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold">Confirm Completion</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <StepIndicator current={step} />

        {/* ERROR */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4 flex items-start gap-2" data-testid="completion-error">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 text-xs">Dismiss</button>
          </div>
        )}

        {/* ═══ STEP 0 — FIND ORDER ═══ */}
        {step === 0 && !completed && (
          <div className="space-y-4" data-testid="step-find">
            <div className="text-center mb-6">
              <Truck className="w-10 h-10 text-[#20364D] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-[#20364D]">Find Your Delivery</h2>
              <p className="text-sm text-slate-500 mt-1">Look up your order to confirm completion</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1" data-testid="lookup-mode-toggle">
              <button onClick={() => setLookupMode("phone")} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${lookupMode === "phone" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`} data-testid="mode-phone">
                <Phone className="w-4 h-4 inline mr-1.5" />Phone
              </button>
              <button onClick={() => setLookupMode("order")} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${lookupMode === "order" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`} data-testid="mode-order">
                <Hash className="w-4 h-4 inline mr-1.5" />Order #
              </button>
            </div>

            <div className="bg-white rounded-2xl border p-5 space-y-4">
              {lookupMode === "phone" ? (
                <PhoneNumberField label="Phone Number" prefix={phonePrefix} number={phoneNumber} onPrefixChange={setPhonePrefix} onNumberChange={setPhoneNumber} testIdPrefix="completion-phone" />
              ) : (
                <div>
                  <Label>Order Number</Label>
                  <Input value={orderInput} onChange={(e) => setOrderInput(e.target.value)} placeholder="e.g. ORD-20260406-XXXXX" data-testid="order-number-input" />
                </div>
              )}
              <Button onClick={handleLookup} disabled={loading} className="w-full bg-[#20364D] hover:bg-[#2a4a66] py-3 text-base" data-testid="lookup-btn">
                <Search className="w-4 h-4 mr-2" /> {loading ? "Searching..." : "Find Orders"}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 1 — REVIEW ═══ */}
        {step === 1 && !completed && (
          <div className="space-y-4" data-testid="step-review">
            {/* If multiple, show list */}
            {deliveryNotes.length > 1 && !selectedDN && (
              <>
                <h2 className="text-lg font-bold text-[#20364D]">Select Delivery</h2>
                <p className="text-sm text-slate-500">Multiple pending deliveries found. Tap to select.</p>
                <div className="space-y-3">
                  {deliveryNotes.filter(d => !d.closure_locked).map((dn) => (
                    <button key={dn.id} onClick={() => setSelectedDN(dn)} className="w-full text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-[#20364D] p-4 transition" data-testid={`select-dn-${dn.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#20364D]">{dn.note_number}</div>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 capitalize">{(dn.status || "").replace(/_/g, " ")}</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">{dn.customer_name || dn.delivered_to}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{dn.items_summary}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Selected DN review */}
            {selectedDN && (
              <>
                <h2 className="text-lg font-bold text-[#20364D]">Review Delivery</h2>
                <div className="bg-white rounded-2xl border p-5 space-y-3" data-testid="review-card">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-lg text-[#20364D]">{selectedDN.note_number}</div>
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 capitalize">{(selectedDN.status || "").replace(/_/g, " ")}</span>
                  </div>
                  {selectedDN.customer_name && <div className="text-sm text-slate-600"><span className="text-slate-400">Client:</span> {selectedDN.customer_name}</div>}
                  {selectedDN.delivery_address && <div className="text-sm text-slate-600"><span className="text-slate-400">Address:</span> {selectedDN.delivery_address}</div>}
                  <div className="text-sm text-slate-600"><span className="text-slate-400">Items:</span> {selectedDN.items_summary}</div>
                  {selectedDN.created_at && <div className="text-xs text-slate-400">Created: {selectedDN.created_at.split("T")[0]}</div>}
                </div>

                <Button onClick={() => setStep(2)} className="w-full bg-green-600 hover:bg-green-700 py-3 text-base" data-testid="continue-to-confirm-btn">
                  Continue to Confirm <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <button onClick={() => { setSelectedDN(null); if (!token) setStep(0); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2" data-testid="back-btn">
                  {token ? "" : "Back to search"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 2 — CONFIRM ═══ */}
        {step === 2 && !completed && selectedDN && (
          <div className="space-y-4" data-testid="step-confirm">
            <h2 className="text-lg font-bold text-[#20364D]">
              {selectedDN.source_type === "service" ? "Confirm Service Handover" : "Confirm Delivery"}
            </h2>
            <p className="text-sm text-slate-500">This will complete and close this delivery permanently.</p>

            {/* Order reference */}
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#20364D]">{selectedDN.note_number}</div>
              <div className="text-xs text-slate-500">{selectedDN.customer_name}</div>
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-3" data-testid="confirm-mode-select">
              <button type="button" onClick={() => setClosureMode("signed")}
                className={`rounded-xl border-2 p-4 text-center transition ${closureMode === "signed" ? "border-green-500 bg-green-50" : "border-slate-200"}`}
                data-testid="public-mode-signed">
                <PenLine className={`w-6 h-6 mx-auto mb-1 ${closureMode === "signed" ? "text-green-600" : "text-slate-400"}`} />
                <div className="text-sm font-bold">Sign</div>
                <div className="text-[11px] text-slate-500">Sign directly</div>
              </button>
              <button type="button" onClick={() => setClosureMode("confirmed_without_signature")}
                className={`rounded-xl border-2 p-4 text-center transition ${closureMode === "confirmed_without_signature" ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                data-testid="public-mode-confirmed">
                <ShieldCheck className={`w-6 h-6 mx-auto mb-1 ${closureMode === "confirmed_without_signature" ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="text-sm font-bold">Confirm</div>
                <div className="text-[11px] text-slate-500">Without signature</div>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-5 space-y-4" data-testid="confirm-form">
              <div>
                <Label>Receiver Name *</Label>
                <Input value={form.receiver_name} onChange={(e) => setForm(p => ({ ...p, receiver_name: e.target.value }))} placeholder="Full name" required data-testid="public-receiver-name" />
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={form.receiver_designation} onChange={(e) => setForm(p => ({ ...p, receiver_designation: e.target.value }))} placeholder="e.g. Warehouse Manager" data-testid="public-receiver-designation" />
              </div>

              {closureMode === "signed" && (
                <div>
                  <Label>Signature *</Label>
                  <SignaturePad onSave={(d) => setForm(p => ({ ...p, receiver_signature: d }))} />
                  {form.receiver_signature && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border">
                      <img src={form.receiver_signature} alt="Signature" className="h-10 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {closureMode === "confirmed_without_signature" && (
                <>
                  <div>
                    <Label>Authorization Source</Label>
                    <select className="w-full border rounded-xl px-4 py-3 bg-white text-sm" value={form.authorization_source}
                      onChange={(e) => setForm(p => ({ ...p, authorization_source: e.target.value }))} data-testid="public-auth-source">
                      {AUTHORIZATION_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Confirmation Note *</Label>
                    <textarea className="w-full border rounded-xl px-4 py-3 min-h-[80px] text-sm" placeholder="e.g. Client confirmed receipt via phone"
                      value={form.completion_note} onChange={(e) => setForm(p => ({ ...p, completion_note: e.target.value }))} data-testid="public-completion-note" />
                  </div>
                  <label className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" required className="mt-0.5" data-testid="public-confirm-checkbox" />
                    <span className="text-xs text-amber-800">I confirm the client has approved receipt/completion of this delivery.</span>
                  </label>
                </>
              )}

              <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 py-3 text-base" data-testid="public-submit-btn">
                <Lock className="w-4 h-4 mr-2" /> {submitting ? "Completing..." : "Complete & Confirm"}
              </Button>

              <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-1">Back</button>
            </form>
          </div>
        )}

        {/* ═══ SUCCESS STATE ═══ */}
        {completed && (
          <div className="text-center space-y-4 py-8" data-testid="completion-success">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-700">Completion Recorded</h2>
            <p className="text-sm text-slate-500">
              {completionResult?.note_number || selectedDN?.note_number || "Delivery"} is now closed.
            </p>
            <div className="bg-white rounded-2xl border p-5 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Method</span><span className="font-semibold capitalize">{(completionResult?.closure_method || closureMode).replace(/_/g, " ")}</span></div>
              {completionResult?.receiver_name && <div className="flex justify-between text-sm"><span className="text-slate-500">Receiver</span><span className="font-semibold">{completionResult.receiver_name}</span></div>}
              {completionResult?.completed_at && <div className="flex justify-between text-sm"><span className="text-slate-500">Completed</span><span className="font-semibold">{new Date(completionResult.completed_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>}
            </div>
            <Link to="/track-order" className="inline-flex items-center gap-2 text-sm text-[#20364D] font-semibold hover:underline" data-testid="done-link">
              Done <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
