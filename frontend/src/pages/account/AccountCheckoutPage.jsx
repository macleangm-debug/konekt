import React from "react";
import { Link } from "react-router-dom";

export default function AccountCheckoutPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Checkout</div>
        <div className="text-slate-600 mt-2">Complete your order without leaving your account shell.</div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-[2rem] border bg-white p-8 space-y-4">
          <div className="text-2xl font-bold text-[#20364D]">Delivery & Contact</div>
          <input className="w-full border rounded-xl px-4 py-3" placeholder="Delivery address" />
          <input className="w-full border rounded-xl px-4 py-3" placeholder="Contact phone" />
          <textarea className="w-full min-h-[120px] border rounded-xl px-4 py-3" placeholder="Extra delivery notes" />
        </div>

        <div className="rounded-[2rem] border bg-white p-8 space-y-4">
          <div className="text-2xl font-bold text-[#20364D]">Order Summary</div>
          <div className="flex justify-between text-slate-600"><span>Estimated Total</span><span>TZS 545,000</span></div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Payment will continue using your bank transfer flow and payment proof process.
          </div>
          <Link to="/dashboard/invoices" className="block rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold text-center">
            Continue to Invoice
          </Link>
        </div>
      </div>
    </div>
  );
}
