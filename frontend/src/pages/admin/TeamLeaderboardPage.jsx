import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Trophy, Users } from "lucide-react";
import safeDisplay from "@/utils/safeDisplay";

export default function TeamLeaderboardPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/supervisor-team/staff-list");
        const list = res.data?.staff || res.data || [];
        const sales = (Array.isArray(list) ? list : []).filter((s) => s.role === "sales");
        sales.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
        setStaff(sales);
      } catch { setStaff([]); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="leaderboard-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Leaderboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Top performing sales team members</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading leaderboard...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="leaderboard-empty">
          <Trophy className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No leaderboard data yet</p>
          <p className="text-xs text-slate-400 mt-1">Rankings will appear when sales activity begins</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="leaderboard-list">
          {staff.map((s, i) => (
            <div
              key={s.id || i}
              className={`flex items-center gap-4 bg-white rounded-xl border p-4 ${i === 0 ? "border-[#D4A843] bg-amber-50/30" : "border-slate-200"}`}
              data-testid={`leaderboard-rank-${i + 1}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${i === 0 ? "bg-[#D4A843] text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#20364D]">{safeDisplay(s.name || s.full_name)}</div>
                <div className="text-xs text-slate-400">{safeDisplay(s.email)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#20364D]">TZS {(s.revenue || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-400">{s.deals_closed || 0} deals</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
