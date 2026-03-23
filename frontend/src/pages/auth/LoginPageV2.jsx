import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";

export default function LoginPageV2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { token, user } = res.data;
      
      // Store token with the key used by AuthContext
      localStorage.setItem("konekt_token", token);
      localStorage.setItem("token", token); // Legacy support
      localStorage.setItem("userRole", user.role || "customer");
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.full_name || user.email);
      
      toast.success("Welcome back!");
      
      // Force full page reload to ensure auth context picks up the token
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page-v2">
      {/* Left Side - Branding */}
      <div className="bg-[#20364D] text-white p-10 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/branding/konekt-logo-full.png" 
              alt="Konekt" 
              className="h-14 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden">
              <div className="text-3xl font-bold tracking-tight">KONEKT</div>
              <div className="text-sm text-slate-300 mt-1">Business Solutions Platform</div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight">Welcome to Konekt</h1>
          <p className="mt-4 text-slate-200 text-lg">
            Buy products, request services, and manage everything from one platform.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F4E7BF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#8B6A10]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-200">Order Products Easily</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F4E7BF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#8B6A10]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-200">Request Services in Minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F4E7BF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#8B6A10]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-200">Track Everything in One Place</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-10 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="border rounded-2xl p-8 bg-white shadow-sm">
            <h2 className="text-2xl font-bold text-[#20364D] mb-2">Sign In</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your credentials to access your account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">Email Address</label>
                <input 
                  type="email"
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D] focus:border-transparent outline-none transition" 
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="email-input"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 mb-2">Password</label>
                <input 
                  type="password"
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D] focus:border-transparent outline-none transition" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="password-input"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#20364D] text-white py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <div className="text-sm text-center text-slate-500">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#20364D] font-semibold hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6 text-sm text-slate-400">
            <Link to="/" className="hover:text-slate-600">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
