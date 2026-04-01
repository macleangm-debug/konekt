import React from "react";
import { X } from "lucide-react";

/**
 * StandardDrawerShell — Konekt standard drawer overlay.
 * Navy-tinted blur backdrop, slide-in panel, consistent header + close.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - subtitle?: string
 *  - badge?: ReactNode (status badge next to title)
 *  - width?: "md" | "lg" | "xl" (default "lg")
 *  - children: ReactNode
 *  - footer?: ReactNode (sticky footer)
 */
export default function StandardDrawerShell({ open, onClose, title, subtitle, badge, width = "lg", children, footer }) {
  if (!open) return null;

  const widthClass = width === "xl" ? "max-w-2xl" : width === "md" ? "max-w-md" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="standard-drawer-overlay">
      {/* Backdrop — navy-tinted blur */}
      <div
        className="absolute inset-0 bg-[#20364D]/30 backdrop-blur-[3px]"
        onClick={onClose}
        data-testid="drawer-backdrop"
      />
      {/* Panel */}
      <div className={`relative flex w-full ${widthClass} flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200`}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle || "Details"}</p>
              {badge}
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-[#20364D] truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
            data-testid="drawer-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="border-t border-slate-200 px-6 py-3 bg-white">{footer}</div>
        )}
      </div>
    </div>
  );
}
