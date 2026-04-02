import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Award, BarChart3 } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

const ZONE_BADGES = {
  excellent: { bg: "bg-emerald-100 text-emerald-700", label: "Excellent" },
  safe: { bg: "bg-blue-100 text-blue-700", label: "Safe" },
  risk: { bg: "bg-red-100 text-red-700", label: "Risk" },
  developing: { bg: "bg-slate-100 text-slate-500", label: "Developing" },
};

function BarRow({ label, rawScore, weight, weighted }) {
  const pct = Math.min(rawScore, 100);
  const color = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1" data-testid={`vendor-breakdown-row-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#20364D]">{label}</span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{rawScore}%</span>
          <span className="text-slate-300">x{(weight * 100).toFixed(0)}%</span>
          <span className="font-semibold text-[#20364D]">= {weighted}</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function VendorMyPerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi.get("/api/vendor/my-performance")
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400" data-testid="vendor-perf-loading">Loading performance data...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-20" data-testid="vendor-perf-empty">
        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No performance data available yet.</p>
        <p className="text-sm text-slate-400 mt-1">Complete orders to build your performance score.</p>
      </div>
    );
  }

  const zb = ZONE_BADGES[data.performance_zone] || ZONE_BADGES.developing;
  const score = data.performance_score ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="vendor-my-performance-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">My Performance</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your operational performance score and breakdown.</p>
      </div>

      {/* Score card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="vendor-perf-score-card">
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#20364D]">
            <span className="text-4xl font-extrabold text-white">{score}%</span>
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${zb.bg}`}>{zb.label}</span>
            <p className="text-sm text-slate-500 mt-2">Based on {data.sample_size || 0} data points</p>
            {data.computed_at && (
              <p className="text-[10px] text-slate-400 mt-0.5" data-testid="vendor-perf-last-updated">
                Last updated: {new Date(data.computed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metric breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="vendor-perf-breakdown">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Score Breakdown</h3>
        <div className="space-y-4">
          {(data.breakdown || []).map((b) => (
            <BarRow key={b.label} label={b.label} rawScore={b.raw_score} weight={b.weight} weighted={b.weighted} />
          ))}
        </div>
      </div>

      {/* Improvement tips */}
      {data.tips?.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6" data-testid="vendor-perf-tips">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">How to Improve</h3>
          <ul className="space-y-2">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-blue-400 mt-0.5">
                  {tip.includes("Improve") ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
