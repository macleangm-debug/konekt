import React from "react";
import CustomerPrimaryActions from "../../components/account/CustomerPrimaryActions";

export default function AccountServicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Services</div>
        <div className="text-slate-600 mt-2">Explore service categories and request support without leaving your account workspace.</div>
      </div>
      <CustomerPrimaryActions />
      <div className="rounded-[2rem] border bg-white p-10 text-slate-600">
        Plug your existing service discovery grid here so the customer remains inside the account shell.
      </div>
    </div>
  );
}
