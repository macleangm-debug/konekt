import React, { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import InvoicePaymentPanel from "../../components/payments/InvoicePaymentPanel";

const mockInvoice = {
  id: "inv_001",
  invoice_number: "KON-INV-25-000134",
  customer_name: "Acme Supplies Ltd",
  currency: "TZS",
  amount_due: 350000,
  status: "issued",
};

export default function InvoicePaymentPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({
    amount_paid: "",
    payment_date: "",
    transaction_reference: "",
    proof_url: "",
    note: "",
  });

  const submitProof = (e) => {
    e.preventDefault();
    alert("Payment proof submitted and linked to invoice automatically.");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoice Payment"
        subtitle="Pay this invoice using bank transfer and upload proof without entering an invoice ID manually."
      />

      <InvoicePaymentPanel
        invoice={mockInvoice}
        onUploadProof={() => setShowUpload(true)}
      />

      {showUpload ? (
        <form onSubmit={submitProof} className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Upload Payment Proof</div>
          <div className="grid gap-4 mt-6">
            <input className="border rounded-xl px-4 py-3" placeholder="Amount paid" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
            <input type="date" className="border rounded-xl px-4 py-3" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Transaction reference" value={form.transaction_reference} onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Proof file URL / uploaded file path" value={form.proof_url} onChange={(e) => setForm({ ...form, proof_url: e.target.value })} />
            <textarea className="border rounded-xl px-4 py-3 min-h-[120px]" placeholder="Optional note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <button type="submit" className="mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold">
            Submit Proof
          </button>
        </form>
      ) : null}
    </div>
  );
}
