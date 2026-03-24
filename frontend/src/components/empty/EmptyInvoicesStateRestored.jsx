import React from "react";
import { Link } from "react-router-dom";

export default function EmptyInvoicesStateRestored() {
  return (
    <div className="rounded-[2rem] border bg-white p-10 text-center">
      <div className="text-3xl">💳</div>
      <div className="text-2xl font-bold text-[#20364D] mt-4">No invoices yet</div>
      <div className="text-slate-600 mt-3">Paid product orders and approved service quotes create invoices here.</div>
      <Link to="/account/marketplace?tab=products" className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Continue Shopping</Link>
    </div>
  );
}
