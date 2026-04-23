import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck, CheckCircle2, Download, AlertCircle, Loader2 } from "lucide-react";
import partnerApi from "../../lib/partnerApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "";

function Clause({ heading, body }) {
  return (
    <div className="space-y-1" data-testid={`clause-${heading.split(".")[0]}`}>
      <h3 className="text-sm font-bold text-[#20364D]">{heading}</h3>
      <p className="text-xs leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}

export default function VendorAgreementPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tpl, setTpl] = useState(null);
  const [signed, setSigned] = useState(false);
  const [signedRecord, setSignedRecord] = useState(null);
  const [form, setForm] = useState({
    vendor_legal_name: "",
    vendor_address: "",
    vendor_phone: "",
    signatory_name: "",
    signatory_title: "",
    signatory_email: "",
    signature_text: "",
    agreed: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await partnerApi.get("/api/vendor/agreement/template");
        setTpl(r.data.template);
        setSigned(Boolean(r.data.signed));
        setSignedRecord(r.data.signed_record);
        setForm((f) => ({ ...f, ...(r.data.prefill || {}) }));
      } catch (e) {
        toast.error("Failed to load agreement");
      }
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (!form.agreed) { toast.error("Please tick 'I agree' to sign"); return; }
    if (form.signature_text.trim().toLowerCase() !== form.signatory_name.trim().toLowerCase()) {
      toast.error("Typed signature must match the signatory's full name exactly");
      return;
    }
    setSubmitting(true);
    try {
      const r = await partnerApi.post("/api/vendor/agreement/sign", form);
      toast.success("Agreement signed. Welcome aboard!");
      setSigned(true);
      setSignedRecord({ id: r.data.id, pdf_url: r.data.pdf_url, signed_at: new Date().toISOString() });
      setTimeout(() => nav("/partner/vendor-dashboard"), 800);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Signing failed");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="vendor-agreement-signed">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Agreement signed</h1>
          <p className="text-sm text-slate-500">
            Thanks — your Konekt Supply Agreement is on file. A signed copy has been added to your Documents tab.
          </p>
          {signedRecord?.pdf_url && (
            <a href={`${API}${signedRecord.pdf_url}`} target="_blank" rel="noreferrer" data-testid="download-signed-pdf">
              <Button variant="outline" className="w-full"><Download className="w-4 h-4 mr-2" /> Download signed PDF</Button>
            </a>
          )}
          <Button onClick={() => nav("/partner/vendor-dashboard")} className="w-full" data-testid="continue-to-dashboard">
            Continue to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="vendor-agreement-page">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 bg-gradient-to-r from-[#20364D] to-[#2a4666] text-white rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Version {tpl?.version || "1.0"}</div>
              <h1 className="text-2xl font-bold mt-1">{tpl?.title || "Konekt Vendor Supply Agreement"}</h1>
              <p className="text-sm opacity-90 mt-2 max-w-2xl">
                Please review, fill in your company details, and sign below. Your portal unlocks once you've signed —
                this takes about 2 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Preamble */}
        <div className="bg-white rounded-2xl border p-5 mb-4">
          <p className="text-sm leading-relaxed text-slate-700">{tpl?.effective}</p>
        </div>

        {/* Clauses */}
        <div className="bg-white rounded-2xl border p-5 mb-4 space-y-4" data-testid="agreement-clauses">
          {(tpl?.clauses || []).map((c) => <Clause key={c.heading} {...c} />)}
        </div>

        {/* Vendor details */}
        <div className="bg-white rounded-2xl border p-5 mb-4 space-y-3" data-testid="agreement-details-form">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#20364D]" />
            <h3 className="text-base font-bold text-[#20364D]">Your company & signatory details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vendor legal name *</Label>
              <Input value={form.vendor_legal_name} onChange={(e) => setForm({ ...form, vendor_legal_name: e.target.value })} data-testid="field-legal-name" />
            </div>
            <div>
              <Label className="text-xs">Vendor phone</Label>
              <Input value={form.vendor_phone} onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })} data-testid="field-phone" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Vendor registered address *</Label>
              <Input value={form.vendor_address} onChange={(e) => setForm({ ...form, vendor_address: e.target.value })} data-testid="field-address" />
            </div>
            <div>
              <Label className="text-xs">Authorised signatory — full name *</Label>
              <Input value={form.signatory_name} onChange={(e) => setForm({ ...form, signatory_name: e.target.value })} data-testid="field-signatory-name" />
            </div>
            <div>
              <Label className="text-xs">Signatory title *</Label>
              <Input placeholder="e.g. Director, CEO, Owner" value={form.signatory_title} onChange={(e) => setForm({ ...form, signatory_title: e.target.value })} data-testid="field-signatory-title" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Signatory email *</Label>
              <Input type="email" value={form.signatory_email} onChange={(e) => setForm({ ...form, signatory_email: e.target.value })} data-testid="field-signatory-email" />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4 space-y-3" data-testid="agreement-signature-block">
          <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Electronic signature
          </h3>
          <p className="text-xs text-amber-900/80">
            Typing your full name below and ticking "I agree" has the same legal effect as a handwritten signature.
            We capture the timestamp and your IP for audit purposes.
          </p>
          <div>
            <Label className="text-xs">Type your full name to sign (must match signatory name above) *</Label>
            <Input
              value={form.signature_text}
              onChange={(e) => setForm({ ...form, signature_text: e.target.value })}
              className="font-bold text-lg italic font-serif bg-white"
              placeholder="e.g. John Doe"
              data-testid="field-signature"
            />
          </div>
          <label className="flex items-start gap-2 text-xs cursor-pointer select-none" data-testid="agree-checkbox-label">
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
              className="mt-0.5"
              data-testid="agree-checkbox"
            />
            <span>I confirm that I am authorised to bind the above vendor entity, that the information I've provided is accurate, and that I agree to the terms of this Konekt Vendor Supply Agreement.</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">Version {tpl?.version || "1.0"} · {new Date().toLocaleDateString()}</div>
          <Button
            size="lg"
            onClick={submit}
            disabled={submitting || !form.agreed}
            className="bg-[#20364D] hover:bg-[#1a2d40]"
            data-testid="sign-submit-btn"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing…</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Sign agreement</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
