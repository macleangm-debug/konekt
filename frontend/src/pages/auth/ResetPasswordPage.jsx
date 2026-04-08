import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import BrandLogo from "../../components/branding/BrandLogo";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password", { token, password });
      if (res.data?.ok) {
        setSuccess(true);
        toast.success("Password reset successfully");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else setError("Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="reset-password-page">
      {/* Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0E1A2B] text-white p-12 xl:p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }} />
        <div className="relative z-10">
          <BrandLogo size="xl" variant="light" type="full" />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Set your new <span className="text-[#D4A843]">password</span>
          </h1>
          <p className="mt-5 text-white/60 text-lg leading-relaxed">
            Choose a strong password to protect your account.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/30">&copy; {new Date().getFullYear()} Konekt. All rights reserved.</p>
      </div>

      {/* Form Panel */}
      <div className="flex items-center justify-center px-6 py-10 bg-[#f8fafc]">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo size="lg" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-8 shadow-sm">
            {success ? (
              <div className="text-center space-y-4" data-testid="reset-success">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-[#0E1A2B]">Password Reset</h2>
                <p className="text-slate-500 text-sm">
                  Your password has been updated. Redirecting to sign in...
                </p>
                <div className="pt-2">
                  <Link to="/login" className="text-sm font-medium text-[#20364D] hover:underline" data-testid="reset-login-link">
                    Go to Sign In
                  </Link>
                </div>
              </div>
            ) : error && !token ? (
              <div className="text-center space-y-4" data-testid="reset-invalid-token">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-[#0E1A2B]">Invalid Link</h2>
                <p className="text-slate-500 text-sm">{error}</p>
                <div className="pt-2">
                  <Link to="/forgot-password" className="text-sm font-medium text-[#20364D] hover:underline" data-testid="reset-request-new">
                    Request a new reset link
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#0E1A2B]">Reset password</h2>
                <p className="text-slate-500 text-sm mt-1 mb-6">Enter your new password below.</p>

                {error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" data-testid="reset-error">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-11 pr-12 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        data-testid="reset-password-input"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        data-testid="reset-confirm-input"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0E1A2B] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="reset-submit-btn"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                    ) : "Reset Password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
