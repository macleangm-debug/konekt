import React, { useState } from "react";
import api from "../../lib/api";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

export default function SubmitPaymentGuarded({ paymentId, customerId, payerName, amountPaid, fileUrl, onSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { confirmAction } = useConfirmModal();

  const handleClick = () => {
    confirmAction({
      title: "Submit Payment?",
      message: "Please confirm you want to submit this payment proof. After submission, the button will be locked to avoid duplicate submissions.",
      confirmLabel: "Yes, Submit",
      tone: "success",
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await api.post("/api/payment-submission-fixes/submit-payment", {
            payment_id: paymentId,
            customer_id: customerId,
            payer_name: payerName,
            amount_paid: amountPaid,
            file_url: fileUrl,
          });
          setSubmitted(true);
          onSubmitted?.(res.data);
        } catch (err) {
          alert("Failed: " + (err.response?.data?.detail || err.message));
        }
        setSubmitting(false);
      },
    });
  };

  return (
    <button onClick={handleClick} disabled={submitting || submitted} data-testid="submit-payment-guarded-btn"
      className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50">
      {submitted ? "Payment Submitted" : submitting ? "Submitting..." : "Submit Payment"}
    </button>
  );
}
