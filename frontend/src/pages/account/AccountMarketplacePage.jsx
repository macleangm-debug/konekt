import React from "react";
import CustomerPrimaryActions from "../../components/account/CustomerPrimaryActions";

export default function AccountMarketplacePage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Marketplace</div>
        <div className="text-slate-600 mt-2">Browse products without leaving your account workspace.</div>
      </div>
      <CustomerPrimaryActions />
      <div className="rounded-[2rem] border bg-white p-10 text-slate-600">
        Plug your existing marketplace grid here so the customer remains inside the account shell.
      </div>
    </div>
  );
}
