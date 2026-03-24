import React from "react";
import { LayoutList, LayoutGrid } from "lucide-react";

export default function TableCardToggle({ view, setView }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" data-testid="table-card-toggle">
      <button
        data-testid="view-table"
        onClick={() => setView("table")}
        className={`px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors ${view === "table" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"}`}
      >
        <LayoutList size={14} /> Table
      </button>
      <button
        data-testid="view-cards"
        onClick={() => setView("card")}
        className={`px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors ${view === "card" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"}`}
      >
        <LayoutGrid size={14} /> Cards
      </button>
    </div>
  );
}
