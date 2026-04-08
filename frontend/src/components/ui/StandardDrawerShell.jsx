import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * StandardDrawerShell — Konekt canonical drawer component (Phase F).
 * ALL drawers across admin, sales, affiliate, and content center
 * must use this shell for consistent UX.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - subtitle?: string
 *  - badge?: ReactNode (status badge next to title)
 *  - width?: "sm" | "md" | "lg" | "xl" | "2xl" (default "lg")
 *  - children: ReactNode (scrollable body)
 *  - footer?: ReactNode (sticky footer with action buttons)
 *  - testId?: string (data-testid for the drawer)
 */
export default function StandardDrawerShell({
  open,
  onClose,
  title,
  subtitle,
  badge,
  width = "lg",
  children,
  footer,
  testId = "standard-drawer",
}) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widthMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };
  const widthClass = widthMap[width] || widthMap.lg;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid={testId}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#20364D]/30 backdrop-blur-[3px] transition-opacity duration-200"
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      />
      {/* Panel */}
      <div className={`relative flex w-full ${widthClass} flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200`}>
        {/* Header — sticky */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            {subtitle && (
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</p>
                {badge}
              </div>
            )}
            <h2 className="text-lg font-extrabold text-[#20364D] truncate" data-testid={`${testId}-title`}>{title}</h2>
            {!subtitle && badge && <div className="mt-1">{badge}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors ml-3 flex-shrink-0"
            data-testid={`${testId}-close`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div className="border-t border-slate-200 px-6 py-3 bg-white flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
