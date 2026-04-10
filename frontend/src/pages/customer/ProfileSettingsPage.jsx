import React, { useEffect, useState } from "react";
import { User, Mail, Shield, Phone, Eye, EyeOff, KeyRound } from "lucide-react";
import AppLoader from "../../components/branding/AppLoader";
import api from "../../lib/api";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinSection, setPinSection] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setUser(res.data);
      } catch {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem("user");
          if (raw) setUser(JSON.parse(raw));
        } catch (e) {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      toast.error("PIN must be 4 to 6 digits");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password to verify identity");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/auth/set-pin", { pin: newPin, current_password: currentPassword });
      toast.success("PIN set successfully! You can now login with your phone + PIN.");
      setPinSection(false);
      setNewPin("");
      setCurrentPassword("");
      setUser((prev) => prev ? { ...prev, has_pin: true } : prev);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to set PIN");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <AppLoader text="Loading profile..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="profile-settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Review your account details and security settings.</p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#20364D] flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {(user?.name || user?.full_name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-[#20364D]">
              {user?.name || user?.full_name || "User"}
            </div>
            <div className="text-slate-500 capitalize">{user?.role || "customer"} account</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4" /> Full Name
            </div>
            <div className="text-lg font-medium text-[#20364D]">{user?.name || user?.full_name || "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Mail className="w-4 h-4" /> Email Address
            </div>
            <div className="text-lg font-medium text-[#20364D]">{user?.email || "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" /> Account Type
            </div>
            <div className="text-lg font-medium text-[#20364D] capitalize">{user?.role || "customer"}</div>
          </div>
          {user?.phone && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="w-4 h-4" /> Phone
              </div>
              <div className="text-lg font-medium text-[#20364D]">{user.phone}</div>
            </div>
          )}
        </div>
      </div>

      {/* PIN Management Section */}
      <div className="bg-white rounded-xl border p-6" data-testid="pin-management-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#D4A843]" />
            <h2 className="text-lg font-bold text-[#20364D]">Quick Login PIN</h2>
          </div>
          {user?.has_pin && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-medium text-emerald-700" data-testid="pin-active-badge">
              Active
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {user?.has_pin
            ? "You have a PIN set. You can log in using your phone number and PIN."
            : "Set a 4-6 digit PIN to log in quickly using your phone number."}
        </p>

        {!pinSection ? (
          <button
            onClick={() => setPinSection(true)}
            className="rounded-xl bg-[#0E1A2B] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1a2d42] transition"
            data-testid="set-pin-btn"
          >
            {user?.has_pin ? "Change PIN" : "Set PIN"}
          </button>
        ) : (
          <div className="space-y-3 max-w-sm" data-testid="pin-setup-form">
            <div>
              <label className="block text-sm font-medium text-[#0E1A2B] mb-1">New PIN</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm tracking-[0.3em] font-mono focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                  placeholder="4-6 digits"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  data-testid="new-pin-input"
                />
                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1}>
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0E1A2B] mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none transition"
                  placeholder="Verify your identity"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="current-password-input"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSetPin}
                disabled={saving}
                className="rounded-xl bg-[#0E1A2B] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1a2d42] transition disabled:opacity-50"
                data-testid="save-pin-btn"
              >
                {saving ? "Saving..." : "Save PIN"}
              </button>
              <button
                onClick={() => { setPinSection(false); setNewPin(""); setCurrentPassword(""); }}
                className="text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl border border-dashed p-6 text-center">
        <p className="text-slate-500">
          Need to update your details? Contact support or your account manager.
        </p>
      </div>
    </div>
  );
}
