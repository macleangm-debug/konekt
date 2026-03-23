import React from "react";
import { LayoutGrid, List } from "lucide-react";

export default function TableCardToggle({ value = "table", onChange }) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1" data-testid="table-card-toggle">
      <button 
        type="button" 
        onClick={() => onChange("table")} 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
          value === "table" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"
        }`}
        data-testid="toggle-table"
      >
        <List className="w-4 h-4" />
        Table
      </button>
      <button 
        type="button" 
        onClick={() => onChange("card")} 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
          value === "card" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"
        }`}
        data-testid="toggle-card"
      >
        <LayoutGrid className="w-4 h-4" />
        Cards
      </button>
    </div>
  );
}
