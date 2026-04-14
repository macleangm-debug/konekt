import React, { useState, useEffect, useCallback } from "react";
import { Wallet, Tag, CheckCircle, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import api from "../../lib/api";

const API = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem("konekt_token") || localStorage.getItem("partner_token") || localStorage.getItem("konekt_admin_token");
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AffiliateSetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("mobile_money");
  const [payoutForm, setPayoutForm] = useState({
    provider: "", phone_number: "", account_name: "",
    bank_name: "", account_number: "", branch_name: "", swift_code: "",
  });
  const [promoCode, setPromoCode] = useState("");
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [savedCode, setSavedCode] = useState("");
  const [savedLink, setSavedLink] = useState("");

  const updatePayout = (k, v) => setPayoutForm((p) => ({ ...p, [k]: v }));

  const savePayout = async () => {
    const payload = { method: payoutMethod };
    if (payoutMethod === "mobile_money") {
      if (!payoutForm.provider || !payoutForm.phone_number || !payoutForm.account_name) {
        toast.error("All mobile money fields are required"); return;
      }
      payload.provider = payoutForm.provider;
      payload.phone_number = payoutForm.phone_number;
      payload.account_name = payoutForm.account_name;
    } else {
      if (!payoutForm.bank_name || !payoutForm.account_name || !payoutForm.account_number) {
        toast.error("Bank name, account name, and number are required"); return;
      }
      payload.bank_name = payoutForm.bank_name;
      payload.account_name = payoutForm.account_name;
      payload.account_number = payoutForm.account_number;
      payload.branch_name = payoutForm.branch_name;
      payload.swift_code = payoutForm.swift_code;
    }
    setLoading(true);
    try {
      await api.post("/api/affiliate-program/setup/payout", payload, { headers: authHeader() });
      toast.success("Payout details saved");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save payout");
    }
    setLoading(false);
  };

  const validateCode = useCallback(async (code) => {
    if (!code || code.length < 3) { setCodeAvailable(null); return; }
    setCheckingCode(true);
    try {
      const res = await api.get(`/api/affiliate-program/validate-code/${code}`);
      setCodeAvailable(res.data.available);
    } catch {
      setCodeAvailable(null);
    }
    setCheckingCode(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (promoCode.length >= 3) validateCode(promoCode.toUpperCase());
    }, 500);
    return () => clearTimeout(timer);
  }, [promoCode, validateCode]);

  const savePromoCode = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code || code.length < 3) { toast.error("Code must be at least 3 characters"); return; }
    if (codeAvailable === false) { toast.error("This code is already taken"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/affiliate-program/setup/promo-code", { code }, { headers: authHeader() });
      setSavedCode(res.data.code);
      setSavedLink(res.data.link);
      toast.success("Promo code created!");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save promo code");
    }
    setLoading(false);
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      await api.post("/api/affiliate-program/setup/complete", {}, { headers: authHeader() });
      toast.success("Setup complete! Welcome to the program.");
      onComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete setup");
    }
    setLoading(false);
  };

  const steps = [
    { num: 1, label: "Payout Details", icon: Wallet },
    { num: 2, label: "Promo Code", icon: Tag },
    { num: 3, label: "Confirmation", icon: CheckCircle },
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4" data-testid="affiliate-setup-wizard">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#20364D]">Set Up Your Affiliate Account</h1>
          <p className="text-sm text-slate-500 mt-2">Complete these steps to start earning commissions</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8" data-testid="wizard-steps">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && <div className={`w-8 h-0.5 ${step >= s.num ? "bg-[#D4A843]" : "bg-slate-200"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                step === s.num ? "bg-[#20364D] text-white" : step > s.num ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}>
                {step > s.num ? <CheckCircle className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4" data-testid="step-payout">
              <h2 className="font-semibold text-[#20364D] text-lg">Payout Details</h2>
              <p className="text-sm text-slate-500">Choose how you want to receive your earnings.</p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPayoutMethod("mobile_money")}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition ${
                    payoutMethod === "mobile_money" ? "border-[#D4A843] bg-[#D4A843]/5 text-[#20364D]" : "border-slate-200 text-slate-500"
                  }`}
                  data-testid="payout-mobile-money"
                >
                  Mobile Money
                </button>
                <button
                  onClick={() => setPayoutMethod("bank_transfer")}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition ${
                    payoutMethod === "bank_transfer" ? "border-[#D4A843] bg-[#D4A843]/5 text-[#20364D]" : "border-slate-200 text-slate-500"
                  }`}
                  data-testid="payout-bank"
                >
                  Bank Transfer
                </button>
              </div>

              {payoutMethod === "mobile_money" ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Provider *</Label>
                    <select
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={payoutForm.provider}
                      onChange={(e) => updatePayout("provider", e.target.value)}
                      data-testid="payout-provider"
                    >
                      <option value="">Select provider</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Tigo Pesa">Tigo Pesa</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Halotel">Halotel</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Phone Number *</Label>
                    <Input value={payoutForm.phone_number} onChange={(e) => updatePayout("phone_number", e.target.value)} placeholder="+255 7XX XXX XXX" className="mt-1" data-testid="payout-phone" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Account Name *</Label>
                    <Input value={payoutForm.account_name} onChange={(e) => updatePayout("account_name", e.target.value)} placeholder="Name on mobile money account" className="mt-1" data-testid="payout-account-name" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Bank Name *</Label>
                    <Input value={payoutForm.bank_name} onChange={(e) => updatePayout("bank_name", e.target.value)} placeholder="e.g., CRDB Bank" className="mt-1" data-testid="payout-bank-name" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Account Name *</Label>
                    <Input value={payoutForm.account_name} onChange={(e) => updatePayout("account_name", e.target.value)} placeholder="Account holder name" className="mt-1" data-testid="payout-bank-acc-name" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Account Number *</Label>
                    <Input value={payoutForm.account_number} onChange={(e) => updatePayout("account_number", e.target.value)} placeholder="Account number" className="mt-1" data-testid="payout-bank-acc-num" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Branch</Label>
                      <Input value={payoutForm.branch_name} onChange={(e) => updatePayout("branch_name", e.target.value)} placeholder="Branch" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">SWIFT Code</Label>
                      <Input value={payoutForm.swift_code} onChange={(e) => updatePayout("swift_code", e.target.value)} placeholder="SWIFT" className="mt-1" />
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={savePayout} disabled={loading} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid="save-payout-btn">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save & Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="step-promo-code">
              <h2 className="font-semibold text-[#20364D] text-lg">Create Your Promo Code</h2>
              <p className="text-sm text-slate-500">Choose a unique code that customers will use. This becomes your brand.</p>

              <div>
                <Label className="text-xs font-semibold">Promo Code *</Label>
                <div className="relative mt-1">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                    placeholder="e.g., JOHN2024"
                    className="mt-0 pr-10 font-mono text-lg tracking-wider"
                    maxLength={20}
                    data-testid="promo-code-input"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingCode && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    {!checkingCode && codeAvailable === true && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {!checkingCode && codeAvailable === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-slate-400">3-20 characters. Letters, numbers, underscores only.</p>
                  {codeAvailable === false && <p className="text-[10px] text-red-500 font-medium" data-testid="code-taken">Already taken</p>}
                  {codeAvailable === true && <p className="text-[10px] text-emerald-500 font-medium" data-testid="code-available">Available</p>}
                </div>
              </div>

              <Button onClick={savePromoCode} disabled={loading || codeAvailable === false || promoCode.length < 3} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid="save-promo-btn">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Code & Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center" data-testid="step-confirmation">
              <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-bold text-[#20364D] text-xl">You're All Set!</h2>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-left">
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Your Promo Code</p>
                  <p className="text-2xl font-bold text-[#D4A843] font-mono tracking-widest mt-1" data-testid="confirmed-code">{savedCode}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Your Referral Link</p>
                  <p className="text-sm text-slate-700 break-all mt-1" data-testid="confirmed-link">{savedLink}</p>
                </div>
              </div>

              <p className="text-sm text-slate-500">Share this code with customers. When they purchase using your code, you earn commission automatically.</p>

              <Button onClick={completeSetup} disabled={loading} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid="complete-setup-btn">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enter Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
