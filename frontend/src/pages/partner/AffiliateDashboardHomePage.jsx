import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import partnerApi from "../../lib/partnerApi";
import {
  Wallet, Clock, CheckCircle, TrendingUp, Share2,
  Copy, ExternalLink, Loader2, Gift, Users,
  DollarSign, Zap, ChevronRight, BarChart3,
  Megaphone, ArrowRight, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortMoney(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
  return money(v);
}

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AffiliateDashboardHomePage() {
  const [products, setProducts] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState({});
  const [charts, setCharts] = useState({});
  const [promoCode, setPromoCode] = useState("KONEKT");
  const [affiliateName, setAffiliateName] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promoRes, earningsRes, profileRes] = await Promise.all([
        partnerApi.get("/api/affiliate/product-promotions").catch(() => ({ data: { products: [], promo_code: "KONEKT" } })),
        partnerApi.get("/api/affiliate/earnings-summary").catch(() => ({ data: { summary: {}, earnings: [], charts: {} } })),
        partnerApi.get("/api/affiliate/me").catch(() => ({ data: { profile: {} } })),
      ]);

      setProducts(promoRes.data?.products || []);
      setPromoCode(promoRes.data?.promo_code || "KONEKT");
      setSummary(earningsRes.data?.summary || {});
      setEarnings(earningsRes.data?.earnings || []);
      setCharts(earningsRes.data?.charts || {});

      const profile = profileRes.data?.profile || {};
      setAffiliateName(profile.name || "");
      setReferralLink(profile.referral_link || `https://konekt.co.tz/?ref=${promoRes.data?.promo_code || "KONEKT"}`);
    } catch (err) {
      console.error("Failed to load affiliate dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="affiliate-dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="affiliate-dashboard-v2">
      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-[#20364D] to-[#1a2d41] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {affiliateName ? `${affiliateName}'s` : "Your"} Affiliate Hub
            </h1>
            <p className="text-slate-300 mt-1 text-sm">Share products, earn commissions, grow your network</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-xs text-slate-300 uppercase tracking-wider">Promo Code</span>
              <span className="font-bold text-[#D4A843] text-lg">{promoCode}</span>
              <button
                onClick={() => copyToClipboard(promoCode, "promo")}
                className="ml-1 p-1 rounded-lg hover:bg-white/10 transition"
                data-testid="copy-promo-code"
              >
                {copiedId === "promo" ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="affiliate-kpi-row">
        <KpiCard
          icon={<Wallet className="w-5 h-5" />}
          label="Total Earned"
          value={shortMoney(summary.total_earned)}
          sub={`${summary.referral_count || 0} referrals`}
          color="text-emerald-600"
          testId="kpi-total-earned"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending Payout"
          value={shortMoney(summary.pending_payout)}
          sub="Awaiting payout"
          color="text-amber-600"
          testId="kpi-pending-payout"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Paid Out"
          value={shortMoney(summary.paid_out)}
          sub="Already paid"
          color="text-blue-600"
          testId="kpi-paid-out"
        />
        <KpiCard
          icon={<Megaphone className="w-5 h-5" />}
          label="Active Promos"
          value={summary.active_promotions || 0}
          sub={`${summary.successful_orders || 0} conversions`}
          color="text-purple-600"
          testId="kpi-active-promos"
        />
      </div>

      {/* ═══ EARNINGS SUMMARY ═══ */}
      <div className="grid grid-cols-3 gap-3" data-testid="earnings-summary-cards">
        <div className="bg-white border rounded-xl p-4 text-center" data-testid="earn-expected">
          <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expected</p>
          <p className="text-lg font-bold text-blue-600 mt-0.5">{shortMoney(summary.expected)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center" data-testid="earn-pending">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Payout</p>
          <p className="text-lg font-bold text-amber-600 mt-0.5">{shortMoney(summary.pending_payout)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center" data-testid="earn-paid">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Paid</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{shortMoney(summary.paid_out)}</p>
        </div>
      </div>

      {/* ═══ SHARE & MOTIVATE + REFERRAL ═══ */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Referral Card */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-5" data-testid="referral-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#D4A843] text-white flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-[#20364D]">Your Referral Tools</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Promo Code</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#20364D]">{promoCode}</span>
                <button onClick={() => copyToClipboard(promoCode, "promo2")} className="p-1.5 rounded-lg bg-[#D4A843]/10 hover:bg-[#D4A843]/20 transition" data-testid="copy-promo-2">
                  {copiedId === "promo2" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-[#D4A843]" />}
                </button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Referral Link</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 truncate flex-1">{referralLink}</span>
                <button onClick={() => copyToClipboard(referralLink, "link")} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition flex-shrink-0" data-testid="copy-referral-link">
                  {copiedId === "link" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              </div>
            </div>
            <div className="bg-[#20364D]/5 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-[#20364D]">How it works</p>
              <p className="text-[11px] text-slate-500">Share your code or link. When a customer uses it, their discount and your commission are calculated automatically.</p>
            </div>
          </div>
        </div>

        {/* Products to Share */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-5" data-testid="products-to-share">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A843]" />
              <h2 className="text-base font-bold text-[#20364D]">Products to Share</h2>
              <span className="text-xs text-slate-400">({products.length})</span>
            </div>
            <Link to="/partner/affiliate-promotions" className="text-xs text-slate-500 hover:text-[#20364D] transition flex items-center gap-1">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Share2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No products available to share yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {products.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition group" data-testid={`promo-product-${p.id}`}>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0 overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : (p.product_name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#20364D] truncate">{p.product_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {money(p.final_price)} • You earn <span className="font-semibold text-emerald-600">{money(p.affiliate_amount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {p.captions?.[0]?.text && (
                      <button
                        onClick={() => copyToClipboard(p.captions[0].text, `caption-${p.id}`)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                        title="Copy caption"
                        data-testid={`copy-caption-${p.id}`}
                      >
                        {copiedId === `caption-${p.id}` ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}${p.share_link}`, `share-${p.id}`)}
                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
                      title="Copy share link"
                      data-testid={`share-link-${p.id}`}
                    >
                      {copiedId === `share-${p.id}` ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <ExternalLink className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RECENT EARNINGS TABLE ═══ */}
      <div className="bg-white border rounded-xl p-5" data-testid="earnings-table-section">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#20364D]">Recent Earnings</h2>
          <Link to="/partner/affiliate-earnings" className="text-xs text-slate-500 hover:text-[#20364D] transition flex items-center gap-1">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {earnings.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No earnings yet. Start sharing to earn!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="earnings-table">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Order</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Commission</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Status</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.slice(0, 10).map((e, i) => (
                  <tr key={e.id || i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{e.order_number}</td>
                    <td className="py-2.5 text-slate-700">{e.client_name || "—"}</td>
                    <td className="py-2.5 text-right font-bold text-[#D4A843]">{money(e.affiliate_amount)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] || STATUS_COLORS.pending}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-xs text-slate-400">{e.date_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ TREND CHARTS ═══ */}
      <TrendChartsSection charts={charts} />

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/partner/affiliate-promotions" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-promotions">
          <Megaphone className="w-4 h-4 text-[#20364D]" /> Promotions
        </Link>
        <Link to="/partner/affiliate-earnings" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-earnings">
          <DollarSign className="w-4 h-4 text-[#20364D]" /> Earnings
        </Link>
        <Link to="/partner/affiliate-payouts" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-payouts">
          <Wallet className="w-4 h-4 text-[#20364D]" /> Payouts
        </Link>
        <Link to="/partner/affiliate-performance" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-performance">
          <BarChart3 className="w-4 h-4 text-[#20364D]" /> Performance
        </Link>
      </div>
    </div>
  );
}


/* ═══ SUB-COMPONENTS ═══ */

function TrendChartsSection({ charts }) {
  const earningsTrend = charts?.earnings_trend || [];
  const conversionsTrend = charts?.conversions_trend || [];

  return (
    <div className="grid md:grid-cols-2 gap-4" data-testid="affiliate-trend-charts">
      {/* Earnings Trend */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-earnings-trend">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-[#20364D] text-sm">Earnings Trend (6 months)</h3>
        </div>
        {earningsTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={earningsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v, name) => [shortMoney(v), name === "earned" ? "Earned" : "Paid"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="earned" name="Earned" fill="#D4A843" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>

      {/* Conversions Trend */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-conversions-trend">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold text-[#20364D] text-sm">Conversions (6 months)</h3>
        </div>
        {conversionsTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={conversionsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
              <Line type="monotone" dataKey="orders" name="Orders" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 4, fill: "#7C3AED" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, testId }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <div className={color || "text-slate-400"}>{icon}</div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#20364D]">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
