import React, { useState } from "react";
import { Users, CheckCircle, Loader2, ArrowLeft, Search, Clock, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import api from "../lib/api";
import PhoneNumberField from "../components/forms/PhoneNumberField";

const PLATFORMS = ["WhatsApp", "Instagram", "TikTok", "Facebook", "Website", "Other"];
const AUDIENCE_SIZES = ["< 100", "100-500", "500-1,000", "1,000-5,000", "5,000+"];

const initialForm = {
  first_name: "", last_name: "", email: "", phone_prefix: "+255", phone_number: "", location: "",
  primary_platform: "", social_instagram: "", social_tiktok: "", social_facebook: "", social_website: "",
  audience_size: "", promotion_strategy: "", product_interests: "",
  prior_experience: false, experience_description: "",
  expected_monthly_sales: "", willing_to_promote_weekly: true, why_join: "",
  agreed_performance_terms: false, agreed_terms: false,
};

export default function AffiliateApplyPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState("apply");
  const [checkInput, setCheckInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [section, setSection] = useState(1);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validateSection = (s) => {
    if (s === 1) return form.first_name && form.last_name && form.email && form.phone_number;
    if (s === 2) return form.primary_platform && form.audience_size;
    if (s === 3) return form.promotion_strategy && form.why_join;
    if (s === 4) return form.expected_monthly_sales;
    return true;
  };

  const nextSection = () => {
    if (!validateSection(section)) { toast.error("Please fill in all required fields"); return; }
    setSection((s) => Math.min(s + 1, 5));
  };

  const submit = async () => {
    if (!form.agreed_terms || !form.agreed_performance_terms) {
      toast.error("You must agree to the terms"); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        full_name: [form.first_name, form.last_name].filter(Boolean).join(" "),
        phone: form.phone_number ? `${form.phone_prefix}${form.phone_number}` : "",
        expected_monthly_sales: parseInt(form.expected_monthly_sales) || 0,
      };
      delete payload.phone_prefix;
      delete payload.phone_number;
      delete payload.first_name;
      delete payload.last_name;
      await api.post("/api/affiliate-applications", payload);
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit application");
    }
    setSubmitting(false);
  };

  const checkStatus = async () => {
    if (!checkInput.trim()) { toast.error("Enter your email or phone"); return; }
    setChecking(true);
    setStatusResult(null);
    try {
      const res = await api.get(`/api/affiliate-applications/check/${encodeURIComponent(checkInput.trim())}`);
      setStatusResult(res.data);
    } catch { toast.error("Failed to check status"); }
    setChecking(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center" data-testid="apply-success">
          <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D] mb-2">Application Received</h1>
          <p className="text-slate-500 mb-2">We will review your application within 48-72 hours.</p>
          <p className="text-sm text-slate-400 mb-6">You will receive an email with the next steps.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Home</Button></Link>
            <Button variant="outline" size="sm" onClick={() => { setTab("check"); setSuccess(false); setSection(1); setForm(initialForm); }} data-testid="go-check-status">Check Status</Button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = ({ status }) => {
    if (status === "approved") return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    if (status === "rejected") return <XCircle className="w-6 h-6 text-red-500" />;
    return <Clock className="w-6 h-6 text-amber-500" />;
  };

  const sectionLabels = ["Personal Info", "Online Presence", "Promotion Strategy", "Commitment", "Agreement"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="affiliate-apply-page">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#20364D] mx-auto flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-[#D4A843]" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Become a Connect Affiliate</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Earn by sharing products and deals with your network.</p>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setTab("apply")} className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition ${tab === "apply" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`} data-testid="tab-apply">Apply Now</button>
          <button onClick={() => setTab("check")} className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition ${tab === "check" ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`} data-testid="tab-check-status">Check Status</button>
        </div>

        {tab === "check" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" data-testid="status-check-panel">
            <div className="flex items-center gap-2 mb-4"><Search className="w-4 h-4 text-[#D4A843]" /><h2 className="font-semibold text-[#20364D]">Check Application Status</h2></div>
            <div className="flex gap-2">
              <Input placeholder="Enter your email or phone" value={checkInput} onChange={(e) => setCheckInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkStatus()} data-testid="status-check-input" />
              <Button onClick={checkStatus} disabled={checking} className="bg-[#20364D] hover:bg-[#1a2d40] flex-shrink-0" data-testid="status-check-btn">{checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}</Button>
            </div>
            {statusResult && (
              <div className="mt-5 p-4 rounded-xl border" data-testid="status-result">
                {!statusResult.exists ? (
                  <div className="text-center text-slate-500 py-2"><AlertTriangle className="w-5 h-5 mx-auto mb-2 text-slate-400" /><p className="text-sm">No application found.</p></div>
                ) : (
                  <div className="flex items-start gap-3">
                    <StatusIcon status={statusResult.status} />
                    <div className="flex-1">
                      <p className="font-semibold text-[#20364D] capitalize">{statusResult.status}</p>
                      {statusResult.status === "pending" && <p className="text-xs text-slate-500 mt-1">Under review. We'll get back to you within 48-72 hours.</p>}
                      {statusResult.status === "approved" && <p className="text-xs text-emerald-600 mt-1">Approved! Check your email for the activation link to set up your account.</p>}
                      {statusResult.status === "rejected" && (<><p className="text-xs text-red-600 mt-1">Not approved at this time.</p>{statusResult.rejection_reason && <p className="text-xs text-slate-500 mt-1 italic">Reason: {statusResult.rejection_reason}</p>}</>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-1 mb-6" data-testid="form-steps">
              {sectionLabels.map((lbl, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className={`w-6 h-0.5 ${section > i ? "bg-[#D4A843]" : "bg-slate-200"}`} />}
                  <div className={`px-2 py-1 rounded-full text-[10px] font-medium transition ${
                    section === i + 1 ? "bg-[#20364D] text-white" : section > i + 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {section > i + 1 ? <CheckCircle className="w-3 h-3 inline mr-0.5" /> : null}
                    <span className="hidden sm:inline">{lbl}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" data-testid="apply-form">
              {/* Section 1: Personal Info */}
              {section === 1 && (
                <div className="space-y-4" data-testid="section-personal">
                  <h2 className="font-semibold text-[#20364D] text-lg">Personal Information</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold">First Name *</Label><Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} placeholder="First name" className="mt-1" data-testid="apply-first-name" /></div>
                    <div><Label className="text-xs font-semibold">Last Name *</Label><Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} placeholder="Last name" className="mt-1" data-testid="apply-last-name" /></div>
                  </div>
                  <div><Label className="text-xs font-semibold">Email *</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" className="mt-1" data-testid="apply-email" /></div>
                  <PhoneNumberField label="Phone *" prefix={form.phone_prefix} number={form.phone_number} onPrefixChange={(v) => update("phone_prefix", v)} onNumberChange={(v) => update("phone_number", v)} testIdPrefix="apply-phone" />
                  <div><Label className="text-xs font-semibold">Location (City / Country)</Label><Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g., Dar es Salaam, Tanzania" className="mt-1" data-testid="apply-location" /></div>
                </div>
              )}

              {/* Section 2: Online Presence */}
              {section === 2 && (
                <div className="space-y-4" data-testid="section-online">
                  <h2 className="font-semibold text-[#20364D] text-lg">Online Presence</h2>
                  <div>
                    <Label className="text-xs font-semibold">Primary Platform *</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.primary_platform} onChange={(e) => update("primary_platform", e.target.value)} data-testid="apply-platform">
                      <option value="">Select platform</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold">Instagram</Label><Input value={form.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} placeholder="@username or link" className="mt-1" data-testid="apply-instagram" /></div>
                    <div><Label className="text-xs font-semibold">TikTok</Label><Input value={form.social_tiktok} onChange={(e) => update("social_tiktok", e.target.value)} placeholder="@username or link" className="mt-1" data-testid="apply-tiktok" /></div>
                    <div><Label className="text-xs font-semibold">Facebook</Label><Input value={form.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} placeholder="Profile or page link" className="mt-1" data-testid="apply-facebook" /></div>
                    <div><Label className="text-xs font-semibold">Website</Label><Input value={form.social_website} onChange={(e) => update("social_website", e.target.value)} placeholder="https://..." className="mt-1" data-testid="apply-website" /></div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Audience Size *</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {AUDIENCE_SIZES.map((s) => (
                        <button key={s} onClick={() => update("audience_size", s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.audience_size === s ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`} data-testid={`audience-${s}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Promotion Strategy */}
              {section === 3 && (
                <div className="space-y-4" data-testid="section-strategy">
                  <h2 className="font-semibold text-[#20364D] text-lg">Promotion Strategy</h2>
                  <div><Label className="text-xs font-semibold">How will you promote our products? *</Label><Textarea value={form.promotion_strategy} onChange={(e) => update("promotion_strategy", e.target.value)} placeholder="Describe your promotion approach..." className="mt-1 min-h-[80px]" data-testid="apply-strategy" /></div>
                  <div><Label className="text-xs font-semibold">Products you want to promote</Label><Input value={form.product_interests} onChange={(e) => update("product_interests", e.target.value)} placeholder="e.g., Office equipment, promotional materials" className="mt-1" data-testid="apply-products" /></div>
                  <div>
                    <Label className="text-xs font-semibold">Have you done affiliate marketing before? *</Label>
                    <div className="flex gap-3 mt-1.5">
                      <button onClick={() => update("prior_experience", true)} className={`px-4 py-2 rounded-lg text-xs font-medium border ${form.prior_experience ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200"}`} data-testid="experience-yes">Yes</button>
                      <button onClick={() => { update("prior_experience", false); update("experience_description", ""); }} className={`px-4 py-2 rounded-lg text-xs font-medium border ${!form.prior_experience ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200"}`} data-testid="experience-no">No</button>
                    </div>
                  </div>
                  {form.prior_experience && (
                    <div><Label className="text-xs font-semibold">Describe your experience</Label><Textarea value={form.experience_description} onChange={(e) => update("experience_description", e.target.value)} placeholder="Brief description of your affiliate experience..." className="mt-1 min-h-[60px]" data-testid="apply-exp-desc" /></div>
                  )}
                  <div><Label className="text-xs font-semibold">Why do you want to join? *</Label><Textarea value={form.why_join} onChange={(e) => update("why_join", e.target.value)} placeholder="What motivates you to be an affiliate partner?" className="mt-1 min-h-[60px]" data-testid="apply-why" /></div>
                </div>
              )}

              {/* Section 4: Commitment */}
              {section === 4 && (
                <div className="space-y-4" data-testid="section-commitment">
                  <h2 className="font-semibold text-[#20364D] text-lg">Commitment</h2>
                  <div><Label className="text-xs font-semibold">Expected monthly sales *</Label><Input type="number" value={form.expected_monthly_sales} onChange={(e) => update("expected_monthly_sales", e.target.value)} placeholder="e.g., 10" className="mt-1" data-testid="apply-monthly-sales" /></div>
                  <div>
                    <Label className="text-xs font-semibold">Are you willing to actively promote campaigns weekly?</Label>
                    <div className="flex gap-3 mt-1.5">
                      <button onClick={() => update("willing_to_promote_weekly", true)} className={`px-4 py-2 rounded-lg text-xs font-medium border ${form.willing_to_promote_weekly ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200"}`}>Yes</button>
                      <button onClick={() => update("willing_to_promote_weekly", false)} className={`px-4 py-2 rounded-lg text-xs font-medium border ${!form.willing_to_promote_weekly ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200"}`}>No</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Agreement */}
              {section === 5 && (
                <div className="space-y-4" data-testid="section-agreement">
                  <h2 className="font-semibold text-[#20364D] text-lg">Agreement</h2>
                  <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={form.agreed_performance_terms} onChange={(e) => update("agreed_performance_terms", e.target.checked)} className="mt-0.5" data-testid="agree-performance" />
                    <span className="text-sm text-slate-600">I understand this is a performance-based program and I may be removed if I do not meet targets</span>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={form.agreed_terms} onChange={(e) => update("agreed_terms", e.target.checked)} className="mt-0.5" data-testid="agree-terms" />
                    <span className="text-sm text-slate-600">I agree to the terms and conditions of the affiliate program</span>
                  </label>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                {section > 1 ? (
                  <Button variant="outline" size="sm" onClick={() => setSection((s) => s - 1)}><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Button>
                ) : <div />}
                {section < 5 ? (
                  <Button onClick={nextSection} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="next-section">Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                ) : (
                  <Button onClick={submit} disabled={submitting || !form.agreed_terms || !form.agreed_performance_terms} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="apply-submit">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {submitting ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <div className="text-center mt-6"><Link to="/" className="text-xs text-slate-400 hover:text-slate-600">Back to Home</Link></div>
      </div>
    </div>
  );
}
