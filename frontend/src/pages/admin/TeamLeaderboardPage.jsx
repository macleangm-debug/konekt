import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Trophy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeamLeaderboardPage() {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/team-performance/summary");
      setReps(res.data?.reps || []);
    } catch { setReps([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const RANK_STYLES = {
    1: "bg-amber-50 border-amber-300",
    2: "bg-slate-50 border-slate-300",
    3: "bg-orange-50 border-orange-200",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="team-leaderboard-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Leaderboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ranked sales performance — deals, revenue, rating, and commission</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : reps.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="leaderboard-empty">
          <Trophy className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No performance data yet</p>
        </div>
      ) : (
        <>
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="top-3">
            {reps.slice(0, 3).map((r) => (
              <div key={r.id} className={`rounded-xl border-2 p-5 ${RANK_STYLES[r.rank] || "bg-white border-slate-200"}`} data-testid={`top-${r.rank}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    r.rank === 1 ? "bg-amber-500 text-white" : r.rank === 2 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"
                  }`}>
                    {r.rank}
                  </div>
                  <div>
                    <div className="font-bold text-[#20364D]">{r.name}</div>
                    <Badge className={`text-[10px] mt-0.5 ${
                      r.label === "Top Performer" ? "bg-emerald-100 text-emerald-700" :
                      r.label === "Strong" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{r.label}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Deals</span><div className="font-bold text-[#20364D]">{r.deals_won}</div></div>
                  <div><span className="text-slate-400">Revenue</span><div className="font-bold text-[#20364D]">TZS {(r.revenue || 0).toLocaleString()}</div></div>
                  <div><span className="text-slate-400">Conv %</span><div className="font-bold text-[#20364D]">{r.conversion_rate}%</div></div>
                  <div><span className="text-slate-400">Rating</span><div className="font-bold text-amber-600">{r.avg_rating > 0 ? r.avg_rating : "—"}</div></div>
                </div>
                <div className="mt-3 text-right text-xs text-slate-400">Score: <span className="font-bold text-[#20364D]">{r.score}</span></div>
              </div>
            ))}
          </div>

          {/* Full Ranking Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="leaderboard-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase w-14">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Rep</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Deals</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Revenue</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Conv %</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Rating</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Overdue</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Score</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`lb-row-${r.rank}`}>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                          r.rank === 1 ? "bg-amber-500 text-white" : r.rank === 2 ? "bg-slate-400 text-white" : r.rank === 3 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"
                        }`}>{r.rank}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#20364D]">{r.name}</td>
                      <td className="px-3 py-3 text-right font-semibold">{r.deals_won}</td>
                      <td className="px-3 py-3 text-right font-semibold">TZS {(r.revenue || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{r.conversion_rate}%</td>
                      <td className="px-3 py-3 text-right text-amber-600 font-semibold">{r.avg_rating > 0 ? r.avg_rating : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {r.overdue_followups > 0 ? <span className="text-red-600 font-semibold">{r.overdue_followups}</span> : <span className="text-emerald-500 text-xs">Clear</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#20364D]">{r.score}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={`text-[10px] ${
                          r.label === "Top Performer" ? "bg-emerald-100 text-emerald-700" :
                          r.label === "Strong" ? "bg-blue-100 text-blue-700" :
                          r.label === "Improving" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        } hover:opacity-90`}>{r.label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
