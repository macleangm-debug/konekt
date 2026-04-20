import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import BrandLogo from "../../components/branding/BrandLogo";
import { Check, Eye, EyeOff, Phone, Mail } from "lucide-react";
import { clearAllAuth, getDashboardPath } from "../../lib/authHelpers";

const COUNTRIES = [
  { code: "TZ", dial: "+255", flag: "\u{1F1F9}\u{1F1FF}" },
  { code: "KE", dial: "+254", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "UG", dial: "+256", flag: "\u{1F1FA}\u{1F1EC}" },
  { code: "RW", dial: "+250", flag: "\u{1F1F7}\u{1F1FC}" },
  { code: "NG", dial: "+234", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "ZA", dial: "+27",  flag: "\u{1F1FF}\u{1F1E6}" },
  { code: "GH", dial: "+233", flag: "\u{1F1EC}\u{1F1ED}" },
];

export default function LoginPageV2() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formLoadedAt] = useState(() => new Date().toISOString());
  const [validating, setValidating] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const role = localStorage.getItem("userRole");
      const hasToken = localStorage.getItem("konekt_token") || localStorage.getItem("konekt_admin_token") || localStorage.getItem("partner_token");
      if (!hasToken || !role) { setValidating(false); return; }
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

  const handleSuccess = (res) => {
    const { token, user } = res.data;
    const role = user.role || "customer";
    clearAllAuth();
    if (["admin", "sales", "sales_manager", "finance_manager", "marketing", "production", "vendor_ops", "staff"].includes(role)) localStorage.setItem("konekt_admin_token", token);
    else if (role === "affiliate") { localStorage.setItem("partner_token", token); localStorage.setItem("konekt_token", token); }
    else if (["partner", "vendor"].includes(role)) localStorage.setItem("partner_token", token);
    else localStorage.setItem("konekt_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userName", user.full_name || user.email);
    toast.success(`Welcome back, ${user.full_name || user.email}`);
    window.location.href = getDashboardPath(role);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Email and password are required"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password, form_loaded_at: formLoadedAt });
      handleSuccess(res);
    } catch (err) { toast.error(err?.response?.data?.detail || "Invalid email or password"); }
    finally { setLoading(false); }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (!phone || !pin) { toast.error("Phone number and PIN are required"); return; }
    if (pin.length < 4 || pin.length > 6) { toast.error("PIN must be 4 to 6 digits"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { phone, pin, country_code: country.dial, form_loaded_at: formLoadedAt });
      handleSuccess(res);
    } catch (err) { toast.error(err?.response?.data?.detail || "Invalid phone number or PIN"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page-v2">
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
            Your business procurement,{" "}
            <span className="text-[#D4A843]">simplified.</span>
          </h1>
          <p className="mt-5 text-white/60 text-lg leading-relaxed">
            Products, services, orders, and account management — all in one platform.
          </p>
          <div className="mt-8 space-y-3">
            {["Order products and services in minutes", "Track everything from one dashboard", "Bank transfer payments, verified by Konekt"].map((f) => (
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
            <h2 className="text-2xl font-bold text-[#0E1A2B]">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1 mb-5">Sign in to continue</p>

            {/* Method Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-5" data-testid="login-method-switcher">
              <button
                type="button"
                onClick={() => setMode("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
                  mode === "email" ? "bg-white text-[#0E1A2B] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                data-testid="login-tab-email"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => setMode("phone")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
                  mode === "phone" ? "bg-white text-[#0E1A2B] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                data-testid="login-tab-phone"
              >
                <Phone className="w-3.5 h-3.5" /> Phone
              </button>
            </div>

            {/* Email Login Form */}
            {mode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4" data-testid="email-login-form">
                <div>
                  <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Email</label>
                  <input
                    type="email"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    data-testid="login-email-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      data-testid="login-password-input"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1} data-testid="toggle-login-password-btn">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="mt-1.5 text-right">
                    <Link to="/forgot-password" className="text-xs text-[#D4A843] hover:text-[#c49933] font-medium transition" data-testid="forgot-password-link">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E1A2B] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Signing in...
                    </span>
                  ) : "Sign In"}
                </button>
              </form>
            )}

            {/* Phone Login Form */}
            {mode === "phone" && (
              <form onSubmit={handlePhoneLogin} className="space-y-4" data-testid="phone-login-form">
                <div>
                  <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">Phone number</label>
                  <div className="flex gap-2">
                    <select
                      value={country.dial}
                      onChange={(e) => setCountry(COUNTRIES.find((c) => c.dial === e.target.value) || COUNTRIES[0])}
                      className="border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition min-w-[110px]"
                      data-testid="login-country-select"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.dial} value={c.dial}>{c.flag} {c.code} {c.dial}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                      placeholder="712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      autoComplete="tel"
                      data-testid="login-phone-input"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Enter your number without the leading 0</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0E1A2B] mb-1.5">PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm tracking-[0.3em] font-mono focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoComplete="one-time-code"
                      data-testid="login-pin-input"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1} data-testid="toggle-login-pin-btn">
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">4 to 6 digit secure PIN</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E1A2B] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="login-phone-submit-btn"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Signing in...
                    </span>
                  ) : "Sign In"}
                </button>
              </form>
            )}

            <p className="text-center text-[11px] text-slate-400 mt-4">Secure login</p>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#20364D] font-semibold hover:underline" data-testid="login-register-link">Create account</Link>
            </div>
          </div>

          <div className="text-center mt-5 text-sm text-slate-400">
            <Link to="/" className="hover:text-slate-600 transition" data-testid="login-back-home">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
