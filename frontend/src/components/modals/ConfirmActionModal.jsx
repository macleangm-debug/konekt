import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * ConfirmActionModal - Simple confirmation dialog
 * Used for confirming critical actions like payments, status changes, etc.
 * 
 * Props:
 * - open: boolean
 * - title: string
 * - description: string
 * - confirmLabel: string (default "Confirm")
 * - cancelLabel: string (default "Cancel")
 * - danger: boolean - shows red confirm button
 * - loading: boolean - shows loading state
 * - onConfirm: function
 * - onCancel: function
 */
export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-6"
      data-testid="confirm-action-modal-backdrop"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-lg rounded-[2rem] bg-white shadow-xl overflow-hidden"
        data-testid="confirm-action-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-7">
          <div className="flex items-start gap-4">
            {danger && (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <div className="text-2xl font-bold text-[#20364D]" data-testid="confirm-action-title">
                {title}
              </div>
              <p className="text-slate-600 mt-3 leading-7" data-testid="confirm-action-description">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-100 transition disabled:opacity-50"
            data-testid="confirm-action-cancel"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-5 py-3 font-semibold transition disabled:opacity-50 ${
              danger 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-[#20364D] text-white hover:bg-[#17283C]"
            }`}
            data-testid="confirm-action-confirm"
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
