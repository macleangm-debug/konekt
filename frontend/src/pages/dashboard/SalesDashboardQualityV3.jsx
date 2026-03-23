import React, { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import axios from "axios";
import SalespersonScoreCard from "../../components/ratings/SalespersonScoreCard";
import SalesRatingLeaderboardCard from "../../components/ratings/SalesRatingLeaderboardCard";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function SalesDashboardQualityV3({ salesOwnerId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use salesOwnerId from props or get from user context
  const effectiveSalesOwnerId = salesOwnerId || "demo-sales";

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/api/sales-ratings/summary?sales_owner_id=${effectiveSalesOwnerId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => setSummary(res.data || null))
      .finally(() => setLoading(false));
  }, [effectiveSalesOwnerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="sales-quality-dashboard">
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8" />
          <div className="text-4xl font-bold">Sales Quality Dashboard</div>
        </div>
        <div className="text-slate-200 mt-3">Customer ratings now help measure clarity, professionalism, and follow-up quality.</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SalespersonScoreCard summary={summary} />
        <SalesRatingLeaderboardCard />
      </div>
    </div>
  );
}
