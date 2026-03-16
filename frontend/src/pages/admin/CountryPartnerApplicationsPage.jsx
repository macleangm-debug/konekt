import React, { useEffect, useState } from "react";
import { Building2, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import api from "../../lib/api";

export default function CountryPartnerApplicationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const [appsRes, statsRes] = await Promise.all([
        api.get(`/api/admin/country-partner-applications${params}`),
        api.get("/api/admin/country-partner-applications/stats/summary"),
      ]);
      setItems(appsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.post(`/api/admin/country-partner-applications/${id}/review`, { status });
      load();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const convertToPartner = async (id) => {
    if (!window.confirm("Convert this application to a partner account?")) return;
    try {
      const res = await api.post(`/api/admin/country-partner-applications/${id}/convert-to-partner`);
      alert(`Partner "${res.data.partner.name}" created successfully!`);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to convert");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      onboarded: "bg-purple-100 text-purple-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "onboarded", label: "Onboarded" },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="country-partner-applications-page">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">Country Partner Applications</h1>
        <p className="text-slate-600 mt-1">Review and manage partner applications from expansion markets</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-3xl border bg-white p-5">
            <div className="text-sm text-slate-500">Total Applications</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5">
            <div className="text-sm text-slate-500">Pending Review</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {(stats.by_status?.submitted || 0) + (stats.by_status?.under_review || 0)}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-5">
            <div className="text-sm text-slate-500">Approved</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.by_status?.approved || 0}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5">
            <div className="text-sm text-slate-500">Onboarded</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.by_status?.onboarded || 0}</div>
          </div>
        </div>
      )}

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

      {/* Applications List */}
      {loading ? (
        <div className="text-slate-500">Loading applications...</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600">No applications</h3>
          <p className="text-slate-500 mt-1">
            {filter === "all" ? "No partner applications yet" : `No ${filter.replace("_", " ")} applications`}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border bg-white p-6"
              data-testid={`application-${item.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{item.company_name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {item.country_code} • {item.company_type?.replace("_", " ")}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                  {(item.status || "").replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <div className="text-slate-500">Contact</div>
                  <div className="font-medium">{item.contact_person || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Email</div>
                  <div className="font-medium truncate">{item.email}</div>
                </div>
                <div>
                  <div className="text-slate-500">City</div>
                  <div className="font-medium">{item.city || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Years in Business</div>
                  <div className="font-medium">{item.years_in_business || "-"}</div>
                </div>
              </div>

              {item.regions_served?.length > 0 && (
                <div className="text-sm mb-3">
                  <div className="text-slate-500">Regions</div>
                  <div className="font-medium">{item.regions_served.join(", ")}</div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {item.warehouse_available && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">Warehouse</span>
                )}
                {item.service_team_available && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">Service Team</span>
                )}
                {item.delivery_fleet_available && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">Delivery Fleet</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                {item.status === "submitted" && (
                  <button
                    onClick={() => updateStatus(item.id, "under_review")}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                    data-testid={`review-${item.id}`}
                  >
                    <Clock className="w-4 h-4" />
                    Start Review
                  </button>
                )}
                {["submitted", "under_review"].includes(item.status) && (
                  <>
                    <button
                      onClick={() => updateStatus(item.id, "approved")}
                      className="flex items-center gap-1.5 rounded-xl bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700"
                      data-testid={`approve-${item.id}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, "rejected")}
                      className="flex items-center gap-1.5 rounded-xl border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50"
                      data-testid={`reject-${item.id}`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {item.status === "approved" && (
                  <button
                    onClick={() => convertToPartner(item.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm hover:bg-purple-700"
                    data-testid={`convert-${item.id}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Convert to Partner
                  </button>
                )}
                {item.status === "onboarded" && (
                  <span className="flex items-center gap-1.5 text-purple-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Partner Created
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 mt-3">
                Applied: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
