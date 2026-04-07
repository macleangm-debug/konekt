import React, { useState, useEffect } from "react";
import { User, FileText, MapPin, ShieldCheck, Loader2, CheckCircle } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import PhoneNumberField from "../forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

export default function ServiceQuoteRequestFormV2({ service }) {
  const [form, setForm] = useState({
    client_name: "", client_phone_prefix: "+255", client_phone: "", client_email: "",
    invoice_client_name: "", invoice_client_phone_prefix: "+255", invoice_client_phone: "", invoice_client_email: "", invoice_client_tin: "",
    brief: "", delivery_or_site_address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    setForm(prev => ({ ...prev, client_name: name, client_email: email }));
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.client_name || !form.client_phone) {
      toast.error("Please provide your name and phone number");
      return;
    }
    if (!form.brief) {
      toast.error("Please describe what you need");
      return;
    }
    setSubmitting(true);
    try {
      const { client_phone_prefix, invoice_client_phone_prefix, ...rest } = form;
      await api.post("/api/service-requests-quick", {
        service_key: service?.service_key,
        service_name: service?.service_name,
        ...rest,
        client_phone: combinePhone(client_phone_prefix, form.client_phone),
        invoice_client_phone: combinePhone(invoice_client_phone_prefix, form.invoice_client_phone),
      });
      setSubmitted(true);
      toast.success("Service quote request submitted!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center" data-testid="service-request-success">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[#0f172a]">Request Submitted!</h3>
        <p className="text-sm text-[#64748b] mt-2">Our sales team will review and send you a tailored quote shortly.</p>
      </div>
    );
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 space-y-6" data-testid="service-quote-request-form">
      <div>
        <h3 className="text-xl font-semibold text-[#0f172a]">Request a Quote</h3>
        <p className="text-sm text-[#64748b] mt-1">Sales will use these details to prepare your quote.</p>
      </div>

      {/* Contact Details */}
      <section className="rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#1f3a5f]" />
          <h4 className="text-sm font-semibold text-[#0f172a]">Contact Details</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="Contact Name" value={form.client_name} onChange={(e) => update("client_name", e.target.value)} data-testid="service-client-name" />
          <PhoneNumberField
            label=""
            prefix={form.client_phone_prefix}
            number={form.client_phone}
            onPrefixChange={(v) => update("client_phone_prefix", v)}
            onNumberChange={(v) => update("client_phone", v)}
            testIdPrefix="service-client-phone"
          />
          <input className={`${inputClass} md:col-span-2`} placeholder="Email Address" value={form.client_email} onChange={(e) => update("client_email", e.target.value)} data-testid="service-client-email" />
        </div>
      </section>

      {/* Invoice Client Details */}
      <section className="rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-[#1f3a5f]" />
          <h4 className="text-sm font-semibold text-[#0f172a]">Invoice Client Details</h4>
        </div>
        <p className="text-xs text-[#94a3b8] mb-4">These details will appear on the quotation and invoice.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="Invoice Client Name" value={form.invoice_client_name} onChange={(e) => update("invoice_client_name", e.target.value)} />
          <PhoneNumberField
            label=""
            prefix={form.invoice_client_phone_prefix}
            number={form.invoice_client_phone}
            onPrefixChange={(v) => update("invoice_client_phone_prefix", v)}
            onNumberChange={(v) => update("invoice_client_phone", v)}
            testIdPrefix="invoice-client-phone"
          />
          <input className={inputClass} placeholder="Invoice Client Email" value={form.invoice_client_email} onChange={(e) => update("invoice_client_email", e.target.value)} />
          <input className={inputClass} placeholder="TIN Number" value={form.invoice_client_tin} onChange={(e) => update("invoice_client_tin", e.target.value)} />
        </div>
      </section>

      {/* Request Brief */}
      <section className="rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-[#1f3a5f]" />
          <h4 className="text-sm font-semibold text-[#0f172a]">Request Brief</h4>
        </div>
        <div className="space-y-3">
          <textarea className={`${inputClass} min-h-[120px] resize-none`} placeholder="Tell us what you need..." value={form.brief} onChange={(e) => update("brief", e.target.value)} data-testid="service-brief" />
          <textarea className={`${inputClass} min-h-[80px] resize-none`} placeholder="Site / Delivery Address (if relevant)" value={form.delivery_or_site_address} onChange={(e) => update("delivery_or_site_address", e.target.value)} />
        </div>
      </section>

      {/* Trust + Submit */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-[#64748b]">No payment required. You'll receive a tailored quote before any commitment.</p>
        </div>
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-[#0f172a] text-white py-3.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md"
          data-testid="service-submit-btn"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Submitting...</span>
          ) : "Submit Request"}
        </button>
      </div>
    </div>
  );
}
