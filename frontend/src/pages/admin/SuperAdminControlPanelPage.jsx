import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, ShoppingCart, Briefcase, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import api from "../../lib/api";

export default function SuperAdminControlPanelPage() {
  const [workspace, setWorkspace] = useState(null);
  const [teamOverview, setTeamOverview] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [workspaceRes, teamRes, perfRes] = await Promise.all([
        api.get("/api/staff-dashboard/me"),
        api.get("/api/supervisor-team/overview"),
        api.get("/api/supervisor-team/performance"),
      ]);
      setWorkspace(workspaceRes.data);
      setTeamOverview(teamRes.data);
      setPerformance(perfRes.data);
    } catch (error) {
      console.error("Failed to load control panel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen bg-slate-50" data-testid="loading-state">
        <div className="w-8 h-8 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = teamOverview?.summary || {};

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="super-admin-control-panel">
      <div>
        <h1 className="text-4xl font-bold text-[#2D3E50]">Control Panel</h1>
        <p className="mt-2 text-slate-600">
          Global operational visibility across all teams and modules.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          label="Total Leads"
          value={summary.lead_count || 0}
          href="/admin/crm"
          color="blue"
        />
        <MetricCard
          icon={<FileText className="w-6 h-6" />}
          label="Active Quotes"
          value={summary.quote_count || 0}
          href="/admin/quotes"
          color="purple"
        />
        <MetricCard
          icon={<ShoppingCart className="w-6 h-6" />}
          label="Total Orders"
          value={summary.order_count || 0}
          href="/admin/orders"
          color="green"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Total Revenue"
          value={`TZS ${Number(summary.total_revenue || 0).toLocaleString()}`}
          href="/admin/invoices"
          color="gold"
          isLarge
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <SmallMetric label="Open Tasks" value={summary.open_task_count || 0} href="/admin/tasks" />
        <SmallMetric label="Service Requests" value={summary.service_request_count || 0} href="/admin/service-requests" />
        <SmallMetric label="Invoices" value={summary.invoice_count || 0} href="/admin/invoices" />
        <SmallMetric label="Unpaid Invoices" value={summary.unpaid_invoices || 0} href="/admin/invoices" highlight />
        <SmallMetric label="Staff Members" value={summary.staff_count || 0} href="/admin/users" />
      </div>

      {/* Staff Performance Leaderboard */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Staff Performance</h2>
          <Link to="/admin/staff-performance" className="text-sm text-[#D4A843] font-medium hover:underline">
            View Full Report →
          </Link>
        </div>

        {performance?.performance?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="pb-3 font-medium">Staff Member</th>
                  <th className="pb-3 font-medium text-center">Role</th>
                  <th className="pb-3 font-medium text-center">Leads</th>
                  <th className="pb-3 font-medium text-center">Won</th>
                  <th className="pb-3 font-medium text-center">Conv. Rate</th>
                  <th className="pb-3 font-medium text-center">Tasks Done</th>
                  <th className="pb-3 font-medium text-right">Pipeline Value</th>
                </tr>
              </thead>
              <tbody>
                {performance.performance.slice(0, 10).map((staff, idx) => (
                  <tr key={staff.email} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${idx === 0 ? 'bg-[#D4A843]' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-slate-300'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{staff.full_name || staff.email}</div>
                          <div className="text-xs text-slate-500">{staff.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 capitalize">
                        {(staff.role || "staff").replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 text-center font-medium">{staff.lead_count}</td>
                    <td className="py-4 text-center font-medium text-green-600">{staff.won_count}</td>
                    <td className="py-4 text-center">
                      <span className={`font-medium ${staff.conversion_rate >= 20 ? 'text-green-600' : staff.conversion_rate >= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {staff.conversion_rate}%
                      </span>
                    </td>
                    <td className="py-4 text-center">{staff.completed_tasks}/{staff.total_tasks}</td>
                    <td className="py-4 text-right font-medium">TZS {Number(staff.total_value || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            No staff performance data available yet.
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D3E50] mb-4">Quick Navigation</h2>
        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3">
          <QuickLink label="CRM Pipeline" href="/admin/crm" />
          <QuickLink label="Quotes" href="/admin/quotes" />
          <QuickLink label="Invoices" href="/admin/invoices" />
          <QuickLink label="Tasks" href="/admin/tasks" />
          <QuickLink label="Team Management" href="/admin/users" />
          <QuickLink label="Business Settings" href="/admin/business-settings" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, href, color, isLarge }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    gold: "bg-amber-50 text-amber-600",
  };

  return (
    <Link
      to={href}
      className="group rounded-3xl border bg-white p-6 hover:shadow-lg hover:border-[#D4A843] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color] || "bg-slate-100 text-slate-600"}`}>
          {icon}
        </div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#D4A843] transition-colors" />
      </div>
      <div className={`font-bold text-[#2D3E50] ${isLarge ? 'text-xl' : 'text-3xl'}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </Link>
  );
}

function SmallMetric({ label, value, href, highlight }) {
  return (
    <Link
      to={href}
      className={`rounded-2xl border p-4 hover:shadow-md transition-all ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-amber-700' : 'text-[#2D3E50]'}`}>{value}</div>
    </Link>
  );
}

function QuickLink({ label, href }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border bg-slate-50 text-sm font-medium text-[#2D3E50] hover:bg-[#2D3E50] hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}
