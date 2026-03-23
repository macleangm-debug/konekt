import React from "react";

export default function PartnerUnifiedTable({ rows = [] }) {
  return (
    <div className="rounded-[2rem] border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-500">
              <th className="px-5 py-4">Partner</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Specific Services</th>
              <th className="px-5 py-4">Priority</th>
              <th className="px-5 py-4">Quality</th>
              <th className="px-5 py-4">Turnaround</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-5 py-4">
                  <div className="font-semibold text-[#20364D]">{row.name}</div>
                  <div className="text-sm text-slate-500">{row.email || ""}</div>
                </td>
                <td className="px-5 py-4 capitalize">{row.partner_type}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{(row.specific_services || []).join(", ") || "—"}</td>
                <td className="px-5 py-4 capitalize">{row.routing_priority || "medium"}</td>
                <td className="px-5 py-4">{row.quality_score || "—"}</td>
                <td className="px-5 py-4">{row.turnaround_days ? `${row.turnaround_days} days` : "—"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                    {row.status || "active"}
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={7} className="px-5 py-8 text-slate-500">No partners available.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
