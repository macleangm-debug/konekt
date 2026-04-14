import React, { useState, useEffect, useCallback } from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import api from "../../lib/api";
import { toast } from "sonner";

export default function SettingsLockGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  const email = localStorage.getItem("userEmail") || "";

  const checkStatus = useCallback(async () => {
    if (!email) { setChecking(false); return; }
    try {
      const res = await api.get(`/api/admin/settings-lock/status?email=${encodeURIComponent(email)}`);
      setUnlocked(res.data?.unlocked || false);
      if (res.data?.expires_at) setExpiresAt(res.data.expires_at);
    } catch { setUnlocked(false); }
    setChecking(false);
  }, [email]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  useEffect(() => {
    if (!expiresAt || !unlocked) return;
    const interval = setInterval(() => {
      const exp = new Date(expiresAt);
      const now = new Date();
      const diff = Math.max(0, Math.floor((exp - now) / 1000));
      if (diff <= 0) {
        setUnlocked(false);
        setExpiresAt(null);
        setTimeLeft("");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, unlocked]);

  const unlock = async () => {
    if (!password) { toast.error("Enter your admin password"); return; }
    setUnlocking(true);
    try {
      const res = await api.post("/api/admin/settings-lock/unlock", { email, password });
      setUnlocked(true);
      setExpiresAt(res.data?.expires_at);
      setPassword("");
      toast.success(`Settings unlocked for ${res.data?.minutes || 15} minutes`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid password");
    }
    setUnlocking(false);
  };

  const relock = async () => {
    try {
      await api.post("/api/admin/settings-lock/lock", { email });
      setUnlocked(false);
      setExpiresAt(null);
      toast.success("Settings locked");
    } catch {}
  };

  if (checking) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="settings-lock-gate">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-[#20364D]" />
          </div>
          <h2 className="text-lg font-bold text-[#20364D] mb-2">Settings Locked</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your admin password to access sensitive settings. Access expires after 15 minutes.</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              data-testid="settings-lock-password"
            />
            <Button onClick={unlock} disabled={unlocking} className="bg-[#20364D] hover:bg-[#1a2d40] flex-shrink-0" data-testid="settings-unlock-btn">
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="settings-unlocked">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <Unlock className="w-3.5 h-3.5" />
          <span className="font-medium">Settings unlocked</span>
          {timeLeft && <span className="text-slate-400">({timeLeft} remaining)</span>}
        </div>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={relock} data-testid="settings-relock-btn">
          <Lock className="w-3 h-3 mr-1" /> Lock Now
        </Button>
      </div>
      {children}
    </div>
  );
}
