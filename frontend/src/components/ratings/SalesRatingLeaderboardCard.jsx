import React, { useEffect, useState } from "react";
import { Trophy, Star, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function SalesRatingLeaderboardCard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/api/sales-ratings/leaderboard`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => setRows(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-[2rem] border bg-white p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="sales-leaderboard">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-amber-600" />
        </div>
        <div className="text-2xl font-bold text-[#20364D]">Top Rated Sales Advisors</div>
      </div>

      <div className="space-y-3">
        {rows.slice(0, 5).map((row, idx) => (
          <div 
            key={row.sales_owner_id} 
            className={`rounded-xl p-4 flex items-center justify-between gap-4 ${
              idx === 0 ? "bg-amber-50 border border-amber-200" : "bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? "bg-amber-500 text-white" : 
                idx === 1 ? "bg-slate-400 text-white" :
                idx === 2 ? "bg-amber-700 text-white" :
                "bg-slate-200 text-slate-600"
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-[#20364D]">{row.sales_owner_name}</div>
                <div className="text-sm text-slate-500 mt-1">{row.ratings_count} ratings</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-xl font-bold text-[#20364D]">{row.average_rating}</span>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="text-center py-8 text-slate-500">
            No sales ratings yet. Ratings will appear here after orders are completed.
          </div>
        )}
      </div>
    </div>
  );
}
