import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { Loader2, TrendingUp, Target, Clock, Award } from "lucide-react";

export default function StaffPerformanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamAverage, setTeamAverage] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/staff-performance/sales");
        const data = res.data || [];
        setLeaderboard(data);
        
        if (data.length > 0) {
          const avg = data.reduce((sum, x) => sum + x.efficiency_score, 0) / data.length;
          setTeamAverage(Math.round(avg * 100) / 100);
        }
      } catch (err) {
        console.error("Failed to load performance data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="performance-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="staff-performance-dashboard">
      <PageHeader
        title="Staff Performance Dashboard"
        subtitle="Track sales team efficiency, close rates, and workload distribution."
      />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SurfaceCard className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-[#D4A843] mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">{teamAverage}</div>
          <div className="text-slate-600 text-sm">Team Avg Efficiency</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <Target className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">{leaderboard.length}</div>
          <div className="text-slate-600 text-sm">Active Sales Staff</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <Clock className="w-8 h-8 mx-auto text-blue-500 mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">
            {leaderboard.reduce((sum, x) => sum + (x.open_workload || 0), 0)}
          </div>
          <div className="text-slate-600 text-sm">Total Open Opportunities</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <Award className="w-8 h-8 mx-auto text-purple-500 mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">
            {leaderboard.reduce((sum, x) => sum + (x.won_opportunities || 0), 0)}
          </div>
          <div className="text-slate-600 text-sm">Total Wins</div>
        </SurfaceCard>
      </div>

      {/* Leaderboard */}
      <SurfaceCard>
        <div className="text-2xl font-bold text-[#20364D] mb-6">Sales Leaderboard</div>
        
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No sales performance data available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((person, index) => (
              <div 
                key={person.sales_user_id} 
                className={`rounded-2xl border p-5 ${index === 0 ? "bg-[#F4E7BF]/30 border-[#D4A843]/30" : "bg-white"}`}
                data-testid={`leaderboard-item-${person.sales_user_id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                      index === 0 ? "bg-[#D4A843] text-white" :
                      index === 1 ? "bg-slate-400 text-white" :
                      index === 2 ? "bg-amber-600 text-white" :
                      "bg-slate-200 text-slate-700"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-[#20364D]">{person.sales_name}</div>
                      <div className="text-sm text-slate-500">{person.sales_email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-[#20364D]">{person.efficiency_score}</div>
                      <div className="text-xs text-slate-500">Efficiency</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{person.close_rate}%</div>
                      <div className="text-xs text-slate-500">Close Rate</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-blue-600">{person.response_speed_score}</div>
                      <div className="text-xs text-slate-500">Speed Score</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-purple-600">{person.customer_rating_score}</div>
                      <div className="text-xs text-slate-500">Rating Score</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-slate-700">{person.open_workload}</div>
                      <div className="text-xs text-slate-500">Open Work</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Efficiency */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Efficiency Score</span>
                    <span>{person.efficiency_score} / 100</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        person.efficiency_score >= 70 ? "bg-emerald-500" :
                        person.efficiency_score >= 50 ? "bg-[#D4A843]" :
                        "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(person.efficiency_score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
