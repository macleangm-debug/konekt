import React, { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Get role-specific install messaging
 */
function getRoleLabel(role) {
  switch (role) {
    case "sales":
      return "Install the Sales Workspace for quick access to your queue and follow-ups.";
    case "operations":
      return "Install the Operations Workspace for tasks, deliveries, and service updates.";
    case "supervisor":
      return "Install the Supervisor Workspace for team visibility and decision making.";
    case "partner":
    case "delivery_partner":
      return "Install the Partner Workspace to manage jobs, settlements, and updates faster.";
    case "affiliate":
      return "Install the Affiliate Workspace to share links and track earnings quickly.";
    case "admin":
    case "super_admin":
      return "Install Konekt Admin for quick access to configurations and approvals.";
    default:
      return "Install Konekt for faster access to your orders, services, and account tools.";
  }
}

/**
 * PwaInstallBanner - Role-aware PWA install prompt
 * Shows at bottom of screen when PWA install is available
 * 
 * Props:
 * - user: { role: string } - current user object
 */
export default function PwaInstallBanner({ user }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      setHidden(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const role = user?.role || "customer";
  const copy = useMemo(() => getRoleLabel(role), [role]);

  if (hidden || !deferredPrompt) return null;

  const install = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("PWA installed");
    }
    setDeferredPrompt(null);
    setHidden(true);
  };

  const dismiss = () => {
    sessionStorage.setItem("pwa_install_dismissed", "true");
    setHidden(true);
  };

  return (
    <div 
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-24px)] max-w-3xl rounded-2xl border bg-white shadow-xl px-5 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
      data-testid="pwa-install-banner"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#20364D] flex items-center justify-center text-white font-bold shrink-0">
          K
        </div>
        <div>
          <div className="font-bold text-[#20364D]">Install Konekt</div>
          <p className="text-sm text-slate-600 mt-1">{copy}</p>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border px-4 py-2 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center gap-2"
          data-testid="pwa-install-later"
        >
          <X className="w-4 h-4" />
          Later
        </button>
        <button
          type="button"
          onClick={install}
          className="rounded-xl bg-[#20364D] text-white px-4 py-2 font-semibold hover:bg-[#17283C] transition flex items-center gap-2"
          data-testid="pwa-install-btn"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
      </div>
    </div>
  );
}
