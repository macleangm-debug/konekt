import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  Loader2, DollarSign, ShoppingCart, Users, UserPlus, Network,
  AlertTriangle, CheckCircle, Clock, CreditCard, MapPin, Tag,
  ExternalLink, Trophy, TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SEV_STYLES = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function WeeklyDigestPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/weekly-digest/snapshot");
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center text-slate-500">
        Failed to load digest. Please try again.
      </div>
    );
  }

  const k = data.kpis || {};
  const ops = data.operations || {};
  const sales = data.sales || {};
  const eco = data.ecosystem || {};
  const aff = data.affiliates || {};

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="weekly-digest-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Operations Report</h1>
          <p className="text-sm text-slate-500 mt-1">{data.week_start} — {data.week_end}</p>
        </div>
        <div className="text-[10px] text-slate-400">
          Generated {new Date(data.generated_at).toLocaleString()}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="digest-kpis">
        <KpiCard icon={DollarSign} label="Revenue" value={`TZS ${(k.revenue || 0).toLocaleString()}`} />
        <KpiCard icon={ShoppingCart} label="Orders" value={k.orders || 0} />
        <KpiCard icon={Users} label="Customers" value={k.customers || 0} />
        <KpiCard icon={UserPlus} label="Affiliates" value={aff.active || 0} />
        <KpiCard icon={Network} label="Partner Util" value={`${k.active_partners_pct || 0}%`} severity={k.active_partners_pct < 50 ? "warning" : ""} />
        <KpiCard icon={AlertTriangle} label="Alerts" value={k.critical_alerts || 0} severity={k.critical_alerts > 0 ? "critical" : ""} />
      </div>

      {/* Revenue Breakdown */}
      <Section title="Revenue Breakdown" subtitle="By category">
        {data.revenue_breakdown?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Category</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue_breakdown.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 capitalize text-slate-700">{r.category}</td>
                    <td className="py-2 text-right font-semibold text-[#20364D]">TZS {r.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-500">{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase">Highlights</div>
              {data.revenue_breakdown[0] && (
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500 mt-0.5 rotate-180" />
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold capitalize">{data.revenue_breakdown[0].category}</span> leads at {data.revenue_breakdown[0].pct}%
                  </div>
                </div>
              )}
              {data.revenue_breakdown.length > 1 && data.revenue_breakdown[data.revenue_breakdown.length - 1].pct < 15 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold capitalize">{data.revenue_breakdown[data.revenue_breakdown.length - 1].category}</span> is underperforming at {data.revenue_breakdown[data.revenue_breakdown.length - 1].pct}%
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No revenue data for this period</p>
        )}
      </Section>

      {/* Operations Health */}
      <Section title="Operations Health" subtitle="Issues requiring attention">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HealthCard label="Pending Payments" value={ops.pending_payments || 0} severity={ops.pending_payments > 5 ? "critical" : ops.pending_payments > 0 ? "warning" : "ok"} icon={CreditCard} />
          <HealthCard label="Overdue Follow-Ups" value={ops.overdue_followups || 0} severity={ops.overdue_followups > 10 ? "critical" : ops.overdue_followups > 0 ? "warning" : "ok"} icon={Clock} />
          <HealthCard label="Stale Leads" value={ops.stale_leads || 0} severity={ops.stale_leads > 5 ? "warning" : "ok"} icon={Users} />
          <HealthCard label="Unassigned Tasks" value={ops.unassigned_tasks || 0} severity={ops.unassigned_tasks > 0 ? "warning" : "ok"} icon={AlertTriangle} />
        </div>
      </Section>

      {/* Sales Performance */}
      <Section title="Sales Performance" subtitle={`${sales.total_reps || 0} active reps`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5">
          {/* Top Performers */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Top Performers</div>
            {sales.top_reps?.length > 0 ? (
              <div className="space-y-2">
                {sales.top_reps.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#20364D] truncate">{r.name}</div>
                      <div className="text-[10px] text-slate-400">{r.deals} deal{r.deals !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-sm font-bold text-[#20364D]">TZS {r.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No sales data available</p>
            )}
          </div>
          {/* Insights */}
          <div className="space-y-3">
            {sales.lowest_rep && sales.lowest_rep.deals === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-700">Needs Attention</div>
                  <div className="text-xs text-red-600 mt-0.5">{sales.lowest_rep.name} — 0 deals closed</div>
                </div>
              </div>
            )}
            {sales.stuck_deals > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-700">Stuck Deals</div>
                  <div className="text-xs text-amber-600 mt-0.5">{sales.stuck_deals} deals with overdue follow-ups</div>
                </div>
              </div>
            )}
            {!sales.stuck_deals && !sales.lowest_rep?.deals === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div className="text-sm text-emerald-700">All reps performing well this week</div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Partner Ecosystem + Affiliates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Partner Ecosystem" subtitle={`${eco.total_partners || 0} partners`} compact>
          <div className="space-y-2 text-sm">
            <InsightRow icon={CheckCircle} color="emerald" text={`${eco.active_partners || 0} active partners`} />
            {eco.inactive_partners > 0 && <InsightRow icon={AlertTriangle} color="amber" text={`${eco.inactive_partners} inactive partners`} />}
            {eco.regions_without_coverage > 0 && <InsightRow icon={MapPin} color="red" text={`${eco.regions_without_coverage} partners without region coverage`} />}
            {eco.categories_without_partners > 0 && <InsightRow icon={Tag} color="red" text={`${eco.categories_without_partners} partners without category assignment`} />}
            {eco.pending_applications > 0 && <InsightRow icon={UserPlus} color="blue" text={`${eco.pending_applications} pending affiliate applications`} />}
          </div>
        </Section>

        <Section title="Affiliate Performance" subtitle={`${aff.total || 0} affiliates`} compact>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">Total</div>
              <div className="text-xl font-bold text-[#20364D]">{aff.total || 0}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">Active</div>
              <div className="text-xl font-bold text-emerald-600">{aff.active || 0}</div>
            </div>
          </div>
        </Section>
      </div>

      {/* Alerts Summary */}
      {data.alerts?.length > 0 && (
        <Section title="Alerts" subtitle="Top issues this week">
          <div className="space-y-2">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border p-3 ${SEV_STYLES[a.severity] || SEV_STYLES.info}`} data-testid={`digest-alert-${i}`}>
                <div className="flex items-center gap-2">
                  <Badge className={SEV_STYLES[a.severity]}>{a.severity}</Badge>
                  <span className="text-sm">{a.message}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(a.cta)} data-testid={`digest-alert-cta-${i}`}>
                  {a.cta_label} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Action Items */}
      {data.actions?.length > 0 && (
        <Section title="Action Items" subtitle="What to do next">
          <div className="space-y-2">
            {data.actions.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors" data-testid={`digest-action-${i}`}>
                <span className="text-sm text-slate-700">{a.label}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(a.path)}>
                  Open <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* --- Sub-components --- */

function Section({ title, subtitle, children, compact }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, severity }) {
  const border = severity === "critical" ? "border-red-300" : severity === "warning" ? "border-amber-300" : "border-slate-200";
  const color = severity === "critical" ? "text-red-600" : severity === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className={`bg-white rounded-xl border ${border} p-4 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-xl font-bold ${color} mt-1`}>{value}</div>
    </div>
  );
}

function HealthCard({ label, value, severity, icon: Icon }) {
  const bg = severity === "critical" ? "bg-red-50 border-red-200" : severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";
  const color = severity === "critical" ? "text-red-700" : severity === "warning" ? "text-amber-700" : "text-emerald-700";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} /> <span className={color}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {value === 0 && <div className="text-[10px] text-emerald-600 mt-1">All clear</div>}
    </div>
  );
}

function InsightRow({ icon: Icon, color, text }) {
  const colors = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${colors[color] || "text-slate-500"}`} />
      <span className="text-slate-700">{text}</span>
    </div>
  );
}
