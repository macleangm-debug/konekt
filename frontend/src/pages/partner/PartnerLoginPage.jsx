import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import AuthBrandHeader from "../../components/auth/AuthBrandHeader";

export default function PartnerLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await api.post("/api/partner-auth/login", form);
      localStorage.setItem("partner_token", res.data.access_token);
      navigate("/partner");
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="partner-login-page">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-3xl border bg-white p-8 space-y-5">
        <div className="text-center">
          <AuthBrandHeader subtitle="Sign in to manage your Konekt allocation" />
          <h1 className="text-3xl font-bold text-[#20364D]">Partner Portal</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm" data-testid="login-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
              placeholder="partner@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              data-testid="partner-email-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              data-testid="partner-password-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] transition disabled:opacity-50"
          data-testid="partner-login-btn"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Not a partner yet?{" "}
          <a href="/launch-country" className="text-[#D4A843] font-medium hover:underline">
            Apply to become one
          </a>
        </p>
      </form>
    </div>
  );
}
