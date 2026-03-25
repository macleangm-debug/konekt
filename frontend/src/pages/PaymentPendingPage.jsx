import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Clock, CheckCircle2, Building2, Smartphone } from "lucide-react";

export default function PaymentPendingPage() {
  const location = useLocation();
  const provider = location.state?.provider;
  const payment = location.state?.payment;
  const bankDetails = location.state?.bankDetails;

  const isBankTransfer = provider === "bank_transfer";
  const isMobileMoney = provider === "kwikpay";

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-6" data-testid="payment-pending-page">
      <div className="max-w-xl w-full rounded-3xl border bg-white p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 mx-auto flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-700" />
        </div>

        <h1 className="text-3xl font-bold mt-6">Payment Pending</h1>
        
        <p className="mt-3 text-slate-600">
          {isMobileMoney && (
            <>Complete the mobile money payment on your phone. We'll update your order automatically once payment is confirmed.</>
          )}
          {isBankTransfer && (
            <>Your bank transfer has been submitted and is awaiting verification by our team.</>
          )}
        </p>

        {/* Payment Details */}
        <div className="rounded-2xl bg-slate-50 border p-5 mt-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            {isMobileMoney && <Smartphone className="w-5 h-5 text-[#D4A843]" />}
            {isBankTransfer && <Building2 className="w-5 h-5 text-[#2D3E50]" />}
            <span className="font-semibold capitalize">{provider?.replace("_", " ")}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-medium">{payment?.status || "pending"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reference</span>
              <span className="font-mono text-xs">{payment?.reference || "-"}</span>
            </div>
            {payment?.amount && (
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold">
                  {payment.currency || "TZS"} {Number(payment.amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* What's Next */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 mt-6 text-left">
          <h3 className="font-semibold text-blue-900">What happens next?</h3>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            {isMobileMoney && (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Check your phone for the payment prompt</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Enter your PIN to confirm payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Your order will be confirmed automatically</span>
                </li>
              </>
            )}
            {isBankTransfer && (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Our team will verify your bank transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>This usually takes 1-2 business hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>You'll receive email confirmation once verified</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link 
            to="/dashboard" 
            className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
          >
            Go to Dashboard
          </Link>
          <Link 
            to="/products" 
            className="rounded-xl border px-6 py-3 font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
