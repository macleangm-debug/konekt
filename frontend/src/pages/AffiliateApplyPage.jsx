import React, { useState } from "react";
import { Users, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import api from "../lib/api";
import PhoneNumberField from "../components/forms/PhoneNumberField";

const initialForm = {
  full_name: "", email: "", phone_prefix: "+255", phone_number: "",
  company_name: "", region: "", notes: "",
};

export default function AffiliateApplyPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        phone: form.phone_number ? `${form.phone_prefix}${form.phone_number}` : "",
      };
      delete payload.phone_prefix;
      delete payload.phone_number;
      await api.post("/api/affiliate-applications", payload);
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit application");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center" data-testid="apply-success">
          <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D] mb-2">Application Submitted</h1>
          <p className="text-slate-500 mb-6">
            Thank you for your interest in becoming an affiliate partner.
            Our team will review your application and get back to you shortly.
          </p>
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="affiliate-apply-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#20364D] mx-auto flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-[#D4A843]" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Become an Affiliate Partner</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Join our affiliate program and earn commissions by referring businesses to our platform.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div>
            <Label className="text-xs font-semibold">Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your full name" className="mt-1" data-testid="apply-name" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" className="mt-1" data-testid="apply-email" />
          </div>
          <div>
            <PhoneNumberField
              label="Phone"
              prefix={form.phone_prefix}
              number={form.phone_number}
              onPrefixChange={(v) => update("phone_prefix", v)}
              onNumberChange={(v) => update("phone_number", v)}
              testIdPrefix="apply-phone"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Business Name</Label>
            <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Your company (optional)" className="mt-1" data-testid="apply-company" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Region</Label>
            <Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="e.g., Dar es Salaam, Arusha" className="mt-1" data-testid="apply-region" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Why do you want to be an affiliate?</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Tell us about yourself and how you plan to promote..." className="mt-1 min-h-[80px]" data-testid="apply-notes" />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid="apply-submit">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>

          <p className="text-[10px] text-slate-400 text-center">
            By submitting, you agree to our affiliate program terms.
            Commission rates are managed by system policy.
          </p>
        </form>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
