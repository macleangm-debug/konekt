import React from "react";

export default function ServicePartnerCapabilityTable({ rows, onEdit, onDelete }) {
  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="service-partner-capability-table">
      <div className="text-2xl font-bold text-[#20364D]">Existing Mappings</div>

      <div className="space-y-4 mt-6">
        {rows.map((row) => (
          <div key={row.id} data-testid={`mapping-row-${row.id}`} className="rounded-2xl border bg-slate-50 p-5">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-[#20364D]" data-testid="partner-name">{row.partner_name}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {row.service_name} • {row.country_code} • {row.capability_status}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span data-testid="priority-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                    Priority {row.priority_rank}
                  </span>
                  <span data-testid="quality-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                    Quality {row.quality_score}
                  </span>
                  <span data-testid="turnaround-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                    Turnaround {row.avg_turnaround_days}d
                  </span>
                  <span data-testid="success-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                    Success {row.success_rate}%
                  </span>
                  <span data-testid="queue-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                    Queue {row.current_active_queue}
                  </span>
                  {row.preferred_routing ? (
                    <span data-testid="preferred-routing-tag" className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Preferred Routing
                    </span>
                  ) : null}
                </div>

                <div className="text-sm text-slate-600 mt-4">
                  Regions: {(row.regions || []).join(", ") || "—"}
                </div>
                {row.notes ? (
                  <div className="text-sm text-slate-600 mt-2">
                    Notes: {row.notes}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button data-testid={`edit-btn-${row.id}`} type="button" onClick={() => onEdit(row)} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">
                  Edit
                </button>
                <button data-testid={`remove-btn-${row.id}`} type="button" onClick={() => onDelete(row)} className="rounded-xl bg-red-600 text-white px-4 py-3 font-semibold">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {!rows.length ? (
          <div data-testid="no-mappings-message" className="rounded-2xl border bg-slate-50 p-6 text-slate-600">
            No service-partner mappings yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
