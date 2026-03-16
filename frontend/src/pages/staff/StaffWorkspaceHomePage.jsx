import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Users, FileText, CheckSquare } from "lucide-react";
import api from "../../lib/api";

export default function StaffWorkspaceHomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/api/staff-dashboard/me");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load workspace:", error);
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

  if (!data) {
    return (
      <div className="p-10 text-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Unable to load workspace data.</p>
      </div>
    );
  }

  const getIconForCard = (label) => {
    if (label.toLowerCase().includes("lead")) return <Users className="w-5 h-5" />;
    if (label.toLowerCase().includes("quote")) return <FileText className="w-5 h-5" />;
    if (label.toLowerCase().includes("task")) return <CheckSquare className="w-5 h-5" />;
    if (label.toLowerCase().includes("order")) return <TrendingUp className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="staff-workspace-page">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-left">
          <h1 className="text-4xl font-bold text-[#2D3E50]">
            Welcome back, {data.full_name?.split(" ")[0] || "Team Member"}
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Your <span className="capitalize font-medium">{(data.role || "staff").replace("_", " ")}</span> workspace
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(data.cards || []).map((card, idx) => (
            <Link
              key={card.label}
              to={card.href || "#"}
              className="group rounded-3xl border bg-white p-6 hover:shadow-lg hover:border-[#D4A843] transition-all"
              data-testid={`workspace-card-${idx}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[#2D3E50] group-hover:bg-[#D4A843]/10 group-hover:text-[#D4A843] transition-colors">
                  {getIconForCard(card.label)}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#D4A843] transition-colors" />
              </div>
              <div className="text-3xl font-bold text-[#2D3E50]">{card.value}</div>
              <div className="text-sm text-slate-500 mt-1">{card.label}</div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        {data.quick_actions && data.quick_actions.length > 0 && (
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-bold text-[#2D3E50] mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              {data.quick_actions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D3E50] text-white font-medium hover:bg-[#1a2b3c] transition-colors"
                  data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {action.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific guidance */}
        <div className="rounded-3xl border bg-gradient-to-br from-[#2D3E50] to-[#1a2b3c] p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Your Daily Focus</h2>
          <p className="text-slate-300 text-sm">
            {data.role === "sales" && "Focus on converting leads and following up on quotes. Check your tasks for pending items."}
            {data.role === "production" && "Review pending orders and production tasks. Update task status as you complete items."}
            {data.role === "finance" && "Review pending payments and unpaid invoices. Verify payment proofs and reconcile accounts."}
            {data.role === "marketing" && "Monitor active campaigns and review affiliate applications. Track campaign performance."}
            {data.role === "support" && "Handle open service requests and complete assigned tasks. Update request statuses."}
            {data.role === "supervisor" && "Monitor team performance, review overdue tasks, and support your team members."}
            {(data.role === "admin" || data.role === "super_admin") && "Full visibility across all operations. Use the Control Panel for detailed insights."}
          </p>
        </div>
      </div>
    </div>
  );
}
