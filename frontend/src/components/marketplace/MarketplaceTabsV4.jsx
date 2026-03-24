import React from "react";

export default function MarketplaceTabsV4({ tab, setTab }) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1">
      <button onClick={() => setTab("products")} className={`px-4 py-2 rounded-lg font-medium ${tab === "products" ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}>Products</button>
      <button onClick={() => setTab("services")} className={`px-4 py-2 rounded-lg font-medium ${tab === "services" ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}>Services</button>
      <button onClick={() => setTab("promo")} className={`px-4 py-2 rounded-lg font-medium ${tab === "promo" ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}>Promotional Materials</button>
    </div>
  );
}
