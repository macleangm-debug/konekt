import React from "react";
import CartDrawerCompleteFlow from "../../components/cart/CartDrawerCompleteFlow";

export default function PaymentFlowDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Customer Payment Flow Demo</div>
        <div className="text-slate-600 mt-2">Use this to test the full fixed-price product flow: cart -> checkout -> payment -> order/invoice/payment records.</div>
      </div>
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-lg font-bold text-[#20364D]">Open cart and complete the flow from the top bar.</div>
        <div className="text-slate-500 mt-2">This page is just a test anchor for the complete flow pack.</div>
      </div>
      <CartDrawerCompleteFlow />
    </div>
  );
}
