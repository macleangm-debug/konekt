import React from "react";

/**
 * ConfirmationModal - Reusable confirmation dialog for critical actions
 * 
 * Props:
 * - open: boolean - whether modal is visible
 * - title: string - action title
 * - message: string - what will happen / reversibility info
 * - confirmLabel: string - primary button text
 * - cancelLabel: string - cancel button text
 * - tone: "default" | "danger" | "success" | "warning"
 * - onConfirm: function - called when user confirms
 * - onCancel: function - called when user cancels
 * - loading: boolean - show loading state
 * - confirmDisabled: boolean - disable confirm button
 */
export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default", // default | danger | success | warning
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : tone === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-[#17283C]"
      : "bg-[#20364D] hover:bg-[#17283C] text-white";

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4"
      data-testid="confirmation-modal-backdrop"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl overflow-hidden"
        data-testid="confirmation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-7 border-b bg-slate-50">
          <div className="text-2xl font-bold text-[#20364D]" data-testid="confirmation-modal-title">
            {title}
          </div>
          <p className="text-slate-600 mt-3 leading-7" data-testid="confirmation-modal-message">
            {message}
          </p>
        </div>

        <div className="px-8 py-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition"
            data-testid="confirmation-modal-cancel"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`rounded-xl px-5 py-3 font-semibold transition ${confirmClass} ${loading || confirmDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
            data-testid="confirmation-modal-confirm"
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
