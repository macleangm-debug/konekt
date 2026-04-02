import React from "react";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    <div className="space-y-1" data-testid={`breakdown-row-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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

export default function PerformanceBreakdownDrawer({ open, onClose, data }) {
  if (!data) return null;
  const zb = ZONE_BADGES[data.performance_zone] || ZONE_BADGES.developing;
  const score = data.performance_score ?? 0;

  return (
    <StandardDrawerShell open={open} onClose={onClose} title={data.sales_name || data.vendor_name || data.name || "Performance"} subtitle="Performance Breakdown">
      {/* Score Header */}
      <div className="flex items-center gap-4 mb-6" data-testid="performance-header">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#20364D]">
          <span className="text-3xl font-extrabold text-white">{score}%</span>
        </div>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${zb.bg}`}>{zb.label}</span>
          <p className="text-sm text-slate-500 mt-1">Based on {data.sample_size || 0} data points</p>
          {data.last_updated && (
            <p className="text-[10px] text-slate-400 mt-0.5" data-testid="performance-last-updated">
              Last updated: {new Date(data.last_updated).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Breakdown Bars */}
      <div className="space-y-4 mb-6" data-testid="performance-breakdown">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score Breakdown</h3>
        {(data.breakdown || []).map((b) => (
          <BarRow key={b.label} label={b.label} rawScore={b.raw_score} weight={b.weight} weighted={b.weighted} />
        ))}
      </div>

      {/* Tips */}
      {data.tips?.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4" data-testid="performance-tips">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Improvement Tips</h3>
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
    </StandardDrawerShell>
  );
}
