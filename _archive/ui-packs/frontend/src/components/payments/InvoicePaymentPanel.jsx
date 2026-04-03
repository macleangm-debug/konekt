import React from "react";

export default function InvoicePaymentPanel({
  invoice,
  onUploadProof,
}) {
  if (!invoice) return null;

  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-3xl font-bold text-[#20364D]">Pay Invoice</div>
          <p className="text-slate-600 mt-3">
            This payment flow is tied directly to invoice {invoice.invoice_number}. No manual invoice ID entry is needed.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F4E7BF] text-[#8B6A10] px-4 py-2 text-sm font-semibold">
          Bank Transfer Only
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_0.95fr] gap-6 mt-8">
        <div className="rounded-3xl bg-slate-50 p-6">
          <div className="text-xl font-bold text-[#20364D]">Invoice summary</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
            <div><strong>Customer:</strong> {invoice.customer_name}</div>
            <div><strong>Amount Due:</strong> {invoice.currency} {Number(invoice.amount_due || 0).toLocaleString()}</div>
            <div><strong>Status:</strong> {invoice.status}</div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-xl font-bold text-[#20364D]">Bank transfer details (Tanzania)</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div><strong>Account Name:</strong> KONEKT LIMITED</div>
            <div><strong>Account Number:</strong> 015C8841347002</div>
            <div><strong>Bank:</strong> CRDB BANK</div>
            <div><strong>SWIFT:</strong> CORUTZTZ</div>
          </div>

          <div className="rounded-2xl border bg-slate-50 px-4 py-4 mt-6 text-sm text-slate-600">
            Please make payment using the details above and include your invoice number as the payment reference.
            After payment, upload your proof so our finance team can verify it quickly.
          </div>

          <button
            type="button"
            onClick={onUploadProof}
            className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            Upload Payment Proof
          </button>
        </div>
      </div>
    </div>
  );
}
