import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";

const ConfirmModalContext = createContext(null);

/**
 * useConfirmModal — Global hook for triggering confirmations from anywhere.
 *
 * Usage:
 *   const { confirmAction } = useConfirmModal();
 *   confirmAction({
 *     title: "Approve Payment?",
 *     message: "This action cannot be undone.",
 *     confirmLabel: "Approve",
 *     tone: "success",
 *     onConfirm: async () => { await doStuff(); },
 *   });
 */
export function useConfirmModal() {
  const ctx = useContext(ConfirmModalContext);
  if (!ctx) throw new Error("useConfirmModal must be used within ConfirmModalProvider");
  return ctx;
}

/**
 * ConfirmModalProvider — Wraps the app, renders the single global modal.
 * Prevents double-click, shows loading state, blocks interaction while open.
 */
export function ConfirmModalProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "default",
    loading: false,
  });

  const onConfirmRef = useRef(null);
  const lockRef = useRef(false);

  const confirmAction = useCallback(({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "default",
    onConfirm,
  }) => {
    onConfirmRef.current = onConfirm;
    lockRef.current = false;
    setState({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      loading: false,
    });
  }, []);

  const closeModal = useCallback(() => {
    if (lockRef.current) return; // Don't close while confirming
    setState((prev) => ({ ...prev, open: false, loading: false }));
    onConfirmRef.current = null;
    lockRef.current = false;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (lockRef.current) return; // Prevent double-click
    lockRef.current = true;
    setState((prev) => ({ ...prev, loading: true }));

    try {
      await onConfirmRef.current?.();
    } catch (err) {
      console.error("Confirm action failed:", err);
    } finally {
      setState((prev) => ({ ...prev, open: false, loading: false }));
      onConfirmRef.current = null;
      lockRef.current = false;
    }
  }, []);

  const toneClass =
    state.tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : state.tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : state.tone === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-[#17283C]"
      : "bg-[#20364D] hover:bg-[#17283C] text-white";

  return (
    <ConfirmModalContext.Provider value={{ confirmAction }}>
      {children}

      {state.open && (
        <div
          className="fixed inset-0 z-[9000] bg-black/50 flex items-center justify-center px-4"
          data-testid="global-confirm-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !state.loading) closeModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            data-testid="global-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-7 pt-7 pb-4">
              <h2
                className="text-xl font-bold text-[#20364D]"
                data-testid="global-confirm-title"
              >
                {state.title}
              </h2>
              <p
                className="text-slate-600 mt-2 leading-relaxed text-sm"
                data-testid="global-confirm-message"
              >
                {state.message}
              </p>
            </div>

            {/* Actions */}
            <div className="px-7 py-5 bg-slate-50 border-t flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={state.loading}
                className="rounded-xl border px-5 py-2.5 font-semibold text-[#20364D] hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                data-testid="global-confirm-cancel"
              >
                {state.cancelLabel}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={state.loading}
                className={`rounded-xl px-5 py-2.5 font-semibold transition text-sm flex items-center justify-center gap-2 min-w-[100px] ${toneClass} ${
                  state.loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
                data-testid="global-confirm-confirm"
              >
                {state.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  state.confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmModalContext.Provider>
  );
}
