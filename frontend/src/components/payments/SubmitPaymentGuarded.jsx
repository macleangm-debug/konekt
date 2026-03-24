import React, { useState } from "react";
import api from "../../lib/api";
import ConfirmActionModal from "../common/ConfirmActionModal";

export default function SubmitPaymentGuarded({ paymentId, customerId, payerName, amountPaid, fileUrl, onSubmitted }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
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
      setConfirmOpen(false);
      onSubmitted?.(res.data);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  return (
    <>
      <button onClick={() => setConfirmOpen(true)} disabled={submitting || submitted} data-testid="submit-payment-guarded-btn"
        className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50">
        {submitted ? "Payment Submitted" : submitting ? "Submitting..." : "Submit Payment"}
      </button>

      <ConfirmActionModal
        open={confirmOpen}
        title="Submit Payment?"
        message="Please confirm you want to submit this payment proof. After submission, the button will be locked to avoid duplicate submissions."
        confirmLabel="Yes, Submit"
        onConfirm={submit}
        onClose={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </>
  );
}
