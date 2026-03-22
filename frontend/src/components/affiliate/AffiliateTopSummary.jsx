import React from "react";

const cards = [
  { key: "clicks", label: "Total Clicks" },
  { key: "leads", label: "Leads" },
  { key: "sales", label: "Successful Sales" },
  { key: "earned", label: "Commission Earned" },
  { key: "pending", label: "Pending Payout" },
  { key: "paid", label: "Paid Out" },
];

export default function AffiliateTopSummary({ metrics }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.key} className="rounded-[2rem] border bg-white p-5">
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className="text-3xl font-bold text-[#20364D] mt-3">
            {metrics?.[card.key] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
