import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function VendorDashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [performance, setPerformance] = useState(null);

  const load = async () => {
    const [jobsRes, perfRes] = await Promise.all([
      api.get("/api/partner/vendor/jobs"),
      api.get("/api/partner/vendor/performance"),
    ]);
    setJobs(jobsRes.data || []);
    setPerformance(perfRes.data || null);
  };

  useEffect(() => { load(); }, []);

  const updateProgress = async (jobId) => {
    const internal_status = prompt("Enter internal status", "in_progress");
    const progress_note = prompt("Enter progress note", "");
    if (!internal_status) return;
    await api.post(`/api/partner/vendor/jobs/${jobId}/progress`, { internal_status, progress_note });
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Vendor / Supplier Dashboard</div>
        <div className="text-slate-600 mt-2">View assigned jobs, update progress, and respond to operational follow-up.</div>
      </div>

      {performance ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Total Jobs</div><div className="text-3xl font-bold text-[#20364D] mt-3">{performance.total_jobs}</div></div>
          <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Completed</div><div className="text-3xl font-bold text-[#20364D] mt-3">{performance.completed_jobs}</div></div>
          <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Completion Rate</div><div className="text-3xl font-bold text-[#20364D] mt-3">{performance.completion_rate}%</div></div>
          <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Avg Quality</div><div className="text-3xl font-bold text-[#20364D] mt-3">{performance.avg_quality_score}</div></div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border bg-white p-8 space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border bg-slate-50 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-[#20364D]">{job.title || job.job_id || "Assigned Job"}</div>
                <div className="text-sm text-slate-500 mt-1">Internal status: {job.internal_status || "pending"}</div>
                <div className="text-sm text-slate-600 mt-2">{job.progress_note || "No progress note yet."}</div>
              </div>
              <button onClick={() => updateProgress(job.job_id || job.id)} className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">
                Update Progress
              </button>
            </div>
          </div>
        ))}
        {!jobs.length ? <div className="text-slate-600">No jobs assigned yet.</div> : null}
      </div>
    </div>
  );
}
