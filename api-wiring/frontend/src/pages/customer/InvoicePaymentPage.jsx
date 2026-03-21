import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function InvoicePaymentPage() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({
    amount_paid: "",
    payment_date: "",
    transaction_reference: "",
    proof_url: "",
    note: "",
  });

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/api/invoices/${invoiceId}`);
      setInvoice(res.data);
      setForm((p) => ({
        ...p,
        amount_paid: res.data?.amount_due || "",
      }));
    };
    load();
  }, [invoiceId]);

  const submitProof = async (e) => {
    e.preventDefault();
    await api.post("/api/payment-proofs", {
      invoice_id: invoice?.id || invoiceId,
      invoice_number: invoice?.invoice_number,
      amount_paid: Number(form.amount_paid || 0),
      payment_date: form.payment_date,
      transaction_reference: form.transaction_reference,
      proof_url: form.proof_url,
      note: form.note,
    });
    alert("Payment proof submitted and linked to invoice automatically.");
    setShowUpload(false);
  };

  if (!invoice) return <div className="p-10">Loading invoice payment...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoice Payment"
        subtitle="Pay this invoice using bank transfer and upload proof without entering an invoice ID manually."
      />

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
              <div><strong>Customer:</strong> {invoice.customer_name || invoice.customer_email}</div>
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
              onClick={() => setShowUpload(true)}
              className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
            >
              Upload Payment Proof
            </button>
          </div>
        </div>
      </div>

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
