import React, { useState, useEffect } from "react";
import { Package, X, Truck, CheckCircle, Clock, AlertCircle, FileText, ChevronRight } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_MAP = {
  allocated: { label: "Allocated", cls: "bg-amber-100 text-amber-700" },
  ready_to_fulfill: { label: "Ready to Fulfill", cls: "bg-purple-100 text-purple-700" },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", cls: "bg-indigo-100 text-indigo-700" },
  fulfilled: { label: "Fulfilled", cls: "bg-green-100 text-green-700" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700" },
  issue_reported: { label: "Issue Reported", cls: "bg-red-100 text-red-700" },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "allocated", label: "Allocated" },
  { value: "ready_to_fulfill", label: "Ready to Fulfill" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "fulfilled", label: "Fulfilled" },
];

function fmtDate(d) { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function PartnerFulfillmentPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem("partner_token");

  const load = (filter) => {
    const filterParam = filter || statusFilter;
    setLoading(true);
    const params = filterParam ? `?status=${filterParam}` : "";
    axios.get(`${API_URL}/api/partner-portal/fulfillment-jobs${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => setJobs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateJobStatus = async (jobId, newStatus, note) => {
    setActionLoading(true);
    try {
      const payload = { status: newStatus };
      if (note) payload.partner_note = note;
      await axios.post(`${API_URL}/api/partner-portal/fulfillment-jobs/${jobId}/status`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(null);
      load();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-6" data-testid="partner-fulfillment-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">My Orders</h1>
        <p className="text-slate-500 mt-1 text-sm">View and fulfill orders assigned to you. Update status as you progress.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === f.value ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`filter-${f.value || "all"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1fr_400px] gap-6">
        {/* Table */}
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" data-testid="fulfillment-table">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Items</th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading orders...</td></tr>
                ) : jobs.length > 0 ? jobs.map((job) => {
                  const cfg = STATUS_MAP[job.status] || { label: job.status, cls: "bg-slate-100 text-slate-700" };
                  return (
                    <tr key={job.id || job._id} onClick={() => setSelected(job)}
                      className={`border-t hover:bg-slate-50 cursor-pointer ${selected?.id === (job.id || job._id) ? "bg-[#20364D]/5" : ""}`}
                      data-testid={`job-row-${job.id}`}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#20364D]">{job.order_number || job.order_id?.slice(-8) || "-"}</div>
                        <div className="text-xs text-slate-500">{job.source || "order"}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{job.item_name || (job.items || []).map(i => i.name || i.product_name).join(", ") || "-"}</td>
                      <td className="px-4 py-4 text-slate-700 font-medium">{job.quantity || (job.items || []).reduce((s, i) => s + (i.quantity || 1), 0) || "-"}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{fmtDate(job.created_at)}</td>
                      <td className="px-4 py-4 text-right"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <div className="font-semibold text-[#20364D] mb-1">No orders found</div>
                      <div>Orders assigned to you will appear here.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5" data-testid="job-detail-panel">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-[#20364D]">{selected.order_number || selected.order_id?.slice(-8)}</div>
                  <div className="text-xs text-slate-500">{fmtDate(selected.created_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100" data-testid="close-job-detail">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Status</div>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${(STATUS_MAP[selected.status] || {}).cls || "bg-slate-100"}`}>
                    {(STATUS_MAP[selected.status] || {}).label || selected.status}
                  </span>
                </div>
                <div>
                  <div className="text-slate-500">Quantity</div>
                  <div className="font-semibold text-[#20364D]">{selected.quantity || (selected.items || []).reduce((s, i) => s + (i.quantity || 1), 0) || "-"}</div>
                </div>
              </div>

              {/* Items list */}
              {selected.items && selected.items.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-2">Items</div>
                  <div className="space-y-2">
                    {selected.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                        <span>{item.name || item.product_name || "Item"} x{item.quantity || 1}</span>
                        {item.unit_price && <span className="font-semibold">{money(item.unit_price)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(selected.brief || selected.notes || selected.partner_note) && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Notes / Brief</div>
                  <div className="text-sm text-slate-700">{selected.brief || selected.notes || selected.partner_note}</div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-3 border-t space-y-2">
                {["allocated", "ready_to_fulfill"].includes(selected.status) && (
                  <button onClick={() => updateJobStatus(selected.id || selected._id, "accepted")} disabled={actionLoading}
                    className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="accept-order-btn">
                    <CheckCircle className="w-4 h-4" /> Accept Order
                  </button>
                )}
                {selected.status === "accepted" && (
                  <button onClick={() => updateJobStatus(selected.id || selected._id, "in_progress")} disabled={actionLoading}
                    className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="start-progress-btn">
                    <Truck className="w-4 h-4" /> Start Progress
                  </button>
                )}
                {selected.status === "in_progress" && (
                  <button onClick={() => updateJobStatus(selected.id || selected._id, "fulfilled")} disabled={actionLoading}
                    className="w-full rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="mark-fulfilled-btn">
                    <CheckCircle className="w-4 h-4" /> Mark Fulfilled
                  </button>
                )}
                {!["fulfilled", "completed", "issue_reported"].includes(selected.status) && (
                  <button onClick={() => updateJobStatus(selected.id || selected._id, "issue_reported", "Issue flagged by partner")} disabled={actionLoading}
                    className="w-full rounded-xl border border-red-200 text-red-600 px-4 py-3 font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="report-issue-btn">
                    <AlertCircle className="w-4 h-4" /> Report Issue
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <div>Select an order to see details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
