import React from "react";
import { Building2, CreditCard, Smartphone } from "lucide-react";

export default function PaymentMethodSelector({
  paymentConfig,
  selectedMethod,
  onChange,
}) {
  const bankEnabled = paymentConfig?.methods?.bank_transfer_enabled ?? paymentConfig?.bank_transfer_enabled ?? true;
  const kwikpayEnabled = paymentConfig?.methods?.kwikpay_enabled ?? paymentConfig?.kwikpay_enabled ?? false;
  const mobileMoneyEnabled = paymentConfig?.methods?.mobile_money_enabled ?? paymentConfig?.mobile_money_enabled ?? false;

  return (
    <div className="space-y-3" data-testid="payment-method-selector">
      {bankEnabled ? (
        <button
          type="button"
          onClick={() => onChange("bank_transfer")}
          className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
            selectedMethod === "bank_transfer"
              ? "border-[#20364D] bg-slate-50 ring-2 ring-[#20364D]/20"
              : "bg-white hover:border-slate-300"
          }`}
          data-testid="payment-method-bank"
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#20364D]" />
            <div>
              <div className="font-semibold text-[#20364D]">Bank Transfer</div>
              <div className="text-sm text-slate-500 mt-1">
                Pay using the displayed bank details, then upload payment proof.
              </div>
            </div>
          </div>
        </button>
      ) : null}

      {kwikpayEnabled ? (
        <button
          type="button"
          onClick={() => onChange("kwikpay")}
          className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
            selectedMethod === "kwikpay"
              ? "border-[#20364D] bg-slate-50 ring-2 ring-[#20364D]/20"
              : "bg-white hover:border-slate-300"
          }`}
          data-testid="payment-method-kwikpay"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[#20364D]" />
            <div>
              <div className="font-semibold text-[#20364D]">KwikPay</div>
              <div className="text-sm text-slate-500 mt-1">
                Pay instantly through KwikPay where it is enabled.
              </div>
            </div>
          </div>
        </button>
      ) : null}

      {mobileMoneyEnabled ? (
        <button
          type="button"
          onClick={() => onChange("mobile_money")}
          className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
            selectedMethod === "mobile_money"
              ? "border-[#20364D] bg-slate-50 ring-2 ring-[#20364D]/20"
              : "bg-white hover:border-slate-300"
          }`}
          data-testid="payment-method-mobile-money"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-[#20364D]" />
            <div>
              <div className="font-semibold text-[#20364D]">Mobile Money</div>
              <div className="text-sm text-slate-500 mt-1">
                Pay using M-Pesa, Tigo Pesa, or Airtel Money.
              </div>
            </div>
          </div>
        </button>
      ) : null}

      {!bankEnabled && !kwikpayEnabled && !mobileMoneyEnabled && (
        <div className="rounded-2xl border bg-amber-50 border-amber-200 px-5 py-4 text-amber-800">
          No payment methods are currently available. Please contact support.
        </div>
      )}
    </div>
  );
}
