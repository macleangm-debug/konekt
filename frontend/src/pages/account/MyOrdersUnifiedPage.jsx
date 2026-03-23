import React, { useState } from "react";
import CustomerEmptyStateCard from "../../components/account/CustomerEmptyStateCard";

export default function MyOrdersUnifiedPage() {
  const [tab, setTab] = useState("all");
  const items = [];

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">My Orders</div>
        <div className="text-slate-600 mt-2">Products and services live together here for a simpler customer experience.</div>
      </div>

      <div className="inline-flex rounded-xl border bg-white p-1">
        {["all", "products", "services"].map((x) => (
          <button key={x} type="button" onClick={() => setTab(x)} className={`px-4 py-2 rounded-lg font-medium ${tab === x ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}>
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>

      {!items.length ? (
        <CustomerEmptyStateCard
          title="No orders yet"
          message="Nothing has hit the runway yet. Browse products or services and let’s get your first order moving."
          buttonLabel="Browse Now"
          buttonHref="/account/marketplace"
        />
      ) : null}
    </div>
  );
}
