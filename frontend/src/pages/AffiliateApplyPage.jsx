import React, { useState } from "react";
import { Users, CheckCircle, Loader2, ArrowLeft, Search, Clock, XCircle, AlertTriangle } from "lucide-react";
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
  const [tab, setTab] = useState("apply");
  const [checkInput, setCheckInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

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

  const checkStatus = async () => {
    if (!checkInput.trim()) { toast.error("Enter your email or phone number"); return; }
    setChecking(true);
    setStatusResult(null);
    try {
      const res = await api.get(`/api/affiliate-applications/check/${encodeURIComponent(checkInput.trim())}`);
      setStatusResult(res.data);
    } catch {
      toast.error("Failed to check status");
    }
    setChecking(false);
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

  const StatusIcon = ({ status }) => {
    if (status === "approved") return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    if (status === "rejected") return <XCircle className="w-6 h-6 text-red-500" />;
    return <Clock className="w-6 h-6 text-amber-500" />;
  };

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

        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab("apply")}
            className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition ${tab === "apply" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`}
            data-testid="tab-apply"
          >
            Apply Now
          </button>
          <button
            onClick={() => setTab("check")}
            className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition ${tab === "check" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`}
            data-testid="tab-check-status"
          >
            Check Status
          </button>
        </div>

        {tab === "check" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" data-testid="status-check-panel">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-[#D4A843]" />
              <h2 className="font-semibold text-[#20364D]">Check Application Status</h2>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your email or phone"
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkStatus()}
                data-testid="status-check-input"
              />
              <Button onClick={checkStatus} disabled={checking} className="bg-[#20364D] hover:bg-[#1a2d40] flex-shrink-0" data-testid="status-check-btn">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
              </Button>
            </div>

            {statusResult && (
              <div className="mt-5 p-4 rounded-xl border" data-testid="status-result">
                {!statusResult.exists ? (
                  <div className="text-center text-slate-500 py-2">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">No application found with this email or phone.</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <StatusIcon status={statusResult.status} />
                    <div className="flex-1">
                      <p className="font-semibold text-[#20364D] capitalize">{statusResult.status}</p>
                      {statusResult.status === "pending" && (
                        <p className="text-xs text-slate-500 mt-1">Your application is under review. We'll get back to you soon.</p>
                      )}
                      {statusResult.status === "approved" && (
                        <p className="text-xs text-emerald-600 mt-1">Congratulations! Your application has been approved. You can now log in to set up your affiliate account.</p>
                      )}
                      {statusResult.status === "rejected" && (
                        <>
                          <p className="text-xs text-red-600 mt-1">Unfortunately, your application was not approved at this time.</p>
                          {statusResult.rejection_reason && (
                            <p className="text-xs text-slate-500 mt-1 italic">Reason: {statusResult.rejection_reason}</p>
                          )}
                        </>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2">Submitted: {new Date(statusResult.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm" data-testid="apply-form">
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
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
