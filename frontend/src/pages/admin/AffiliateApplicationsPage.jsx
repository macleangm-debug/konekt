import React, { useEffect, useState } from "react";
import { Users, Check, X, Eye, Clock, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

const statusColors = {
  pending_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AffiliateApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveForm, setApproveForm] = useState({
    commission_rate: 10,
    tier: "silver",
  });

  const loadApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      
      const res = await api.get(`/api/affiliate-applications?${params.toString()}`);
      setApplications(res.data || []);
    } catch (error) {
      console.error("Failed to load applications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  const approveApplication = async () => {
    if (!selectedApp) return;
    
    try {
      await api.post(`/api/affiliate-applications/${selectedApp.id}/approve`, null, {
        params: {
          commission_rate: approveForm.commission_rate,
          tier: approveForm.tier,
        }
      });
      setShowApproveModal(false);
      setSelectedApp(null);
      loadApplications();
      alert("Application approved! Affiliate partner created.");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to approve application");
    }
  };

  const rejectApplication = async (appId, reason) => {
    try {
      await api.post(`/api/affiliate-applications/${appId}/reject`, null, {
        params: { reason }
      });
      loadApplications();
      alert("Application rejected");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to reject application");
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending_review").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="affiliate-applications-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-[#D4A843]" />
            Affiliate Applications
          </h1>
          <p className="text-slate-600 mt-1">Review and manage partner applications</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-600">Pending Review</p>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600">Approved</p>
            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              !filterStatus ? "bg-[#2D3E50] text-white" : "bg-white border hover:bg-slate-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus("pending_review")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === "pending_review" ? "bg-[#2D3E50] text-white" : "bg-white border hover:bg-slate-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === "approved" ? "bg-[#2D3E50] text-white" : "bg-white border hover:bg-slate-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === "rejected" ? "bg-[#2D3E50] text-white" : "bg-white border hover:bg-slate-50"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Applications Table */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold">Applicant</th>
                  <th className="px-5 py-4 text-sm font-semibold">Company</th>
                  <th className="px-5 py-4 text-sm font-semibold">Audience</th>
                  <th className="px-5 py-4 text-sm font-semibold">Region</th>
                  <th className="px-5 py-4 text-sm font-semibold">Status</th>
                  <th className="px-5 py-4 text-sm font-semibold">Date</th>
                  <th className="px-5 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">No applications found</td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-medium">{app.full_name}</div>
                        <div className="text-sm text-slate-500">{app.email}</div>
                      </td>
                      <td className="px-5 py-4">{app.company_name || "—"}</td>
                      <td className="px-5 py-4">{app.audience_size || "—"}</td>
                      <td className="px-5 py-4">{app.region || app.country || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[app.status] || "bg-slate-100"}`}>
                          {app.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-2 rounded-lg hover:bg-slate-100"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {app.status === "pending_review" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowApproveModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt("Rejection reason:");
                                  if (reason) rejectApplication(app.id, reason);
                                }}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApp && !showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Application Details</h2>
                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="font-medium">{selectedApp.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium">{selectedApp.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Company</p>
                  <p className="font-medium">{selectedApp.company_name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Website</p>
                  {selectedApp.website ? (
                    <a href={selectedApp.website} target="_blank" rel="noreferrer" className="text-[#D4A843] hover:underline">
                      {selectedApp.website}
                    </a>
                  ) : <p>—</p>}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Audience Size</p>
                  <p className="font-medium">{selectedApp.audience_size || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Region</p>
                  <p className="font-medium">{selectedApp.region}, {selectedApp.country}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Industries</p>
                  <p className="font-medium">{selectedApp.industries?.join(", ") || "—"}</p>
                </div>
              </div>
              
              {selectedApp.social_links?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Social Links</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.social_links.map((link, idx) => (
                      <a key={idx} href={link} target="_blank" rel="noreferrer" className="text-sm text-[#D4A843] hover:underline">
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedApp.why_partner && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Why Partner</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedApp.why_partner}</p>
                </div>
              )}
              
              {selectedApp.how_promote && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">How They'll Promote</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedApp.how_promote}</p>
                </div>
              )}

              {selectedApp.status === "pending_review" && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"
                  >
                    Approve Application
                  </button>
                  <button
                    onClick={() => {
                      const reason = window.prompt("Rejection reason:");
                      if (reason) {
                        rejectApplication(selectedApp.id, reason);
                        setSelectedApp(null);
                      }
                    }}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700"
                  >
                    Reject Application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Approve {selectedApp.full_name}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Commission Rate (%)</label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  value={approveForm.commission_rate}
                  onChange={(e) => setApproveForm({ ...approveForm, commission_rate: Number(e.target.value) })}
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Partner Tier</label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                  value={approveForm.tier}
                  onChange={(e) => setApproveForm({ ...approveForm, tier: e.target.value })}
                >
                  <option value="silver">Silver Partner</option>
                  <option value="gold">Gold Partner</option>
                  <option value="platinum">Platinum Partner</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                  }}
                  className="flex-1 border border-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={approveApplication}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"
                >
                  Approve & Create Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
