import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AffiliateActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) setError("Invalid activation link. No token provided.");
  }, [token]);

  const activate = async () => {
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match"); return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/affiliate-applications/activate", { token, password });
      setSuccess(true);
      setEmail(res.data?.email || "");
      toast.success("Account activated! You can now log in.");
    } catch (err) {
      const detail = err.response?.data?.detail || "Activation failed";
      setError(detail);
      toast.error(detail);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4" data-testid="activation-success">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D] mb-2">Account Activated!</h1>
          <p className="text-slate-500 mb-2">Your password has been set. You can now log in to complete your affiliate setup.</p>
          {email && <p className="text-sm text-slate-400 mb-6">Email: {email}</p>}
          <Button onClick={() => navigate("/login")} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="go-to-login">
            Log In & Complete Setup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4" data-testid="activation-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#20364D] mx-auto flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-[#D4A843]" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Create Your Password</h1>
          <p className="text-sm text-slate-500 mt-2">Set a secure password to activate your affiliate account.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3" data-testid="activation-error">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              {error.includes("expired") && (
                <p className="text-xs text-red-500 mt-1">Please contact support or request a new activation link from admin.</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <Label className="text-xs font-semibold">Password *</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                className="pr-10"
                data-testid="password-input"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Confirm Password *</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="mt-1"
              data-testid="confirm-password-input"
            />
          </div>

          <Button onClick={activate} disabled={loading || !token} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid="activate-btn">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {loading ? "Activating..." : "Activate Account"}
          </Button>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
}
