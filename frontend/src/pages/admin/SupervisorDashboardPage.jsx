import React, { useEffect, useState } from "react";
import {
  Users, TrendingUp, AlertTriangle, Clock, CheckCircle, XCircle,
  Loader2, Award, BarChart3, User
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function SupervisorDashboardPage() {
  const [team, setTeam] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("team");
  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamRes, alertsRes, summaryRes] = await Promise.all([
          fetch(`${API}/api/supervisor/team-summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/admin/staff-alerts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/admin/staff-alerts/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (teamRes.ok) setTeam(await teamRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
        if (summaryRes.ok) setAlertsSummary(await summaryRes.json());
      } catch (error) {
        console.error(error);
        toast.error("Failed to load supervisor data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const totalCompleted = team.reduce((s, x) => s + Number(x.completed || 0), 0);
  const totalDelayed = team.reduce((s, x) => s + Number(x.delayed || 0), 0);
  const totalActive = team.reduce((s, x) => s + Number(x.active || 0), 0);

  const getSeverityColor = (severity) => {
    const colors = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colors[severity] || "bg-slate-100 text-slate-600";
  };

  const getScoreColor = (score) => {
    if (score >= 20) return "text-green-600";
    if (score >= 0) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="supervisor-dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Supervisor Dashboard</h1>
        <p className="text-slate-500">Monitor team performance, workload, and underperformance signals.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{team.length}</div>
              <div className="text-sm text-slate-500">Team Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalCompleted}</div>
              <div className="text-sm text-slate-500">Completed Tasks</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalActive}</div>
              <div className="text-sm text-slate-500">Active Tasks</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalDelayed}</div>
              <div className="text-sm text-slate-500">Delayed Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Banner */}
      {alertsSummary?.total_alerts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="text-amber-800">
              <strong>{alertsSummary.total_alerts} performance alerts</strong> need your attention.
              {alertsSummary.staff_with_delays > 0 && ` ${alertsSummary.staff_with_delays} with delays.`}
              {alertsSummary.staff_inactive > 0 && ` ${alertsSummary.staff_inactive} inactive.`}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "team" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500"
          }`}
          data-testid="tab-team"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Team Performance
          </div>
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "alerts" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500"
          }`}
          data-testid="tab-alerts"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts ({alerts.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "leaderboard" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500"
          }`}
          data-testid="tab-leaderboard"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Leaderboard
          </div>
        </button>
      </div>

      {/* Team Performance Tab */}
      {activeTab === "team" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="team-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Staff</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Role</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Score</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Completed</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Active</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Delayed</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {team.map((member, idx) => (
                  <tr key={member.staff_id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.role === "sales" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${getScoreColor(member.score)}`}>
                        {member.score}
                      </span>
                    </td>
                    <td className="p-4 text-center text-green-600 font-medium">{member.completed}</td>
                    <td className="p-4 text-center text-amber-600">{member.active}</td>
                    <td className="p-4 text-center text-red-600">{member.delayed}</td>
                    <td className="p-4 text-center text-red-600">{member.issues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="text-slate-500">No performance alerts at this time.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div
                key={`${alert.staff_id}-${idx}`}
                className={`rounded-xl border p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{alert.name}</div>
                    <div className="text-sm opacity-80">{alert.role} · {alert.type}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.severity === "high" ? "bg-red-200" :
                    alert.severity === "medium" ? "bg-amber-200" : "bg-blue-200"
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-2">{alert.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="space-y-3">
          {team.slice(0, 10).map((member, idx) => (
            <div key={member.staff_id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                idx === 0 ? "bg-yellow-400 text-white" :
                idx === 1 ? "bg-slate-300 text-white" :
                idx === 2 ? "bg-amber-600 text-white" :
                "bg-slate-100 text-slate-600"
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{member.name}</div>
                <div className="text-sm text-slate-500">{member.role}</div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(member.score)}`}>
                  {member.score}
                </div>
                <div className="text-xs text-slate-500">{member.completed} completed</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
