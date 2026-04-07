import React from "react";

/**
 * Mobile bottom-sheet selection overlay.
 * Slides from bottom on mobile (md:hidden).
 * On desktop, this component is never rendered — the parent
 * should show a regular <select> instead.
 */
export default function BottomSheetSelect({
  isOpen,
  title = "Select",
  options = [],
  selectedValue,
  onSelect,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" data-testid="bottom-sheet-overlay">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-up">
        {/* Handle + header */}
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between border-b px-5 pb-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            Done
          </button>
        </div>
        {/* Options list */}
        <div className="max-h-[65vh] overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
            {options.map((opt) => {
              const active = opt.value === selectedValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`bs-option-${opt.value}`}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    onSelect?.(opt.value);
                    onClose?.();
                  }}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {active && (
                    <svg className="w-5 h-5 text-[#20364D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
