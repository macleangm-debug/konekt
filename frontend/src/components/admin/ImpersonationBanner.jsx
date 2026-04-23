import React from "react";
import { ArrowLeft, Shield } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Shows a fixed yellow banner whenever an admin/ops user is impersonating.
 * Handles BOTH:
 *   - Legacy admin-user impersonation (token in 'token', backup in 'admin_token_backup')
 *   - Partner impersonation (token in 'partner_token', backup in 'admin_token_backup_v2', returns to /admin)
 */
export default function ImpersonationBanner() {
  // Try partner impersonation first
  const partnerToken = localStorage.getItem("partner_token");
  const backupToken = localStorage.getItem("admin_token_backup_v2") || localStorage.getItem("admin_token_backup");
  const legacyToken = localStorage.getItem("token");

  let isImpersonating = false;
  let targetName = "";
  let auditId = "";
  let kind = "";

  if (partnerToken && backupToken) {
    try {
      const payload = JSON.parse(atob(partnerToken.split(".")[1]));
      if (payload.is_impersonation) {
        isImpersonating = true;
        kind = "partner";
        targetName = localStorage.getItem("impersonation_target_name") || payload.sub || "Vendor";
        auditId = payload.audit_id || "";
      }
    } catch { /* ignore */ }
  }

  if (!isImpersonating && legacyToken && backupToken) {
    try {
      const payload = JSON.parse(atob(legacyToken.split(".")[1]));
      if (payload.is_impersonation) {
        isImpersonating = true;
        kind = "legacy";
        targetName = payload.full_name || payload.email || "User";
      }
    } catch { /* ignore */ }
  }

  if (!isImpersonating) return null;

  const returnToAdmin = async () => {
    // End the audit session (best-effort)
    if (kind === "partner" && auditId) {
      try {
        await fetch(`${API}/api/admin/impersonation-log/${auditId}/end`, {
          method: "POST",
          headers: { Authorization: `Bearer ${backupToken}` },
        });
      } catch { /* best-effort */ }
    }
    // Restore admin token
    localStorage.setItem("token", backupToken);
    localStorage.removeItem("admin_token_backup");
    localStorage.removeItem("admin_token_backup_v2");
    localStorage.removeItem("partner_token");
    localStorage.removeItem("impersonation_target_name");
    localStorage.removeItem("impersonation_audit_id");
    window.location.href = "/admin";
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-[#17283C] py-2 px-4 flex items-center justify-center gap-3 text-sm font-semibold shadow-lg"
      data-testid="impersonation-banner"
    >
      <Shield className="w-4 h-4" />
      <span>
        You are acting as <strong data-testid="impersonation-target-name">{targetName}</strong>
        {kind === "partner" && <span className="ml-2 text-[11px] bg-white/30 px-2 py-0.5 rounded-full">Vendor portal</span>}
      </span>
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
