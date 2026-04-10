import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import BrandLogo from "../../components/branding/BrandLogo";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { Check, Eye, EyeOff } from "lucide-react";
import { clearAllAuth, getDashboardPath } from "../../lib/authHelpers";

export default function RegisterPageV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [phonePrefix, setPhonePrefix] = useState("+255");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [showPin, setShowPin] = useState(false);

  const source = searchParams.get("source") || "";
  const affiliateCode = searchParams.get("ref") || searchParams.get("affiliate_code") || "";

  useEffect(() => {
    const validateSession = async () => {
      const hasToken = localStorage.getItem("konekt_token") || localStorage.getItem("konekt_admin_token") || localStorage.getItem("partner_token");
      if (!hasToken) { setValidating(false); return; }
      try {
        const tokenVal = localStorage.getItem("konekt_token") || localStorage.getItem("konekt_admin_token") || localStorage.getItem("partner_token");
        const res = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${tokenVal}` } });
        if (res.data?.role) {
          setRedirecting(true);
          setValidating(false);
          setTimeout(() => navigate(getDashboardPath(res.data.role)), 1200);
        } else { clearAllAuth(); setValidating(false); }
      } catch { clearAllAuth(); setValidating(false); }
    };
    validateSession();
  }, [navigate]);

  if (validating) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><div className="w-8 h-8 border-4 border-[#0E1A2B] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" data-testid="session-redirect-notice">
        <div className="mx-auto max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4"><Check className="w-6 h-6 text-green-600" /></div>
          <h2 className="text-xl font-bold text-[#0E1A2B]">Already signed in</h2>
          <p className="mt-2 text-sm text-slate-500">Taking you to your dashboard...</p>
          <div className="mt-4"><div className="w-6 h-6 mx-auto border-3 border-[#0E1A2B] border-t-transparent rounded-full animate-spin" /></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) { toast.error("Please fill in all required fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const phone = phoneNumber ? `${phonePrefix}${phoneNumber}` : undefined;
      const payload = {
        full_name: fullName, email, password,
        phone, company: company || undefined,
        pin: pinValue || undefined,
        country_code: phonePrefix || "+255",
        affiliate_code: affiliateCode || undefined,
        website: honeypot || undefined,
      };
      const res = await api.post("/api/auth/register", payload);
      const { token, user } = res.data;
      const role = user.role || "customer";
      clearAllAuth();
      if (["admin", "sales", "marketing", "production"].includes(role)) localStorage.setItem("konekt_admin_token", token);
      else if (["partner", "vendor", "affiliate"].includes(role)) localStorage.setItem("partner_token", token);
      else localStorage.setItem("konekt_token", token);
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.full_name || user.email);
      toast.success("Account created! Welcome to Konekt.");
      window.location.href = getDashboardPath(role);
    } catch (err) { toast.error(err?.response?.data?.detail || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  const isGuestCheckout = source === "guest_checkout";

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="register-page-v2">
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
            {isGuestCheckout ? (
              <>Track your order,{" "}<span className="text-[#D4A843]">all in one place.</span></>
            ) : (
              <>Get started with{" "}<span className="text-[#D4A843]">Konekt.</span></>
            )}
          </h1>
          <p className="mt-5 text-white/60 text-lg leading-relaxed">
            {isGuestCheckout
              ? "Create your account to track orders, manage invoices, and access your purchase history."
              : "Create your account to buy products, request services, and manage everything from one platform."}
          </p>
          <div className="mt-8 space-y-3">
            {["Order products and services easily", "Track orders and invoices in real time", "Get dedicated account support"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#D4A843]" />
                </div>
                <span className="text-white/70 text-sm">{f}</span>
              </div>
            ))}
          </div>
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
            <h2 className="text-2xl font-bold text-[#0E1A2B]">
              {isGuestCheckout ? "Create Account" : "Get Started"}
            </h2>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              {isGuestCheckout ? "Complete registration to track your order" : "Fill in your details to create your account"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot - hidden from real users, bots fill this */}
              <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                <label htmlFor="reg-website">Website</label>
                <input id="reg-website" type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} autoComplete="off" tabIndex={-1} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Full Name *</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  data-testid="register-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Email *</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="register-email-input"
                />
              </div>

              <PhoneNumberField
                prefix={phonePrefix}
                number={phoneNumber}
                onPrefixChange={setPhonePrefix}
                onNumberChange={setPhoneNumber}
                testIdPrefix="register-phone"
              />

              <div>
                <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Company</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                  placeholder="Company name (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  data-testid="register-company-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="register-password-input"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1} data-testid="toggle-register-password-btn">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Optional PIN Setup */}
              <div>
                <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Quick Login PIN <span className="text-slate-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm tracking-[0.3em] font-mono focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                    placeholder="4-6 digits"
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    data-testid="register-pin-input"
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1}>
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Set a PIN for quick phone login later</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0E1A2B] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="register-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Creating account...
                  </span>
                ) : "Create Account"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-[#20364D] font-semibold hover:underline" data-testid="register-login-link">Sign in</Link>
            </div>
          </div>

          <div className="text-center mt-5 text-sm text-slate-400">
            <Link to="/" className="hover:text-slate-600 transition">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
