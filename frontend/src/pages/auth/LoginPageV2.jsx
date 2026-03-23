import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import BrandLogoFinal from "../../components/branding/BrandLogoFinal";
import { Check } from "lucide-react";

export default function LoginPageV2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      
      localStorage.setItem("konekt_token", token);
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", user.role || "customer");
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.full_name || user.email);
      
      toast.success("Welcome back!");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Order Products Easily",
    "Request Services in Minutes",
    "Track Everything in One Place",
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page-v2">
      {/* Left Side - Branding */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white p-10 md:p-16 flex flex-col justify-center relative overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        
        <div className="max-w-md mx-auto relative z-10">
          <BrandLogoFinal size="xl" light className="mb-12" />
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Welcome to Konekt
          </h1>
          <p className="mt-4 text-white/70 text-lg leading-relaxed">
            Buy products, request services, and manage everything from one platform.
          </p>

          <div className="mt-10 space-y-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#f4c430]/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#f4c430]" />
                </div>
                <span className="text-white/80 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-10 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#0f172a] mb-1">Sign In</h2>
            <p className="text-[#64748b] text-sm mb-6">Enter your credentials to access your account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Email Address</label>
                <input 
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition" 
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="email-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Password</label>
                <input 
                  type="password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="password-input"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f172a] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-sm text-center text-[#64748b]">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#1f3a5f] font-semibold hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6 text-sm text-[#94a3b8]">
            <Link to="/" className="hover:text-[#64748b] transition-colors">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
