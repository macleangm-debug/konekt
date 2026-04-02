import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, BarChart3, Activity, Database, Clock } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

const ZONE_BADGES = {
  excellent: { bg: "bg-emerald-100 text-emerald-700", label: "Excellent" },
  safe: { bg: "bg-blue-100 text-blue-700", label: "Safe" },
  risk: { bg: "bg-red-100 text-red-700", label: "Risk" },
  developing: { bg: "bg-slate-100 text-slate-500", label: "Developing" },
};

const ZONE_ACCENTS = {
  excellent: { border: "border-emerald-200", iconBg: "bg-emerald-100", text: "text-emerald-700" },
  safe: { border: "border-blue-200", iconBg: "bg-blue-100", text: "text-blue-700" },
  risk: { border: "border-red-200", iconBg: "bg-red-100", text: "text-red-700" },
  developing: { border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-500" },
};

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${accent.border}`} data-testid={`vendor-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent.iconBg}`}>
        <Icon className={`h-5 w-5 ${accent.text}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

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

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

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
    return (
      <div className="space-y-5" data-testid="vendor-perf-loading">
        <div><h1 className="text-2xl font-bold text-[#20364D]">My Performance</h1><p className="mt-0.5 text-sm text-slate-500">Your operational performance score and breakdown.</p></div>
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading performance data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5" data-testid="vendor-perf-empty">
        <div><h1 className="text-2xl font-bold text-[#20364D]">My Performance</h1><p className="mt-0.5 text-sm text-slate-500">Your operational performance score and breakdown.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No performance data available yet.</p>
          <p className="text-sm text-slate-400 mt-1">Complete orders to build your performance score.</p>
        </div>
      </div>
    );
  }

  const zb = ZONE_BADGES[data.performance_zone] || ZONE_BADGES.developing;
  const za = ZONE_ACCENTS[data.performance_zone] || ZONE_ACCENTS.developing;
  const score = data.performance_score ?? 0;

  return (
    <div className="space-y-5" data-testid="vendor-my-performance-page">
      {/* Header — matches partner shell standard */}
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">My Performance</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your operational performance score and breakdown.</p>
      </div>

      {/* KPI stat cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="vendor-perf-stats">
        <StatCard label="Performance" value={`${score}%`} icon={BarChart3} accent={za} />
        <StatCard label="Zone" value={zb.label} icon={Activity} accent={za} />
        <StatCard label="Data Points" value={data.sample_size || 0} icon={Database} accent={{ border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-600" }} />
        <StatCard label="Last Updated" value={fmtDate(data.computed_at)} icon={Clock} accent={{ border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-600" }} />
      </div>

      {/* Metric breakdown card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="vendor-perf-breakdown">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score Breakdown</h3>
        </div>
        <div className="p-5 space-y-4">
          {(data.breakdown || []).map((b) => (
            <BarRow key={b.label} label={b.label} rawScore={b.raw_score} weight={b.weight} weighted={b.weighted} />
          ))}
        </div>
      </div>

      {/* Improvement tips card */}
      {data.tips?.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 shadow-sm" data-testid="vendor-perf-tips">
          <div className="border-b border-blue-100 px-5 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How to Improve</h3>
          </div>
          <div className="p-5">
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
        </div>
      )}
    </div>
  );
}
