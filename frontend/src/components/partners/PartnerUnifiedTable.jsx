import React from "react";
import { Star } from "lucide-react";

const statusBg = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  paused: "bg-amber-50 text-amber-700",
  pending_approval: "bg-blue-50 text-blue-700",
};

const typeBadge = {
  product_supplier: "bg-blue-50 text-blue-700 border-blue-200",
  service_provider: "bg-violet-50 text-violet-700 border-violet-200",
  logistics_partner: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const typeLabel = {
  product_supplier: "Product",
  service_provider: "Service",
  logistics_partner: "Logistics",
};

export default function PartnerUnifiedTable({ rows = [], onRowClick }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" data-testid="partner-table">
      <table className="w-full table-fixed">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
            <th className="px-4 py-3 w-[28%]">Partner</th>
            <th className="px-4 py-3 w-[12%]">Type</th>
            <th className="px-4 py-3 w-[14%]">Classification</th>
            <th className="px-4 py-3 w-[10%] text-center">Priority</th>
            <th className="px-4 py-3 w-[8%] text-center">Score</th>
            <th className="px-4 py-3 w-[16%]">Regions</th>
            <th className="px-4 py-3 w-[12%] text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t hover:bg-slate-50/50 transition cursor-pointer"
              onClick={() => onRowClick?.(row)}
              data-testid={`partner-row-${row.id}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  {row.preferred_partner && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 fill-amber-400" />}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#20364D] truncate">{row.name}</div>
                    <div className="text-xs text-slate-400 truncate">{row.contact_person || row.email || ""}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-medium capitalize text-slate-600">{(row.partner_type || "").replace(/_/g, " ")}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeBadge[row.vendor_type] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  {typeLabel[row.vendor_type] || (row.vendor_type || "product").replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-medium capitalize text-slate-600">{row.routing_priority || "medium"}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-slate-700">{row.quality_score || "-"}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-500 truncate block">{row.region_coverage || (row.regions || []).join(", ") || "-"}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBg[row.status] || statusBg.active}`}>
                  {(row.status || "active").replace(/_/g, " ")}
                </span>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No partners available.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
