import React, { useEffect, useState, useCallback } from "react";
import { Star, Users, TrendingUp, AlertTriangle, MessageSquare, CheckCircle, Loader2, Send } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

export default function AdminSalesRatingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [reviewNote, setReviewNote] = useState({});
  const [reviewing, setReviewing] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/discount-analytics/sales-ratings?days=${days}`);
      setData(res.data);
    } catch (e) {
      console.error("Failed to load ratings:", e);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (orderNumber) => {
    setReviewing(orderNumber);
    try {
      await api.put(`/api/admin/discount-analytics/sales-ratings/${orderNumber}/review`, {
        admin_note: reviewNote[orderNumber] || "",
      });
      toast.success("Rating marked as reviewed");
      load();
    } catch {
      toast.error("Failed to review rating");
    }
    setReviewing("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!data?.ok) {
    return <div className="text-center text-slate-400 py-12">Failed to load ratings data.</div>;
  }

  const { kpis, reps_table, low_alerts, trend, recent_feedback } = data;

  return (
    <div className="space-y-6 max-w-[1400px]" data-testid="admin-sales-ratings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Sales Ratings & Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">Team performance quality and customer satisfaction</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/40 outline-none"
          data-testid="days-filter"
        >
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="ratings-kpi-row">
        <KpiCard
          label="Avg Team Rating"
          value={kpis.avg_team_rating > 0 ? `${kpis.avg_team_rating} / 5` : "—"}
          icon={<Star className="w-5 h-5" />}
          accent="text-[#D4A843]"
        />
        <KpiCard
          label="Total Ratings"
          value={kpis.total_ratings}
          icon={<Users className="w-5 h-5" />}
          accent="text-blue-600"
        />
        <KpiCard
          label="Highest Rated"
          value={kpis.highest_rep ? `${kpis.highest_rep.name}` : "—"}
          sub={kpis.highest_rep ? `${kpis.highest_rep.avg} / 5` : ""}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="text-emerald-600"
        />
        <KpiCard
          label="Lowest Rated"
          value={kpis.lowest_rep ? `${kpis.lowest_rep.name}` : "—"}
          sub={kpis.lowest_rep ? `${kpis.lowest_rep.avg} / 5` : ""}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="text-red-500"
        />
      </div>

      {/* Low Rating Alerts */}
      {low_alerts.length > 0 && (
        <div className="bg-white border rounded-xl p-5" data-testid="low-rating-alerts">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
            <h2 className="text-base font-bold text-[#0f172a]">Low Rating Alerts</h2>
            <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
              {low_alerts.filter(a => !a.reviewed).length} unreviewed
            </span>
          </div>
          <div className="space-y-3">
            {low_alerts.map((alert, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${alert.reviewed ? "border-slate-100 bg-slate-50/50" : "border-red-100 bg-red-50/40"}`}
                data-testid={`low-alert-${alert.order_number}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= alert.stars ? "fill-red-400 text-red-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#20364D]">{alert.customer_name}</span>
                      <span className="text-[10px] text-slate-400">#{alert.order_number}</span>
                      <span className="text-[10px] text-slate-400">{alert.rated_at}</span>
                      {alert.reviewed && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Reviewed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">Sales: <strong>{alert.sales_rep}</strong></p>
                    {alert.comment && <p className="text-sm text-red-700 italic">"{alert.comment}"</p>}
                    {alert.admin_note && <p className="text-xs text-slate-500 mt-1 bg-slate-100 px-2 py-1 rounded">Admin: {alert.admin_note}</p>}
                  </div>
                  {!alert.reviewed && (
                    <div className="shrink-0 flex flex-col gap-1.5">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={reviewNote[alert.order_number] || ""}
                        onChange={(e) => setReviewNote({ ...reviewNote, [alert.order_number]: e.target.value })}
                        className="w-40 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#D4A843]/40 outline-none"
                        data-testid={`review-note-${alert.order_number}`}
                      />
                      <button
                        onClick={() => handleReview(alert.order_number)}
                        disabled={reviewing === alert.order_number}
                        className="flex items-center justify-center gap-1 rounded-lg bg-[#20364D] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#2a4a66] disabled:opacity-50 transition"
                        data-testid={`review-btn-${alert.order_number}`}
                      >
                        {reviewing === alert.order_number ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Mark Reviewed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ratings by Sales Rep + Rating Trend */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Rep Table */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-5" data-testid="ratings-by-rep">
          <h2 className="text-base font-bold text-[#0f172a] mb-4">Ratings by Sales Rep</h2>
          {reps_table.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No rated orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-slate-400 uppercase tracking-wider border-b">
                    <th className="pb-2 text-left">Sales Rep</th>
                    <th className="pb-2 text-right">Avg Rating</th>
                    <th className="pb-2 text-right">Ratings</th>
                    <th className="pb-2 text-right">Deals</th>
                    <th className="pb-2 text-right">Last Rated</th>
                  </tr>
                </thead>
                <tbody>
                  {reps_table.map((rep, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0" data-testid={`rep-row-${i}`}>
                      <td className="py-2.5 font-semibold text-[#20364D]">{rep.name}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-1">
                          <Star className={`w-3.5 h-3.5 ${rep.avg_rating >= 4 ? "fill-[#D4A843] text-[#D4A843]" : rep.avg_rating >= 3 ? "fill-amber-400 text-amber-400" : "fill-red-400 text-red-400"}`} />
                          <span className="font-semibold">{rep.avg_rating}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600">{rep.ratings_count}</td>
                      <td className="py-2.5 text-right text-slate-600">{rep.deals_closed}</td>
                      <td className="py-2.5 text-right text-slate-400 text-xs">{rep.last_rating_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rating Trend */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-5" data-testid="rating-trend">
          <h2 className="text-base font-bold text-[#0f172a] mb-4">Rating Trend</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No trend data available.</p>
          ) : (
            <div className="space-y-2">
              {trend.slice(-14).map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-slate-400 shrink-0">{t.date.slice(5)}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D4A843] to-[#e8c869] transition-all"
                      style={{ width: `${(t.avg / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-[#20364D]">{t.avg}</span>
                  <span className="w-6 text-right text-slate-400">({t.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white border rounded-xl p-5" data-testid="recent-feedback">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4.5 h-4.5 text-[#D4A843]" />
          <h2 className="text-base font-bold text-[#0f172a]">Recent Feedback</h2>
        </div>
        {recent_feedback.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No feedback received yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {recent_feedback.map((fb, i) => {
              const borderColor = fb.sentiment === "positive" ? "border-l-emerald-400" : fb.sentiment === "negative" ? "border-l-red-400" : "border-l-slate-300";
              return (
                <div
                  key={i}
                  className={`rounded-xl border border-l-4 ${borderColor} p-3`}
                  data-testid={`feedback-${i}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= fb.stars ? "fill-[#D4A843] text-[#D4A843]" : "text-slate-200"}`} />
                      ))}
                    </div>
                    <span className="ml-auto text-[10px] text-slate-400">{fb.rated_at}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#20364D]">{fb.customer_name}</p>
                  <p className="text-[10px] text-slate-400">#{fb.order_number} · Sales: {fb.sales_rep}</p>
                  {fb.comment && <p className="text-xs text-slate-600 italic mt-1">"{fb.comment}"</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent = "text-[#D4A843]" }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className="text-xl font-bold text-[#0f172a] truncate">{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
