import React, { useEffect, useState } from "react";
import { Truck, Check, Play, AlertTriangle, Clock } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerFulfillmentPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await partnerApi.get(`/api/partner-portal/fulfillment-jobs${params}`);
      setJobs(res.data || []);
    } catch (err) {
      console.error("Failed to load fulfillment jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const updateStatus = async (jobId, status) => {
    try {
      await partnerApi.post(`/api/partner-portal/fulfillment-jobs/${jobId}/status`, { status });
      load();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ready_to_fulfill: "bg-purple-100 text-purple-700",
      allocated: "bg-blue-100 text-blue-700",
      accepted: "bg-indigo-100 text-indigo-700",
      in_progress: "bg-amber-100 text-amber-700",
      fulfilled: "bg-green-100 text-green-700",
      issue_reported: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const filterOptions = [
    { value: "all", label: "All Jobs" },
    { value: "ready_to_fulfill", label: "Ready to Fulfill" },
    { value: "allocated", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "in_progress", label: "In Progress" },
    { value: "fulfilled", label: "Completed" },
    { value: "issue_reported", label: "Issues" },
  ];

  const pendingJobs = jobs.filter(j => ["ready_to_fulfill", "allocated", "accepted", "in_progress"].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === "fulfilled");

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-fulfillment-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Fulfillment Queue</h1>
          <p className="text-slate-600 mt-1">Manage your Konekt-allocated fulfillment jobs</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-[#20364D]">{pendingJobs.length}</span> pending
            <span className="mx-2">•</span>
            <span className="font-semibold text-green-600">{completedJobs.length}</span> completed
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === opt.value
                ? "bg-[#20364D] text-white"
                : "bg-white border hover:bg-slate-50"
            }`}
            data-testid={`filter-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-slate-500">Loading fulfillment jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600">No fulfillment jobs</h3>
          <p className="text-slate-500 mt-1">
            {filter === "all" 
              ? "You don't have any fulfillment jobs yet"
              : `No jobs with status "${filter.replace("_", " ")}"`}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-3xl border bg-white p-6"
              data-testid={`fulfillment-job-${job.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{job.item_name || job.sku}</div>
                  <div className="text-sm text-slate-500 mt-1">SKU: {job.sku}</div>
                  {job.konekt_order_ref && (
                    <div className="text-sm text-slate-500">Ref: {job.konekt_order_ref}</div>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                  {(job.status || "").replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <div className="text-slate-500">Quantity</div>
                  <div className="font-semibold text-lg">{job.quantity || 0}</div>
                </div>
                <div>
                  <div className="text-slate-500">Unit Price</div>
                  <div className="font-semibold">TZS {Number(job.base_partner_price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">Total</div>
                  <div className="font-semibold">
                    TZS {Number((job.base_partner_price || 0) * (job.quantity || 0)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Delivery info - only what's needed, NO customer PII */}
              {(job.delivery_region || job.delivery_city) && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
                  <div className="text-slate-500">Delivery Location</div>
                  <div className="font-medium">
                    {[job.delivery_city, job.delivery_region, job.country_code].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}

              {job.partner_note && (
                <div className="bg-amber-50 rounded-xl p-3 mb-4 text-sm">
                  <div className="text-amber-600 font-medium">Your Note</div>
                  <div className="text-amber-700">{job.partner_note}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {["allocated", "ready_to_fulfill"].includes(job.status) && (
                  <button
                    onClick={() => updateStatus(job.id, "accepted")}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
                    data-testid={`accept-job-${job.id}`}
                  >
                    <Check className="w-4 h-4" />
                    Accept Job
                  </button>
                )}
                {job.status === "accepted" && (
                  <button
                    onClick={() => updateStatus(job.id, "in_progress")}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 text-white px-4 py-2 text-sm hover:bg-amber-700"
                    data-testid={`start-job-${job.id}`}
                  >
                    <Play className="w-4 h-4" />
                    Start Fulfillment
                  </button>
                )}
                {job.status === "in_progress" && (
                  <button
                    onClick={() => updateStatus(job.id, "fulfilled")}
                    className="flex items-center gap-1.5 rounded-xl bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700"
                    data-testid={`complete-job-${job.id}`}
                  >
                    <Check className="w-4 h-4" />
                    Mark Fulfilled
                  </button>
                )}
                {["allocated", "accepted", "in_progress"].includes(job.status) && (
                  <button
                    onClick={() => updateStatus(job.id, "issue_reported")}
                    className="flex items-center gap-1.5 rounded-xl border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50"
                    data-testid={`issue-job-${job.id}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Report Issue
                  </button>
                )}
                {job.status === "fulfilled" && (
                  <span className="flex items-center gap-1.5 text-green-600 text-sm">
                    <Check className="w-4 h-4" />
                    Completed
                  </span>
                )}
              </div>

              {job.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
                  <Clock className="w-3 h-3" />
                  Created: {new Date(job.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
