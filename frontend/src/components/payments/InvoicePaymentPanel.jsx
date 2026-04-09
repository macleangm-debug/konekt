import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function InvoicePaymentPanel({
  invoice,
  onUploadProof,
}) {
  const [bankInfo, setBankInfo] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/public/payment-info`).then(r => {
      if (r.data) setBankInfo(r.data);
    }).catch(() => {});
  }, []);

  if (!invoice) return null;

  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="invoice-payment-panel">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="text-3xl font-bold text-[#20364D]">Pay Invoice</div>
          <p className="text-slate-600 mt-3">
            This payment flow is tied directly to invoice {invoice.invoice_number}. No manual invoice ID entry is needed.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F4E7BF] text-[#8B6A10] px-4 py-2 text-sm font-semibold whitespace-nowrap">
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
            <div><strong>Status:</strong> <span className="capitalize">{invoice.status}</span></div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-xl font-bold text-[#20364D]">Bank transfer details</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div><strong>Account Name:</strong> {bankInfo?.account_name || "—"}</div>
            <div><strong>Account Number:</strong> {bankInfo?.account_number || "—"}</div>
            <div><strong>Bank:</strong> {bankInfo?.bank_name || "—"}</div>
            <div><strong>SWIFT:</strong> {bankInfo?.swift_code || "—"}</div>
          </div>

          <div className="rounded-2xl border bg-slate-50 px-4 py-4 mt-6 text-sm text-slate-600">
            Please make payment using the details above and include your invoice number as the payment reference.
            After payment, upload your proof so our finance team can verify it quickly.
          </div>

          <button
            type="button"
            onClick={onUploadProof}
            data-testid="upload-proof-btn"
            className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition"
          >
            Upload Payment Proof
          </button>
        </div>
      </div>

      {/* Payment Methods Overview */}
      <div className="mt-8 rounded-3xl border bg-slate-50 p-6">
        <div className="text-lg font-bold text-[#20364D] mb-4">Available Payment Methods</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#20364D]">Bank Transfer</span>
              <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">Active</span>
            </div>
            <p className="text-slate-500 text-sm mt-2">Direct bank deposit or wire transfer</p>
          </div>
          <div className="rounded-2xl border bg-slate-100 p-4 opacity-60">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Mobile Money</span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">Coming Soon</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">M-Pesa, Tigo Pesa, Airtel Money</p>
          </div>
          <div className="rounded-2xl border bg-slate-100 p-4 opacity-60">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Card Payment</span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">Coming Soon</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Visa, Mastercard</p>
          </div>
          <div className="rounded-2xl border bg-slate-100 p-4 opacity-60">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">KwikPay</span>
              <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-1 text-xs font-medium">Not Available</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Pending integration</p>
          </div>
        </div>
      </div>
    </div>
  );
}
