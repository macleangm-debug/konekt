import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Shield, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import BrandLogo from "@/components/branding/BrandLogo";

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(form.email, form.password);
      toast.success("Welcome back!");

      // Route based on role
      const role = user?.role;
      if (role === "super_admin" || role === "admin") {
        navigate("/admin");
      } else if (role === "supervisor") {
        navigate("/staff");
      } else {
        navigate("/staff");
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error?.response?.data?.detail || "Login failed. Please check your credentials.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1a24] flex" data-testid="staff-login-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#20364D] to-[#0f1a24] p-12">
        <div>
          <Link to="/" className="inline-block">
            <BrandLogo size="lg" variant="light" />
          </Link>
          <p className="text-slate-400 mt-2">Staff Portal</p>
        </div>
        
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10">
              <Users className="w-6 h-6 text-[#D4A843]" />
            </div>
            <div>
              <div className="text-white font-semibold">Team Management</div>
              <p className="text-slate-400 text-sm mt-1">Manage teams, tasks, and workflows</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10">
              <BarChart3 className="w-6 h-6 text-[#D4A843]" />
            </div>
            <div>
              <div className="text-white font-semibold">Operations Dashboard</div>
              <p className="text-slate-400 text-sm mt-1">Monitor orders, production, and delivery</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10">
              <Shield className="w-6 h-6 text-[#D4A843]" />
            </div>
            <div>
              <div className="text-white font-semibold">Admin Controls</div>
              <p className="text-slate-400 text-sm mt-1">System settings, approvals, and audits</p>
            </div>
          </div>
        </div>

        <div className="text-slate-500 text-sm">
          &copy; 2026 Konekt Limited. Internal use only.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link to="/" className="inline-flex justify-center">
              <BrandLogo size="lg" variant="light" />
            </Link>
            <p className="text-slate-400 mt-2">Staff Portal</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <h1 className="text-2xl font-bold text-white">Staff Sign In</h1>
            <p className="text-slate-400 mt-2">
              Access operations, teams, clients, and delivery workflows.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Staff Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
                  placeholder="staff@konekt.co.tz"
                  required
                  data-testid="staff-email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
                  placeholder="Enter password"
                  required
                  data-testid="staff-password-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-[#20364D] font-semibold rounded-xl px-6 py-3.5 transition flex items-center justify-center gap-2"
                data-testid="staff-login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/" className="text-slate-400 hover:text-white text-sm">
                &larr; Back to Website
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-slate-500 text-sm">
            <Link to="/auth" className="hover:text-slate-300">Customer Login</Link>
            <span className="mx-3">|</span>
            <Link to="/partner-login" className="hover:text-slate-300">Partner Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
