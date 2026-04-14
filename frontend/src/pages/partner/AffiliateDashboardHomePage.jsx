import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, Clock, CheckCircle, TrendingUp, Share2,
  Copy, Loader2, Users, DollarSign, ChevronRight,
  Megaphone, Sparkles, Target, Bell, Download,
  AlertTriangle, Shield
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import api from "../../lib/api";
import AffiliateSetupWizard from "../../components/affiliate/AffiliateSetupWizard";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortMoney(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
  return money(v);
}

function getToken() {
  return localStorage.getItem("konekt_token") || localStorage.getItem("partner_token") || localStorage.getItem("konekt_admin_token");
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STATUS_BADGE = {
  active: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
  warning: { bg: "bg-amber-100", text: "text-amber-700", label: "Warning" },
  probation: { bg: "bg-red-100", text: "text-red-700", label: "Probation" },
  suspended: { bg: "bg-slate-200", text: "text-slate-600", label: "Suspended" },
};

export default function AffiliateDashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(null);
  const [status, setStatus] = useState({});
  const [performance, setPerformance] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [notifications, setNotifications] = useState({ notifications: [], unread_count: 0 });
  const [wallet, setWallet] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const headers = authHeader();
      const [statusRes, perfRes, campRes, notifRes, walletRes] = await Promise.all([
        api.get("/api/affiliate-program/my-status", { headers }).catch(() => ({ data: {} })),
        api.get("/api/affiliate-program/my-performance", { headers }).catch(() => ({ data: {} })),
        api.get("/api/affiliate-program/campaigns", { headers }).catch(() => ({ data: { campaigns: [], promo_code: "" } })),
        api.get("/api/affiliate-program/notifications", { headers }).catch(() => ({ data: { notifications: [], unread_count: 0 } })),
        api.get("/api/affiliate/wallet", { headers }).catch(() => ({ data: {} })),
      ]);
      setStatus(statusRes.data || {});
      setSetupComplete(statusRes.data?.setup_complete ?? true);
      setPerformance(perfRes.data || {});
      setCampaigns(campRes.data?.campaigns || []);
      setNotifications(notifRes.data || { notifications: [], unread_count: 0 });
      setWallet(walletRes.data || {});
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickShare = (campaign) => {
    copy(campaign.caption, `quick-${campaign.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="affiliate-dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (setupComplete === false) {
    return <AffiliateSetupWizard onComplete={() => { setSetupComplete(true); loadAll(); }} />;
  }

  const perfStatus = STATUS_BADGE[status.performance_status] || STATUS_BADGE.active;

  return (
    <div className="space-y-5" data-testid="affiliate-dashboard-v2">
      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-[#20364D] to-[#1a2d41] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {status.name ? `${status.name}'s` : "Your"} Affiliate Hub
            </h1>
            <p className="text-slate-300 mt-1 text-sm">Share products, earn commissions, grow your network</p>
          </div>
          <div className="flex gap-2 items-center">
            {notifications.unread_count > 0 && (
              <div className="relative" data-testid="notif-badge">
                <Bell className="w-5 h-5 text-slate-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {notifications.unread_count}
                </span>
              </div>
            )}
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${perfStatus.bg} ${perfStatus.text}`} data-testid="performance-badge">
              {perfStatus.label}
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-xs text-slate-300 uppercase tracking-wider">Code</span>
              <span className="font-bold text-[#D4A843] text-lg" data-testid="header-promo-code">{status.affiliate_code || "—"}</span>
              <button onClick={() => copy(status.affiliate_code, "header-code")} className="ml-1 p-1 rounded-lg hover:bg-white/10 transition" data-testid="copy-header-code">
                {copiedId === "header-code" ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STATUS ALERTS ═══ */}
      {status.performance_status === "warning" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3" data-testid="warning-alert">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Performance Warning</p>
            <p className="text-xs text-amber-600 mt-0.5">You are below your target. Increase sharing activity to stay on track.</p>
          </div>
        </div>
      )}
      {status.performance_status === "probation" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" data-testid="probation-alert">
          <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Account at Risk</p>
            <p className="text-xs text-red-600 mt-0.5">Your performance is significantly below target. Immediate action required to avoid suspension.</p>
          </div>
        </div>
      )}

      {/* ═══ EARNINGS KPI ROW ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="affiliate-kpi-row">
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Earnings This Month" value={shortMoney(performance.actuals?.total_earnings)} color="text-emerald-600" testId="kpi-earnings-month" />
        <KpiCard icon={<Wallet className="w-5 h-5" />} label="Total Earnings" value={shortMoney(performance.actuals?.total_earnings)} color="text-blue-600" testId="kpi-total-earnings" />
        <KpiCard icon={<Clock className="w-5 h-5" />} label="Pending Earnings" value={shortMoney(performance.actuals?.pending_earnings)} color="text-amber-600" testId="kpi-pending-earnings" />
        <KpiCard icon={<CheckCircle className="w-5 h-5" />} label="Paid Earnings" value={shortMoney(performance.actuals?.paid_earnings)} color="text-emerald-600" testId="kpi-paid-earnings" />
      </div>

      {/* ═══ TARGET PROGRESS + WALLET ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Target Progress */}
        <div className="bg-white border rounded-xl p-5" data-testid="target-progress">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[#D4A843]" />
            <h2 className="text-base font-bold text-[#20364D]">Target Progress</h2>
            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${perfStatus.bg} ${perfStatus.text}`}>
              {performance.contract_label || "Starter"} Tier
            </span>
          </div>
          <div className="space-y-4">
            <ProgressBar
              label="Deals Completed"
              current={performance.actuals?.total_deals || 0}
              target={performance.targets?.min_deals || 5}
              pct={performance.progress?.deals_pct || 0}
              testId="progress-deals"
            />
            <ProgressBar
              label="Earnings"
              current={money(performance.actuals?.total_earnings || 0)}
              target={money(performance.targets?.min_earnings || 50000)}
              pct={performance.progress?.earnings_pct || 0}
              testId="progress-earnings"
            />
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="bg-white border rounded-xl p-5" data-testid="wallet-summary">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-[#D4A843]" />
            <h2 className="text-base font-bold text-[#20364D]">Wallet</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-600 uppercase">Available</p>
              <p className="text-lg font-bold text-emerald-600 mt-1" data-testid="wallet-available">{shortMoney(wallet.available)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-600 uppercase">Pending</p>
              <p className="text-lg font-bold text-amber-600 mt-1" data-testid="wallet-pending">{shortMoney(wallet.pending)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-600 uppercase">Paid Out</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{shortMoney(wallet.paid_out)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-600 uppercase">Min Payout</p>
              <p className="text-lg font-bold text-slate-600 mt-1">{shortMoney(wallet.minimum_payout)}</p>
            </div>
          </div>
          {wallet.can_withdraw && (
            <Link to="/partner/affiliate-payouts">
              <Button className="w-full mt-3 bg-[#D4A843] hover:bg-[#c09a38] text-white" size="sm" data-testid="withdraw-btn">
                Request Withdrawal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ═══ CONTENT STUDIO — CAMPAIGNS ═══ */}
      <div className="bg-white border rounded-xl p-5" data-testid="content-studio">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4A843]" />
            <h2 className="text-base font-bold text-[#20364D]">Content Studio</h2>
            <span className="text-xs text-slate-400">({campaigns.length} products)</span>
          </div>
          <Link to="/partner/affiliate-promotions" className="text-xs text-slate-500 hover:text-[#20364D] transition flex items-center gap-1">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Share2 className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No products available to share yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {campaigns.slice(0, 12).map((c) => (
              <CampaignCard key={c.id} campaign={c} copy={copy} copiedId={copiedId} quickShare={quickShare} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ NOTIFICATIONS ═══ */}
      {notifications.notifications.length > 0 && (
        <div className="bg-white border rounded-xl p-5" data-testid="notifications-section">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[#D4A843]" />
            <h2 className="text-base font-bold text-[#20364D]">Notifications</h2>
            {notifications.unread_count > 0 && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{notifications.unread_count} new</span>
            )}
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {notifications.notifications.slice(0, 5).map((n) => (
              <div key={n.id} className={`p-3 rounded-lg border text-sm ${n.is_read ? "bg-white border-slate-100" : "bg-blue-50 border-blue-100"}`} data-testid={`notif-${n.id}`}>
                <p className="font-medium text-[#20364D]">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="quick-actions">
        <Link to="/partner/affiliate-promotions" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-promotions">
          <Megaphone className="w-4 h-4 text-[#20364D]" /> Promotions
        </Link>
        <Link to="/partner/affiliate-earnings" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-earnings">
          <DollarSign className="w-4 h-4 text-[#20364D]" /> Earnings
        </Link>
        <Link to="/partner/affiliate-payouts" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-payouts">
          <Wallet className="w-4 h-4 text-[#20364D]" /> Payouts
        </Link>
        <Link to="/partner/affiliate-profile" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-profile">
          <Users className="w-4 h-4 text-[#20364D]" /> Profile
        </Link>
      </div>
    </div>
  );
}


/* ═══ SUB-COMPONENTS ═══ */

function CampaignCard({ campaign, copy, copiedId, quickShare }) {
  const c = campaign;
  return (
    <div className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition group" data-testid={`campaign-${c.id}`}>
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0 overflow-hidden">
          {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : (c.name || "?")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#20364D] truncate">{c.name}</p>
          <p className="text-xs text-slate-500">{money(c.selling_price)}</p>
          {c.savings > 0 && (
            <p className="text-[10px] font-semibold text-red-500">Save TZS {c.savings.toLocaleString()}</p>
          )}
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">You earn {money(c.your_earning)}</p>
        </div>
      </div>
      <div className="flex gap-1.5 mt-2.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          onClick={() => copy(c.caption, `caption-${c.id}`)}
          data-testid={`copy-caption-${c.id}`}
        >
          {copiedId === `caption-${c.id}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
          Caption
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          onClick={() => copy(c.product_link, `link-${c.id}`)}
          data-testid={`copy-link-${c.id}`}
        >
          {copiedId === `link-${c.id}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
          Link
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs h-8 bg-[#D4A843] hover:bg-[#c09a38] text-white"
          onClick={() => quickShare(c)}
          data-testid={`quick-share-${c.id}`}
        >
          <Share2 className="w-3 h-3 mr-1" /> Quick Share
        </Button>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, testId }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <div className={color || "text-slate-400"}>{icon}</div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#20364D]">{value}</div>
    </div>
  );
}

function ProgressBar({ label, current, target, pct, testId }) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor = clampedPct >= 80 ? "bg-emerald-500" : clampedPct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-400">{typeof current === 'number' ? current : current} / {typeof target === 'number' ? target : target}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${clampedPct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 text-right">{clampedPct.toFixed(0)}%</p>
    </div>
  );
}
