import React from "react";
import CustomerPrimaryActions from "../../components/account/CustomerPrimaryActions";
import CustomerEmptyStateCard from "../../components/account/CustomerEmptyStateCard";

export default function CustomerDashboardV2() {
  return (
    <div className="space-y-8">
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-10">
        <div className="text-4xl font-bold">Welcome back</div>
        <div className="text-slate-200 mt-3 max-w-2xl">
          Order products, request services, or let the Konekt team prepare a quote for you — all from inside your account.
        </div>
        <div className="mt-6">
          <CustomerPrimaryActions />
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="rounded-[2rem] border bg-white p-6"><div className="text-sm text-slate-500">Open Quotes</div><div className="text-3xl font-bold text-[#20364D] mt-3">0</div></div>
        <div className="rounded-[2rem] border bg-white p-6"><div className="text-sm text-slate-500">Active Orders</div><div className="text-3xl font-bold text-[#20364D] mt-3">0</div></div>
        <div className="rounded-[2rem] border bg-white p-6"><div className="text-sm text-slate-500">Invoices</div><div className="text-3xl font-bold text-[#20364D] mt-3">0</div></div>
      </div>

      <CustomerEmptyStateCard
        title="Nothing cooking yet"
        message="Your dashboard is a little too calm right now. Browse products, request a service, or ask sales to prepare a quote for you."
        buttonLabel="Start Ordering"
        buttonHref="/account/marketplace"
      />
    </div>
  );
}
