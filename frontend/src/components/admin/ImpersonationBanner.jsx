import React from "react";
import { ArrowLeft, Shield } from "lucide-react";

export default function ImpersonationBanner() {
  const token = localStorage.getItem("token");
  const backupToken = localStorage.getItem("admin_token_backup");

  // Check if current token is an impersonation
  if (!token || !backupToken) return null;

  let isImpersonating = false;
  let targetName = "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.is_impersonation) {
      isImpersonating = true;
      targetName = payload.full_name || payload.email || "User";
    }
  } catch { return null; }

  if (!isImpersonating) return null;

  const returnToAdmin = () => {
    localStorage.setItem("token", backupToken);
    localStorage.removeItem("admin_token_backup");
    window.location.href = "/admin";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-[#17283C] py-2 px-4 flex items-center justify-center gap-3 text-sm font-semibold shadow-lg" data-testid="impersonation-banner">
      <Shield className="w-4 h-4" />
      <span>You are acting as <strong>{targetName}</strong></span>
      <button
        onClick={returnToAdmin}
        className="inline-flex items-center gap-1.5 bg-white/90 text-[#20364D] px-3 py-1 rounded-lg text-xs font-bold hover:bg-white transition"
        data-testid="return-to-admin-btn"
      >
        <ArrowLeft className="w-3 h-3" /> Return to Admin
      </button>
    </div>
  );
}
