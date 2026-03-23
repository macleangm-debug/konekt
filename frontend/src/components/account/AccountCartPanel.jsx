import React from "react";
import { Link } from "react-router-dom";

export default function AccountCartPanel({ items = [], onRemove }) {
  const total = items.reduce((sum, item) => sum + (item.numericPrice || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Cart</div>

        <div className="space-y-4 mt-6">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[#20364D]">{item.name}</div>
                <div className="text-sm text-slate-500 mt-1">{item.price}</div>
              </div>
              <button type="button" onClick={() => onRemove?.(item.id)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-red-600">
                Remove
              </button>
            </div>
          ))}
          {!items.length ? <div className="text-slate-500">Your cart is empty.</div> : null}
        </div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="flex items-center justify-between">
          <div className="text-slate-500">Estimated Total</div>
          <div className="text-2xl font-bold text-[#20364D]">TZS {total.toLocaleString()}</div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-6">
          <Link to="/account/checkout" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold text-center">
            Proceed to Checkout
          </Link>
          <Link to="/account/assisted-cart" className="rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 font-semibold text-center">
            Let Sales Assist Me
          </Link>
        </div>
      </div>
    </div>
  );
}
