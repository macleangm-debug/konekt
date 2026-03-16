import React, { useEffect, useState } from "react";
import { Loader2, Users, TrendingUp, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PartnerPerformancePage() {
  const [summary, setSummary] = useState([]);
  const [queueLoad, setQueueLoad] = useState([]);
  const [byService, setByService] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");

  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const [summaryRes, queueRes, serviceRes] = await Promise.all([
        fetch(`${API}/api/admin/partner-performance/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/partner-performance/queue-load`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/partner-performance/by-service`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (queueRes.ok) setQueueLoad(await queueRes.json());
      if (serviceRes.ok) setByService(await serviceRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load partner performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-slate-100 text-slate-600",
      suspended: "bg-red-100 text-red-700",
    };
    return colors[status] || colors.inactive;
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalAssigned = summary.reduce((s, p) => s + p.assigned, 0);
  const totalCompleted = summary.reduce((s, p) => s + p.completed, 0);
  const totalDelayed = summary.reduce((s, p) => s + p.delayed, 0);
  const avgCompletion = summary.length > 0
    ? (summary.reduce((s, p) => s + p.completion_rate, 0) / summary.length).toFixed(1)
    : 0;

  return (
    <div className="p-6" data-testid="partner-performance-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Partner Performance</h1>
        <p className="text-slate-500">Track partner reliability, completion rates, and queue load.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            Total Partners
          </div>
          <div className="text-3xl font-bold mt-1">{summary.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity className="w-4 h-4" />
            Total Assigned
          </div>
          <div className="text-3xl font-bold mt-1">{totalAssigned}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle className="w-4 h-4" />
            Total Completed
          </div>
          <div className="text-3xl font-bold mt-1 text-green-600">{totalCompleted}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="w-4 h-4" />
            Avg Completion Rate
          </div>
          <div className="text-3xl font-bold mt-1 text-blue-600">{avgCompletion}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === "summary" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("summary")}
        >
          Performance Summary
        </Button>
        <Button
          variant={activeTab === "queue" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("queue")}
        >
          Queue Load
        </Button>
        <Button
          variant={activeTab === "service" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("service")}
        >
          By Service
        </Button>
      </div>

      {/* Performance Summary Tab */}
      {activeTab === "summary" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Partner Performance Rankings</h2>
          </div>
          
          {summary.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No partner data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Partner</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Assigned</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Delayed</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Issues</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Active Queue</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((partner, idx) => (
                    <tr key={partner.partner_id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            idx < 3 ? "bg-[#D4A843]" : "bg-slate-300"
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{partner.partner_name}</div>
                            <div className="text-xs text-slate-500">{partner.country_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(partner.status)}`}>
                          {partner.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{partner.assigned}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{partner.completed}</td>
                      <td className="px-4 py-3 text-center">
                        {partner.delayed > 0 ? (
                          <span className="text-amber-600 font-medium">{partner.delayed}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {partner.issues > 0 ? (
                          <span className="text-red-600 font-medium">{partner.issues}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{partner.active_queue}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getCompletionColor(partner.completion_rate)}`}>
                          {partner.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Queue Load Tab */}
      {activeTab === "queue" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Partner Queue Load</h2>
          </div>
          
          {queueLoad.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No queue data available</p>
            </div>
          ) : (
            <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queueLoad.map((partner) => (
                <div key={partner.partner_id} className="rounded-xl border p-4 bg-slate-50">
                  <div className="font-medium text-slate-800 mb-2">{partner.partner_name}</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Queue</span>
                    <span className="font-bold">{partner.total_queue}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Capacity/Week</span>
                    <span className="font-bold">{partner.total_capacity_per_week}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Utilization</span>
                    <span className={`font-bold ${
                      partner.utilization_percent > 80 ? "text-red-600" : 
                      partner.utilization_percent > 50 ? "text-amber-600" : "text-green-600"
                    }`}>
                      {partner.utilization_percent}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        partner.utilization_percent > 80 ? "bg-red-500" : 
                        partner.utilization_percent > 50 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(partner.utilization_percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* By Service Tab */}
      {activeTab === "service" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Performance by Service</h2>
          </div>
          
          {byService.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No service assignment data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Partner</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Assigned</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Delayed</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {byService.map((row, idx) => (
                    <tr key={`${row.partner_id}-${row.service_key}-${idx}`} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{row.partner_name}</td>
                      <td className="px-4 py-3">{row.service_key || "N/A"}</td>
                      <td className="px-4 py-3 text-center">{row.assigned}</td>
                      <td className="px-4 py-3 text-center text-green-600">{row.completed}</td>
                      <td className="px-4 py-3 text-center text-amber-600">{row.delayed}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getCompletionColor(row.completion_rate)}`}>
                          {row.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
