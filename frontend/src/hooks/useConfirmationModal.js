import { useState, useCallback } from "react";

/**
 * useConfirmationModal - Hook for managing confirmation modal state
 * 
 * Usage:
 * const { modalState, openConfirmation, closeConfirmation } = useConfirmationModal();
 * 
 * openConfirmation({
 *   title: "Approve Payment?",
 *   message: "This will mark the payment as approved and allow the order to proceed.",
 *   confirmLabel: "Approve",
 *   tone: "success",
 *   onConfirm: async () => { await approvePayment(); closeConfirmation(); }
 * });
 * 
 * <ConfirmationModal {...modalState} onCancel={closeConfirmation} />
 */
export default function useConfirmationModal() {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "default",
    onConfirm: null,
    loading: false,
  });

  const openConfirmation = useCallback(({ 
    title, 
    message, 
    confirmLabel, 
    cancelLabel, 
    tone, 
    onConfirm 
  }) => {
    setState({
      open: true,
      title,
      message,
      confirmLabel: confirmLabel || "Confirm",
      cancelLabel: cancelLabel || "Cancel",
      tone: tone || "default",
      onConfirm,
      loading: false,
    });
  }, []);

  const closeConfirmation = useCallback(() => {
    setState((prev) => ({ ...prev, open: false, loading: false }));
  }, []);

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  return {
    modalState: state,
    openConfirmation,
    closeConfirmation,
    setLoading,
  };
}
