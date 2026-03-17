import React, { useState, useEffect, useCallback } from "react";
import { X, Gift, Sparkles, Mail, ArrowRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function FirstOrderDiscountModal() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Check if user is logged in or already dismissed
  const shouldShow = useCallback(() => {
    // Don't show if logged in
    const token = localStorage.getItem("token");
    if (token) return false;

    // Don't show if already dismissed recently
    const dismissedAt = localStorage.getItem("konekt_fod_dismissed");
    if (dismissedAt) {
      const dismissed = new Date(dismissedAt);
      const now = new Date();
      const hoursSince = (now - dismissed) / (1000 * 60 * 60);
      if (hoursSince < 24) return false; // Don't show for 24 hours after dismiss
    }

    // Don't show if already captured
    const captured = localStorage.getItem("konekt_fod_captured");
    if (captured) return false;

    return true;
  }, []);

  // Exit intent detection
  useEffect(() => {
    if (!shouldShow()) return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !dismissed) {
        setShow(true);
      }
    };

    // Also show after 30 seconds of browsing
    const timer = setTimeout(() => {
      if (shouldShow() && !dismissed) {
        setShow(true);
      }
    }, 30000);

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, [shouldShow, dismissed]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("konekt_fod_dismissed", new Date().toISOString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/first-order-discount/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setResult(data);

      if (data.eligible && data.offer) {
        localStorage.setItem("konekt_fod_captured", "true");
        localStorage.setItem("konekt_fod_code", data.offer.code);
        localStorage.setItem("konekt_fod_email", email);
      }
    } catch (err) {
      console.error("Failed to capture email:", err);
      setResult({ ok: false, message: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      data-testid="first-order-discount-modal"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition z-10"
          data-testid="fod-modal-close"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-[#20364D] to-[#2a4a66] p-8 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Wait, don't go!</h2>
          <p className="text-white/80 mt-2">
            Get 5% off your first order
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          {result?.eligible ? (
            // Success state
            <div className="text-center" data-testid="fod-success">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
                <Sparkles className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-[#20364D] mb-2">You're all set!</h3>
              <p className="text-slate-600 mb-4">
                Use code <span className="font-bold text-[#20364D]">{result.offer?.code}</span> at checkout.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                <div className="flex justify-between mb-2">
                  <span>Discount</span>
                  <span className="font-semibold">{result.offer?.discount_percent}% off</span>
                </div>
                <div className="flex justify-between">
                  <span>Min. order</span>
                  <span className="font-semibold">
                    {result.offer?.currency} {Number(result.offer?.minimum_order_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full mt-6 py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2"
              >
                Start Shopping <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : result && !result.eligible ? (
            // Not eligible state
            <div className="text-center" data-testid="fod-not-eligible">
              <h3 className="text-xl font-bold text-[#20364D] mb-2">Thanks for your interest!</h3>
              <p className="text-slate-600 mb-4">{result.message}</p>
              <button
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition"
              >
                Continue Browsing
              </button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} data-testid="fod-form">
              <p className="text-slate-600 text-center mb-6">
                Enter your email to receive an exclusive discount on your first order with Konekt.
              </p>
              <div className="relative mb-4">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none transition"
                  data-testid="fod-email-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="fod-submit-btn"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Get My Discount <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 text-center mt-4">
                Valid for new customers only. Min. order TZS 50,000.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
