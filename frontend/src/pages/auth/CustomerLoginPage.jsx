import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AuthBrandHeader from "@/components/auth/AuthBrandHeader";

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(nextPath);
    } catch (error) {
      console.error(error);
      const errorMsg = error?.response?.data?.detail || "Login failed. Please check your credentials.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12" data-testid="customer-login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <AuthBrandHeader subtitle="Sign in to manage your orders, quotes, and services." />
          <h1 className="text-2xl font-bold text-[#20364D] mt-6">Customer Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-xl px-4 py-3"
              placeholder="you@company.com"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 pr-12"
                placeholder="Your password"
                required
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="submit-btn"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Sign In
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <p className="text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#D4A843] font-semibold hover:underline">
              Register
            </Link>
          </p>
          <p className="text-slate-500">
            <Link to="/login" className="text-slate-600 hover:underline">
              ← Back to login options
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
