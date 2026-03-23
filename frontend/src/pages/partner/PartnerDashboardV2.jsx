import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { 
  Briefcase, Clock, CheckCircle, AlertTriangle, 
  Package, Calendar, DollarSign, ArrowRight,
  Play, Pause, Upload, Eye
} from "lucide-react";

export default function PartnerDashboardV2() {
  const [stats, setStats] = useState({
    assignedJobs: 0,
    inProgress: 0,
    completed: 0,
    delayed: 0,
    nearingDeadline: 0,
    totalEarnings: 0
  });
  const [urgentJobs, setUrgentJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/api/partner/jobs").catch(() => ({ data: [] })),
        api.get("/api/partner/stats").catch(() => ({ data: {} }))
      ]);

      const jobs = jobsRes.data || [];
      const partnerStats = statsRes.data || {};

      // Calculate job stats
      const assigned = jobs.filter(j => j.status === "assigned" || j.status === "pending");
      const inProgress = jobs.filter(j => j.status === "in_progress" || j.status === "processing");
      const completed = jobs.filter(j => j.status === "completed" || j.status === "delivered");
      
      // Find delayed and nearing deadline
      const now = new Date();
      const delayed = jobs.filter(j => {
        if (!j.deadline || j.status === "completed") return false;
        return new Date(j.deadline) < now;
      });
      
      const nearingDeadline = jobs.filter(j => {
        if (!j.deadline || j.status === "completed") return false;
        const deadline = new Date(j.deadline);
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft <= 2;
      });

      setStats({
        assignedJobs: assigned.length,
        inProgress: inProgress.length,
        completed: completed.length,
        delayed: delayed.length,
        nearingDeadline: nearingDeadline.length,
        totalEarnings: partnerStats.total_earnings || 0
      });

      // Set urgent jobs (delayed + nearing deadline)
      setUrgentJobs([...delayed, ...nearingDeadline].slice(0, 5));
      
      // Set active jobs (assigned + in progress)
      setActiveJobs([...assigned, ...inProgress].slice(0, 5));
    } catch (err) {
      console.error("Failed to load partner dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      await api.patch(`/api/partner/jobs/${jobId}/status`, { status: newStatus });
      toast.success(`Job ${newStatus === "in_progress" ? "started" : "updated"}!`);
      loadDashboardData();
    } catch (err) {
      toast.error("Failed to update job status");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-purple-100 text-purple-700",
      completed: "bg-green-100 text-green-700",
      delayed: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-8" data-testid="partner-dashboard-v2">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Partner Dashboard</h1>
            <p className="text-slate-200 mt-2">
              Manage jobs, deadlines, and fulfillment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/partner/jobs"
              className="flex items-center gap-2 bg-white text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
            >
              <Briefcase className="w-5 h-5" />
              All Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Assigned Jobs</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.assignedJobs}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">In Progress</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.inProgress}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Completed</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.completed}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Total Earnings</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">
            TZS {stats.totalEarnings.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.delayed > 0 || stats.nearingDeadline > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-bold text-red-700">Jobs Requiring Attention</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {stats.delayed > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700">{stats.delayed} jobs delayed</div>
                    <div className="text-xs text-red-500">Past deadline</div>
                  </div>
                </div>
                <Link 
                  to="/partner/jobs?filter=delayed"
                  className="text-red-600 hover:text-red-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
            {stats.nearingDeadline > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-orange-700">{stats.nearingDeadline} jobs nearing deadline</div>
                    <div className="text-xs text-orange-500">Due within 48 hours</div>
                  </div>
                </div>
                <Link 
                  to="/partner/jobs?filter=urgent"
                  className="text-orange-600 hover:text-orange-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Jobs */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">Urgent Jobs</h3>
            <Link to="/partner/jobs?filter=urgent" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : urgentJobs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500">No urgent jobs at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-4 bg-slate-50 rounded-xl border-l-4 border-red-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">
                        {job.title || `Job #${job.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {job.deadline ? new Date(job.deadline).toLocaleDateString() : "No deadline"}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Jobs */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">Active Jobs</h3>
            <Link to="/partner/jobs" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : activeJobs.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No active jobs</p>
              <p className="text-sm text-slate-500">New assignments will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-4 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">
                        {job.title || `Job #${job.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-slate-500">{job.customer_name || "Customer"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "assigned" && (
                        <button
                          onClick={() => updateJobStatus(job.id, "in_progress")}
                          className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                          title="Start Job"
                        >
                          <Play className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {job.status === "in_progress" && (
                        <button
                          onClick={() => updateJobStatus(job.id, "completed")}
                          className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition"
                          title="Mark Complete"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      <Link
                        to={`/partner/jobs/${job.id}`}
                        className="p-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-[#20364D] mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/partner/jobs"
            className="flex items-center gap-2 bg-[#20364D] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition"
          >
            <Briefcase className="w-5 h-5" />
            View All Jobs
          </Link>
          <Link 
            to="/partner/deliverables"
            className="flex items-center gap-2 border border-[#20364D] text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            <Upload className="w-5 h-5" />
            Upload Deliverables
          </Link>
          <Link 
            to="/partner/earnings"
            className="flex items-center gap-2 border border-slate-300 text-slate-600 px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            <DollarSign className="w-5 h-5" />
            View Earnings
          </Link>
        </div>
      </div>
    </div>
  );
}
