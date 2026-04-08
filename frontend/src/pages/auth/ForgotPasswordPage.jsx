import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import BrandLogo from "../../components/branding/BrandLogo";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") toast.error(detail);
      else toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="forgot-password-page">
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
            Account <span className="text-[#D4A843]">recovery</span>
          </h1>
          <p className="mt-5 text-white/60 text-lg leading-relaxed">
            Reset your password and get back to business in minutes.
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
            {submitted ? (
              <div className="text-center space-y-4" data-testid="forgot-password-success">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-[#0E1A2B]">Check your email</h2>
                <p className="text-slate-500 text-sm">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                </p>
                <p className="text-slate-400 text-xs">
                  The link expires in 30 minutes. Check your spam folder if you don't see it.
                </p>
                <div className="pt-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#20364D] hover:underline"
                    data-testid="back-to-login-link"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#0E1A2B]">Forgot password?</h2>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  Enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        data-testid="forgot-email-input"
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0E1A2B] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="forgot-submit-btn"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : "Send Reset Link"}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[#20364D] font-semibold hover:underline"
                    data-testid="forgot-back-login"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
