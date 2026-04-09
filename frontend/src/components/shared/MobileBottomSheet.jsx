import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * MobileBottomSheet — Global mobile selection shell.
 * Use for: filters, sort, country selectors, dropdown selections, pickers.
 * On desktop (md+), renders as a standard dropdown/popover.
 * On mobile (<md), renders as a bottom sheet overlay.
 *
 * Usage:
 *   <MobileBottomSheet open={open} onClose={() => setOpen(false)} title="Select Status">
 *     <BottomSheetOption label="Processing" selected={v === "processing"} onClick={() => pick("processing")} />
 *     <BottomSheetOption label="Delivered" selected={v === "delivered"} onClick={() => pick("delivered")} />
 *   </MobileBottomSheet>
 */

export function MobileBottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[60] md:hidden" onClick={onClose} data-testid="bottom-sheet-backdrop" />

      {/* Mobile bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[61] md:hidden animate-slide-up"
        data-testid="mobile-bottom-sheet"
      >
        <div className="bg-white rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-[#20364D]">{title || "Select"}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 transition"
              data-testid="bottom-sheet-close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 py-2">
            {children}
          </div>

          {/* Done button */}
          <div className="p-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#20364D] text-white font-semibold text-sm hover:bg-[#2a4a66] transition"
              data-testid="bottom-sheet-done"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Desktop dropdown (md+) */}
      <div
        ref={sheetRef}
        className="hidden md:block absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto py-1"
        data-testid="desktop-dropdown-sheet"
      >
        {title && (
          <div className="px-4 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

export function BottomSheetOption({ label, sublabel, selected, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-3.5 md:px-4 md:py-2.5 text-left transition ${
        selected
          ? "bg-blue-50 text-[#20364D] font-semibold"
          : "text-slate-700 hover:bg-slate-50"
      }`}
      data-testid={`bottom-sheet-option-${(label || "").toLowerCase().replace(/\s+/g, "-")}`}
    >
      {Icon && <Icon className={`w-4 h-4 ${selected ? "text-[#20364D]" : "text-slate-400"}`} />}
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
      {selected && (
        <svg className="w-5 h-5 text-[#20364D] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
