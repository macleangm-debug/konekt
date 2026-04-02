import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import AssignmentReasonBadge from "../../components/assignment/AssignmentReasonBadge";
import AssignmentDecisionDrawer from "../../components/assignment/AssignmentDecisionDrawer";
import { Button } from "../../components/ui/button";
import api from "../../lib/api";

const ENGINE_OPTIONS = [
  { value: "", label: "All Engines" },
  { value: "stock_first_product", label: "Stock-First Product" },
  { value: "promo_capability", label: "Promo Capability" },
  { value: "service_capability_performance", label: "Service Capability" },
  { value: "manual_override", label: "Manual Override" },
  { value: "fallback_item_vendor", label: "Fallback Item" },
  { value: "fallback_product_catalog", label: "Fallback Catalog" },
];

export default function AssignmentDecisionHistoryPage() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineFilter, setEngineFilter] = useState("");
  const [drawerOrderId, setDrawerOrderId] = useState(null);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (engineFilter) params.engine = engineFilter;
      const res = await api.get("/api/admin/assignment/decisions", { params });
      const data = res.data;
      setDecisions(Array.isArray(data) ? data : data.decisions || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [engineFilter]);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  return (
    <div className="space-y-5" data-testid="assignment-decisions-page">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Assignment Decisions</h1>
        <Button variant="outline" size="sm" onClick={fetchDecisions} data-testid="refresh-decisions-btn">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Engine Filter */}
      <div className="flex items-center gap-3" data-testid="engine-filter">
        <div className="relative">
          <select
            value={engineFilter}
            onChange={(e) => setEngineFilter(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="engine-filter-select"
          >
            {ENGINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <span className="text-sm text-slate-500">{decisions.length} decision(s)</span>
      </div>

      {/* Decisions Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading decisions...</div>
        ) : decisions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500" data-testid="no-decisions">
            No assignment decisions found. Decisions are created when orders are approved.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="decisions-table">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Order</th>
                <th className="px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 font-medium text-slate-600">Engine</th>
                <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                <th className="px-4 py-3 font-medium text-slate-600">Reason</th>
                <th className="px-4 py-3 font-medium text-slate-600">Items</th>
                <th className="px-4 py-3 font-medium text-slate-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {decisions.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => setDrawerOrderId(row.order_id)}
                  data-testid={`decision-row-${idx}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 underline">{(row.order_id || "").slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{row.order_type || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {(row.engine_used || "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.chosen_vendor_name || "-"}</td>
                  <td className="px-4 py-3"><AssignmentReasonBadge reasonCode={row.reason_code} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(row.item_assignments || []).length}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Decision Drawer */}
      <AssignmentDecisionDrawer
        orderId={drawerOrderId}
        open={!!drawerOrderId}
        onClose={() => setDrawerOrderId(null)}
      />
    </div>
  );
}
