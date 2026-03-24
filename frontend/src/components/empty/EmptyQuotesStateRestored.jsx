import React from "react";
import { Link } from "react-router-dom";

export default function EmptyQuotesStateRestored() {
  return (
    <div className="rounded-[2rem] border bg-white p-10 text-center">
      <div className="text-3xl">🧾</div>
      <div className="text-2xl font-bold text-[#20364D] mt-4">No quotes yet</div>
      <div className="text-slate-600 mt-3">Service quotes and custom requests will appear here.</div>
      <div className="flex items-center justify-center gap-3 mt-6">
        <Link to="/account/marketplace?tab=services" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Request Service</Link>
        <Link to="/account/marketplace?tab=promo" className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]">Browse Promotional Materials</Link>
      </div>
    </div>
  );
}
