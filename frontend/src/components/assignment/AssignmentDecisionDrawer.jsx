import React, { useEffect, useState } from "react";
import { Box, Truck, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import AssignmentReasonBadge from "./AssignmentReasonBadge";
import api from "../../lib/api";
import StandardDrawerShell from "../ui/StandardDrawerShell";

const TIER_ICONS = {
  1: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  2: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  3: <Box className="h-3.5 w-3.5 text-blue-500" />,
  4: <Truck className="h-3.5 w-3.5 text-indigo-500" />,
  5: <Info className="h-3.5 w-3.5 text-slate-400" />,
  6: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
};

const ENGINE_LABELS = {
  stock_first_product: "Stock-First Product Engine",
  promo_capability: "Promo Capability Engine",
  service_capability_performance: "Service Capability Engine",
  manual_override: "Manual Override",
  fallback_item_vendor: "Item Vendor Fallback",
  fallback_product_catalog: "Product Catalog Fallback",
};

export default function AssignmentDecisionDrawer({ orderId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId || !open) { setData(null); setNotFound(false); return; }
    setLoading(true);
    setNotFound(false);
    api.get(`/api/admin/assignment/explain/${orderId}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else setNotFound(true);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [orderId, open]);

  return (
    <StandardDrawerShell
      open={open}
      onClose={onClose}
      title="Assignment Reasoning"
      subtitle="Vendor Selection"
      testId="assignment-decision-drawer"
    >
      <div className="space-y-5">
        {loading && <div className="text-sm text-slate-500">Loading assignment data...</div>}
        {notFound && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" data-testid="no-assignment-data">
            No assignment decision recorded for this order.
          </div>
        )}
        {data && (
          <>
            {/* Engine & Timestamp */}
            <div className="rounded-lg border p-4 space-y-3" data-testid="assignment-overview">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Engine Used</span>
                <span className="text-sm font-medium">{ENGINE_LABELS[data.engine_used] || data.engine_used}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Assigned By</span>
                <span className="text-sm">{data.assigned_by || "system"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Timestamp</span>
                <span className="text-xs text-slate-600">{data.created_at ? new Date(data.created_at).toLocaleString() : "-"}</span>
              </div>
            </div>

            {/* Chosen Vendor */}
            <div className="rounded-lg border p-4" data-testid="chosen-vendor-section">
              <div className="text-xs text-slate-500 mb-2">Chosen Vendor</div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{data.chosen_vendor_name || "-"}</span>
                <AssignmentReasonBadge reasonCode={data.reason_code} />
              </div>
              {data.reason_detail && (
                <div className="text-xs text-slate-500 mt-1.5">{data.reason_detail}</div>
              )}
              {data.fallback_reason && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Fallback: {data.fallback_reason}
                </div>
              )}
            </div>

            {/* Per-Item Assignments */}
            {data.item_assignments && data.item_assignments.length > 0 && (
              <div data-testid="item-assignments-section">
                <div className="text-xs text-slate-500 mb-2 font-medium">Per-Item Assignment ({data.item_assignments.length} items)</div>
                <div className="space-y-2">
                  {data.item_assignments.map((ia, idx) => (
                    <div key={idx} className="rounded-lg border p-3 bg-slate-50/50" data-testid={`item-assignment-${idx}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {TIER_ICONS[ia.tier] || TIER_ICONS[5]}
                          <span className="text-sm font-medium">{ia.product_name || `Item ${ia.item_index + 1}`}</span>
                        </div>
                        <span className="text-xs text-slate-400">Tier {ia.tier}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div><span className="text-slate-400">Vendor:</span> <span className="text-slate-700">{ia.vendor_name || "-"}</span></div>
                        <div><span className="text-slate-400">Reason:</span> <AssignmentReasonBadge reasonCode={ia.reason_code} /></div>
                        {ia.reserved && (
                          <div className="col-span-2">
                            <span className="text-emerald-600 font-medium">Stock reserved: {ia.reserved_qty} units</span>
                          </div>
                        )}
                        {ia.warning && (
                          <div className="col-span-2 text-amber-600">Warning: {ia.warning}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidates Snapshot */}
            {data.candidates_snapshot && data.candidates_snapshot.length > 0 && (
              <div data-testid="candidates-snapshot-section">
                <div className="text-xs text-slate-500 mb-2 font-medium">Evaluated Candidates ({data.candidates_snapshot.length})</div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Vendor</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Tier</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Eligible</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.candidates_snapshot.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">{c.vendor_name || c.vendor_id}</td>
                          <td className="px-3 py-2">{c.tier_label || `Tier ${c.tier}`}</td>
                          <td className="px-3 py-2">
                            {c.eligible ? (
                              <span className="text-emerald-600">Yes</span>
                            ) : (
                              <span className="text-red-500">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-400">{c.warning || c.eligibility_reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StandardDrawerShell>
  );
}
