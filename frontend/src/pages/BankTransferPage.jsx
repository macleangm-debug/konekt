import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Copy, CheckCircle2, Upload, FileText, X } from "lucide-react";
import { paymentApi } from "../lib/paymentApi";
import { uploadApi } from "../lib/uploadApi";

export default function BankTransferPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofFilename, setProofFilename] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [uploading, setUploading] = useState(false);
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

  const uploadProof = async () => {
    if (!proofFile) return;

    try {
      setUploading(true);
      const res = await uploadApi.uploadPaymentProof({
        paymentId: payment.id,
        customerEmail: payment.customer_email,
        file: proofFile,
      });

      setProofUrl(res.data.file.url);
      setProofFilename(res.data.file.filename);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to upload proof");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofUrl("");
      setProofFilename("");
    }
  };

  const clearFile = () => {
    setProofFile(null);
    setProofUrl("");
    setProofFilename("");
  };

  const markSubmitted = async () => {
    try {
      setSubmitting(true);
      await paymentApi.markBankTransferSubmitted({
        payment_id: payment.id,
        proof_url: proofUrl || null,
        proof_filename: proofFilename || null,
        transaction_reference: transactionReference || null,
      });

      navigate("/payment/pending", {
        state: {
          provider: "bank_transfer",
          payment: {
            ...payment,
            status: "payment_submitted",
            reference: payment.reference,
          },
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

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bank Transaction Reference
              </label>
              <input
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Enter the reference from your bank receipt"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                data-testid="transaction-reference-input"
              />
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Proof of Payment
              </label>
              
              {!proofFile && !proofUrl && (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="proof-file-input"
                  />
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#D4A843] transition-colors">
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">
                      Click or drag to upload your payment receipt
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supported: Images, PDF (max 10MB)
                    </p>
                  </div>
                </div>
              )}

              {proofFile && !proofUrl && (
                <div className="rounded-xl bg-slate-50 border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#2D3E50]" />
                      <div>
                        <p className="font-medium text-sm">{proofFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(proofFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearFile}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={uploadProof}
                    disabled={uploading}
                    className="mt-3 w-full rounded-lg bg-[#D4A843] text-[#2D3E50] px-4 py-2 font-medium text-sm disabled:opacity-50"
                    data-testid="upload-proof-btn"
                  >
                    {uploading ? "Uploading..." : "Upload File"}
                  </button>
                </div>
              )}

              {proofUrl && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-medium text-emerald-800">Proof uploaded</p>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-emerald-700 underline"
                      >
                        {proofFilename || "View proof"}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-sm text-emerald-700 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
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

            {/* Post-checkout referral CTA (Growth Loop 3) */}
            <div className="mt-4 rounded-xl border bg-gradient-to-r from-[#20364D]/5 to-[#D4A843]/5 p-4" data-testid="post-checkout-referral-cta">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A843]/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2D3E50]">
                    Invite others and earn rewards
                  </p>
                  <p className="text-xs text-slate-500">
                    Share your referral link and earn when others complete purchases.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/account/referrals")}
                  className="shrink-0 rounded-lg bg-[#D4A843] px-3 py-1.5 text-xs font-semibold text-[#20364D] hover:bg-[#c49a3d] transition"
                  data-testid="post-checkout-referral-btn"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
