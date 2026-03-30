import React, { useState } from "react";
import { Mail, Phone, MapPin, Building2, Clock } from "lucide-react";
import BrandButton from "../../components/ui/BrandButton";
import SurfaceCard from "../../components/ui/SurfaceCard";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContactPageContent() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone_prefix: "+255",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/public-requests/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit");
      setSuccess(data);
      toast.success(`Message received! Reference: ${data.request_number}`);
      setForm({ name: "", email: "", company: "", phone_prefix: "+255", phone: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16" data-testid="contact-page">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#20364D]">Get in Touch</h1>
        <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
          Have questions about bulk pricing, contract terms, or services? Our team is here to help.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <SurfaceCard>
            {success ? (
              <div className="text-center py-8" data-testid="contact-success">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-[#20364D]">Message Received</h2>
                <p className="text-slate-600 mt-2">Reference: <span className="font-semibold">{success.request_number}</span></p>
                <p className="text-slate-500 mt-1 text-sm">Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => setSuccess(null)}
                  className="mt-6 text-[#20364D] font-medium underline"
                  data-testid="contact-send-another"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                        required
                        data-testid="contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                        required
                        data-testid="contact-email"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                        data-testid="contact-company"
                      />
                    </div>
                    <PhoneNumberField
                      prefix={form.phone_prefix}
                      number={form.phone}
                      onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
                      onNumberChange={(v) => setForm({ ...form, phone: v })}
                      testIdPrefix="contact-phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      required
                      data-testid="contact-subject"
                    >
                      <option value="">Select a subject...</option>
                      <option value="bulk_pricing">Bulk Pricing Inquiry</option>
                      <option value="contract_terms">Contract Terms & Conditions</option>
                      <option value="recurring_orders">Recurring Order Setup</option>
                      <option value="services">Service Inquiry</option>
                      <option value="support">General Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[150px]"
                      required
                      placeholder="Tell us about your requirements..."
                      data-testid="contact-message"
                    />
                  </div>

                  <BrandButton type="submit" className="w-full" variant="primary" disabled={loading} data-testid="contact-submit-btn">
                    {loading ? "Sending..." : "Send Message"}
                  </BrandButton>
                </form>
              </>
            )}
          </SurfaceCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SurfaceCard>
            <h3 className="font-bold mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#20364D]" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-slate-600 text-sm">sales@konekt.co.tz</p>
                  <p className="text-slate-500 text-xs mt-1">For sales and business inquiries</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#20364D]" />
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-slate-600 text-sm">+255 XXX XXX XXX</p>
                  <p className="text-slate-500 text-xs mt-1">Mon-Fri, 9am - 6pm EAT</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#20364D]" />
                </div>
                <div>
                  <p className="font-medium">Office</p>
                  <p className="text-slate-600 text-sm">Dar es Salaam, Tanzania</p>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="bg-[#20364D] text-white">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-6 h-6 text-[#D4A843]" />
              <h3 className="font-bold text-white">Business Accounts</h3>
            </div>
            <p className="text-white/85 text-sm leading-6">
              Need contract pricing, recurring orders, or dedicated account management?
              Our business team can set up a tailored solution for your company.
            </p>
            <BrandButton href="/request-quote?type=business_pricing" variant="gold" className="mt-5" data-testid="contact-business-pricing-cta">
              Request Business Pricing
            </BrandButton>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-[#D4A843]" />
              <h3 className="font-bold">Response Time</h3>
            </div>
            <p className="text-slate-600 text-sm">
              We typically respond to inquiries within 24 hours on business days.
              For urgent matters, please call us directly.
            </p>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
