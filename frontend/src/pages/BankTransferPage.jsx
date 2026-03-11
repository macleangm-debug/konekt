import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Copy, CheckCircle2 } from "lucide-react";
import { paymentApi } from "../lib/paymentApi";

export default function BankTransferPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  const [proofUrl, setProofUrl] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState("");

  if (!data?.payment || !data?.bank_details) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No bank transfer data found</h1>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 rounded-xl bg-[#2D3E50] text-white px-6 py-3"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const { payment, bank_details } = data;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  const markSubmitted = async () => {
    try {
      setSubmitting(true);
      await paymentApi.markBankTransferSubmitted({
        payment_id: payment.id,
        proof_url: proofUrl || null,
        transaction_reference: transactionReference || null,
      });
      navigate("/payment/pending", {
        state: {
          provider: "bank_transfer",
          payment,
          bankDetails: bank_details,
        },
      });
    } catch (error) {
      console.error(error);
      alert("Failed to submit bank transfer confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  const BankDetailRow = ({ label, value, copyable = false }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        {copyable && value && (
          <button
            type="button"
            onClick={() => copyToClipboard(value, label)}
            className="p-1 rounded hover:bg-slate-100"
          >
            {copied === label ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="bank-transfer-page">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#2D3E50] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Bank Transfer</h1>
              <p className="text-slate-600">
                Use the details below to make your payment
              </p>
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="rounded-3xl border bg-white p-8">
          <h2 className="text-xl font-bold mb-6">Bank Details</h2>
          
          <div className="space-y-0">
            <BankDetailRow label="Bank" value={bank_details.bank_name} />
            <BankDetailRow label="Account Name" value={bank_details.account_name} copyable />
            <BankDetailRow label="Account Number" value={bank_details.account_number} copyable />
            <BankDetailRow label="Branch" value={bank_details.branch} />
            {bank_details.swift_code && (
              <BankDetailRow label="SWIFT Code" value={bank_details.swift_code} copyable />
            )}
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="font-semibold text-amber-800">Payment Reference (Required)</div>
            <div className="mt-2 font-mono text-lg text-amber-900 select-all">
              {bank_details.reference}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bank_details.reference, "reference")}
              className="mt-2 inline-flex items-center gap-2 text-sm text-amber-700"
            >
              {copied === "reference" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Reference
                </>
              )}
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-[#2D3E50] text-white p-6">
            <div className="text-lg">Amount to Pay</div>
            <div className="text-3xl font-bold mt-2">
              {bank_details.currency} {Number(bank_details.amount).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Confirm Transfer */}
        <div className="rounded-3xl border bg-white p-8">
          <h2 className="text-xl font-bold mb-4">Confirm Your Transfer</h2>
          <p className="text-slate-600 mb-6">
            After making the bank transfer, fill in the details below so we can verify your payment faster.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bank Transaction Reference
              </label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Enter the reference from your bank receipt"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                data-testid="transaction-reference-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Proof of Payment URL (Optional)
              </label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Link to receipt screenshot or document"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                data-testid="proof-url-input"
              />
            </div>

            <button
              type="button"
              onClick={markSubmitted}
              disabled={submitting}
              className="w-full rounded-xl bg-[#2D3E50] text-white px-5 py-4 font-semibold disabled:opacity-50"
              data-testid="confirm-transfer-btn"
            >
              {submitting ? "Submitting..." : "I Have Made the Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
