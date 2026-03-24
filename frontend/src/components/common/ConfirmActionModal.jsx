import React from "react";

export default function ConfirmActionModal({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onClose, loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="confirm-action-modal">
      <div className="w-full max-w-[520px] rounded-[2rem] bg-white p-8">
        <h2 className="text-2xl font-bold text-[#20364D]">{title}</h2>
        <p className="text-slate-600 mt-3">{message}</p>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} disabled={loading} data-testid="confirm-modal-cancel"
            className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors disabled:opacity-50">{cancelLabel}</button>
          <button onClick={onConfirm} disabled={loading} data-testid="confirm-modal-confirm"
            className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50">{loading ? "Please wait..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
