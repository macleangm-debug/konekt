import React from "react";

export default function PartnerViewToggle({ view = "table", onChange }) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1" data-testid="partner-view-toggle">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-4 py-2 rounded-lg font-medium ${view === "table" ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}
        data-testid="view-toggle-table"
      >
        Table
      </button>
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`px-4 py-2 rounded-lg font-medium ${view === "card" ? "bg-[#20364D] text-white" : "text-[#20364D]"}`}
        data-testid="view-toggle-cards"
      >
        Cards
      </button>
    </div>
  );
}
