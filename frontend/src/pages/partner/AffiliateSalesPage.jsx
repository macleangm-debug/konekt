import React from "react";
import AffiliateSalesTable from "../../components/affiliate/AffiliateSalesTable";

const sales = [
  {
    id: "1",
    date: "2026-03-10",
    customer_masked: "Ac*** Ltd",
    item_name: "Office Branding",
    order_value: "TZS 650,000",
    commission: "TZS 18,000",
    status: "pending",
  },
  {
    id: "2",
    date: "2026-03-08",
    customer_masked: "Be*** Group",
    item_name: "Branded Lanyards",
    order_value: "TZS 220,000",
    commission: "TZS 8,500",
    status: "paid",
  },
];

export default function AffiliateSalesPage() {
  return (
    <div className="space-y-8">
      <div className="text-4xl font-bold text-[#20364D]">Affiliate Sales</div>
      <AffiliateSalesTable rows={sales} />
    </div>
  );
}
