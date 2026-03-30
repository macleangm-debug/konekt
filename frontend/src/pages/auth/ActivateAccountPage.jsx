import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import BrandLogo from "../../components/branding/BrandLogo";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No activation token provided.");
      setValidating(false);
      return;
    }
    fetch(`${API}/api/auth/activate/validate?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        try {
          const data = await r.json();
          if (r.ok && data.valid) {
            setTokenData(data);
          } else {
            setError(data.detail || "Invalid or expired token.");
          }
        } catch (parseError) {
          setError("Invalid or expired token.");
        }
        setValidating(false);
      })
      .catch((err) => { 
        console.error("Activation validation error:", err);
        setError("Network error. Please try again."); 
        setValidating(false); 
      });
  }, [token]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/api/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || "Activation failed.");
      }
    } catch {
      setError("Network error.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4" data-testid="activate-account-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo size="lg" />
          <h1 className="text-2xl font-bold text-[#20364D] mt-4">Activate Your Account</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {validating && (
            <div className="flex flex-col items-center gap-3 py-8" data-testid="validating-spinner">
              <Loader2 className="w-8 h-8 text-[#20364D] animate-spin" />
              <p className="text-sm text-slate-500">Validating your invitation...</p>
            </div>
          )}

          {!validating && error && !success && (
            <div className="flex flex-col items-center gap-3 py-8" data-testid="activation-error">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm text-red-600 text-center">{error}</p>
              {!tokenData && (
                <button onClick={() => navigate("/login")} className="mt-4 text-sm text-[#20364D] underline" data-testid="go-to-login">
                  Go to Login
                </button>
              )}
            </div>
          )}

          {!validating && tokenData && !success && (
            <form onSubmit={handleActivate} className="space-y-5">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Welcome,</p>
                <p className="text-lg font-semibold text-[#20364D]" data-testid="activation-name">{tokenData.customer_name}</p>
                <p className="text-xs text-slate-400 mt-1">{tokenData.customer_email}</p>
              </div>

              <p className="text-sm text-slate-600 text-center">Set your password to activate your Konekt account.</p>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D]"
                    placeholder="Create password" required minLength={6} data-testid="activation-password" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D]"
                    placeholder="Confirm password" required minLength={6} data-testid="activation-confirm-password" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm hover:bg-[#2a4a66] transition disabled:opacity-50"
                data-testid="activation-submit-btn">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Activate Account"}
              </button>
            </form>
          )}

          {success && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="activation-success">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <h2 className="text-lg font-bold text-[#20364D]">Account Activated!</h2>
              <p className="text-sm text-slate-500 text-center">Your account is now active. You can log in and access your quotes, invoices, and orders.</p>
              <button onClick={() => navigate("/login")}
                className="mt-2 px-6 py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm hover:bg-[#2a4a66] transition"
                data-testid="go-to-login-btn">
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
