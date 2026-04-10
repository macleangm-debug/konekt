import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Copy, Check, Users, Wallet, ArrowRight, Gift, ShoppingCart, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

function StatusBadge({ status }) {
  const map = {
    credited: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Rewarded" },
    pending: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending" },
    signed_up: { bg: "bg-blue-100", text: "text-blue-800", label: "Signed Up" },
    invited: { bg: "bg-slate-100", text: "text-slate-700", label: "Invited" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.text}`} data-testid={`status-badge-${status}`}>
      {s.label}
    </span>
  );
}

function maskName(name) {
  if (!name || name.length < 3) return name || "---";
  return name.slice(0, 2) + "***" + name.slice(-1);
}

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/api/customer/referrals/me");
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const wallet = data?.wallet || { balance: 0, total_earned: 0, total_used: 0 };
  const stats = data?.stats || { total_referrals: 0, successful_referrals: 0, reward_earned: 0 };
  const transactions = data?.referral_transactions || [];
  const referralCode = data?.referral_code || "";
  const referralLink = data?.referral_link || `${window.location.origin}/register?ref=${referralCode}`;
  const maxUsagePct = data?.max_wallet_usage_pct || 30;

  return (
    <div className="space-y-6" data-testid="referrals-page">
      {/* Section 1 — Wallet Summary */}
      <div className="rounded-2xl border bg-white p-6" data-testid="wallet-summary-section">
        <h2 className="text-lg font-bold text-[#2D3E50] mb-4">Wallet Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-[#20364D] to-[#2a4560] p-4 text-white">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Wallet className="w-3.5 h-3.5" />
              Current Balance
            </div>
            <div className="text-2xl font-bold text-[#D4A843]" data-testid="wallet-current-balance">
              {money(wallet.balance)}
            </div>
          </div>
          <div className="rounded-xl border bg-emerald-50 p-4">
            <div className="text-xs text-emerald-600 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-emerald-800" data-testid="wallet-total-earned">
              {money(wallet.total_earned)}
            </div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-xs text-slate-500 mb-1">Total Used</div>
            <div className="text-2xl font-bold text-slate-700" data-testid="wallet-total-used">
              {money(wallet.total_used)}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Wallet rewards can be used for eligible ecosystem fees.
        </p>
      </div>

      {/* Section 2 — Referral Link / Code */}
      <div className="rounded-2xl border bg-white p-6" data-testid="referral-link-section">
        <h2 className="text-lg font-bold text-[#2D3E50] mb-1">Your Referral</h2>
        <p className="text-sm text-slate-500 mb-4">
          Share your link. When someone completes a qualifying purchase, you earn.
        </p>
        <div className="space-y-3">
          {/* Referral Code */}
          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
            <Gift className="w-5 h-5 text-[#D4A843] shrink-0" />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-slate-500">Referral Code</div>
              <div className="mt-1 text-lg font-bold text-slate-900 font-mono tracking-wider">
                {referralCode || "---"}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(referralCode, "code")}
              className="gap-1.5"
              data-testid="copy-referral-code"
            >
              {copiedField === "code" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "code" ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Referral Link */}
          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
            <ArrowRight className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-widest text-slate-500">Referral Link</div>
              <div className="mt-1 text-sm text-slate-700 truncate font-mono">{referralLink}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(referralLink, "link")}
              className="gap-1.5"
              data-testid="copy-referral-link"
            >
              {copiedField === "link" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "link" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 3 — How It Works */}
      <div className="rounded-2xl border bg-white p-6" data-testid="how-it-works-section">
        <h2 className="text-lg font-bold text-[#2D3E50] mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: 1,
              icon: Gift,
              title: "Share your link",
              desc: "Invite someone using your referral link or code.",
              color: "text-[#D4A843]",
              bg: "bg-[#D4A843]/10",
            },
            {
              step: 2,
              icon: ShoppingCart,
              title: "They complete a purchase",
              desc: "When they place a qualifying order and payment is verified, your reward is triggered.",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              step: 3,
              icon: Award,
              title: "You earn",
              desc: "The reward is added to your wallet automatically.",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-xs text-slate-400 mb-1">Step {s.step}</div>
              <div className="font-semibold text-[#2D3E50]">{s.title}</div>
              <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4 — Referral Activity */}
      <div className="rounded-2xl border bg-white p-6" data-testid="referral-activity-section">
        <h2 className="text-lg font-bold text-[#2D3E50] mb-1">Referral Activity</h2>
        <p className="text-sm text-slate-500 mb-4">
          {stats.total_referrals > 0
            ? `${stats.successful_referrals} of ${stats.total_referrals} referrals earned you rewards.`
            : "No referrals yet. Share your code or link to start earning!"}
        </p>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center" data-testid="no-referral-activity">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Share your referral link to start earning rewards.
            </p>
            <Button
              onClick={() => copyToClipboard(referralLink, "link")}
              className="mt-4 bg-[#D4A843] hover:bg-[#c49a3d] text-[#20364D] gap-2"
              data-testid="empty-state-copy-link"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border" data-testid="referral-activity-table">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Referred User</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Reward</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id || i} className="border-t hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-900">
                      {maskName(t.referred_name || t.referred_email || "")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">
                      {t.reward_amount ? money(t.reward_amount) : "---"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "---"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 5 — Wallet Usage Rules */}
      <div className="rounded-2xl border bg-white p-6" data-testid="wallet-rules-section">
        <h2 className="text-lg font-bold text-[#2D3E50] mb-3">Wallet Usage Rules</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
            <p className="text-sm text-slate-700">
              Wallet can be used for eligible ecosystem fees and purchases.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
            <p className="text-sm text-slate-700">
              Wallet can only cover up to <strong>{maxUsagePct}%</strong> of an eligible transaction.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
            <p className="text-sm text-slate-700">
              Rewards are earned when someone you refer completes a verified purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
