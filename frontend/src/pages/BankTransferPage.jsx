import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Copy, CheckCircle2, Upload, FileText, X, Camera } from "lucide-react";
import { paymentApi } from "../lib/paymentApi";
import liveCommerceApi from "../lib/liveCommerceApi";
import uploadApi from "../lib/uploadApi";

export default function BankTransferPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofFilename, setProofFilename] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState("");

  const isLiveFlow = Boolean(data?.liveFlow);
  const payment = data?.payment;
  const bankDetails = useMemo(() => {
    const details = data?.bank_details || data?.bankDetails;
    if (details) return details;
    return {
      bank_name: "CRDB BANK",
      account_name: "KONEKT LIMITED",
      account_number: "015C8841347002",
      branch: "Main Branch",
      swift_code: "CORUTZTZ",
      currency: "TZS",
      amount: payment?.amount_due || payment?.amount || 0,
    };
  }, [data, payment]);

  if (!payment || !bankDetails) {
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

  const amountToPay = Number(bankDetails.amount || payment?.amount_due || payment?.amount || 0);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text || "");
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  const uploadProof = async () => {
    if (!proofFile) return;
    try {
      setUploading(true);
      const res = await uploadApi.uploadPaymentProof({
        paymentId: payment.id || payment._id,
        customerEmail: payment.customer_email || data?.invoice?.customer_email || "",
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

  const [payerName, setPayerName] = useState("");
  const [errors, setErrors] = useState({});
  const payerNameRef = React.useRef(null);

  const markSubmitted = async () => {
    const newErrors = {};
    if (!payerName.trim()) newErrors.payerName = "Enter the name used when making the transfer so Finance can verify your payment.";
    if (!proofUrl) newErrors.proof = "Upload your payment proof before submitting.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.payerName && payerNameRef.current) {
        payerNameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        payerNameRef.current.focus();
      }
      return;
    }

    try {
      setSubmitting(true);
      if (isLiveFlow) {
        await liveCommerceApi.submitPaymentProof(payment.id, {
          amount_paid: amountToPay,
          file_url: proofUrl,
          payer_name: payerName.trim(),
          customer_email: payment.customer_email || data?.invoice?.customer_email || "",
        });
      } else {
        await paymentApi.markBankTransferSubmitted({
          payment_id: payment.id || payment._id,
          proof_url: proofUrl || null,
          proof_filename: proofFilename || null,
          payer_name: payerName.trim(),
        });
      }

      navigate("/payment/pending", {
        state: {
          provider: "bank_transfer",
          payment: {
            ...payment,
            status: "under_review",
            amount: amountToPay,
            amount_due: amountToPay,
          },
          bankDetails,
          invoice: data?.invoice,
          liveFlow: isLiveFlow,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to submit bank transfer confirmation");
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
              <p className="text-slate-600">Use the details below to make your payment</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-8">
          <h2 className="text-xl font-bold mb-6">Bank Details</h2>

          <div className="space-y-0">
            <BankDetailRow label="Bank" value={bankDetails.bank_name} />
            <BankDetailRow label="Account Name" value={bankDetails.account_name} copyable />
            <BankDetailRow label="Account Number" value={bankDetails.account_number} copyable />
            <BankDetailRow label="Branch" value={bankDetails.branch} />
            {bankDetails.swift_code && <BankDetailRow label="SWIFT Code" value={bankDetails.swift_code} copyable />}
          </div>

          <div className="mt-6 rounded-xl bg-[#2D3E50] text-white p-6">
            <div className="text-lg">Amount to Pay</div>
            <div className="text-3xl font-bold mt-2">
              {bankDetails.currency || "TZS"} {amountToPay.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-8">
          <h2 className="text-xl font-bold mb-4">Submit Proof of Payment</h2>
          <p className="text-slate-600 mb-4">
            After making the transfer, upload the receipt or take a photo. Your payment will move to <strong>Under Review</strong> until finance approves it.
          </p>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm text-amber-800">
            Orders are created only after finance approval. Sales cannot approve payments.
          </div>

          <div className="space-y-5">
            {/* Payer Name - above proof upload per spec */}
            <div ref={payerNameRef}>
              <label className="block text-sm font-bold text-[#20364D] mb-1">Name on Bank Transfer</label>
              <p className="text-xs text-slate-500 mb-2">Enter the name used when making the transfer so Finance can verify your payment.</p>
              <input
                type="text"
                value={payerName}
                onChange={(e) => { setPayerName(e.target.value); setErrors((p) => ({ ...p, payerName: "" })); }}
                placeholder="e.g. John M. Kassim / ABC Ltd"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#20364D]/20 ${errors.payerName ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                data-testid="payer-name-input"
              />
              {errors.payerName && <p className="text-xs text-red-600 mt-1">{errors.payerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Proof of Payment
              </label>
              {errors.proof && !proofUrl && <p className="text-xs text-red-600 mb-2">{errors.proof}</p>}

              {!proofFile && !proofUrl && (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="proof-file-input"
                  />
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#D4A843] transition-colors">
                    <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Click to upload or use your camera on mobile</p>
                    <p className="text-xs text-slate-400 mt-1">Supported: Images, PDF (max 10MB)</p>
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
                        <p className="text-xs text-slate-500">{(proofFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={clearFile} className="p-1 hover:bg-slate-200 rounded">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
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
                      <a href={proofUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
                        {proofFilename || "View proof"}
                      </a>
                    </div>
                    <button type="button" onClick={clearFile} className="text-sm text-emerald-700 underline">
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={markSubmitted}
              disabled={submitting || !proofUrl || !payerName.trim()}
              className="w-full rounded-xl bg-[#2D3E50] text-white px-5 py-4 font-semibold disabled:opacity-50 transition-colors hover:bg-[#1e2d3d]"
              data-testid="confirm-transfer-btn"
            >
              {submitting ? "Submitting..." : "Submit for Finance Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
