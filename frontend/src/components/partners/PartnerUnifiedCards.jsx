import React from "react";

export default function PartnerUnifiedCards({ rows = [] }) {
  return (
    <div className="grid xl:grid-cols-2 gap-5">
      {rows.map((row) => (
        <div key={row.id} className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-[#20364D]">{row.name}</div>
              <div className="text-sm text-slate-500 mt-1">{row.email || ""}</div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
              {row.status || "active"}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Type</div>
              <div className="font-semibold text-[#20364D] mt-2 capitalize">{row.partner_type}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Priority</div>
              <div className="font-semibold text-[#20364D] mt-2 capitalize">{row.routing_priority || "medium"}</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 mt-4">
            <div className="text-xs text-slate-500">Specific Services</div>
            <div className="text-sm text-slate-700 mt-2">{(row.specific_services || []).join(", ") || "—"}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Quality</div>
              <div className="font-semibold text-[#20364D] mt-2">{row.quality_score || "—"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Turnaround</div>
              <div className="font-semibold text-[#20364D] mt-2">{row.turnaround_days ? `${row.turnaround_days} days` : "—"}</div>
            </div>
          </div>
        </div>
      ))}
      {!rows.length ? <div className="text-slate-500">No partners available.</div> : null}
    </div>
  );
}
