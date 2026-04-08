import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import KpiCard from "../../components/dashboard/KpiCard";
import SectionCard from "../../components/dashboard/SectionCard";
import { Copy, Link2, Users, Gift, Check } from "lucide-react";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [stats, setStats] = useState({ total_referrals: 0, successful: 0, reward_earned: 0 });
  const [history, setHistory] = useState([]);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const res = await api.get("/api/account/referrals").catch(() => ({ data: {} }));
      const d = res.data || {};
      setReferralCode(d.referral_code || "");
      setReferralLink(d.referral_link || "");
      setStats(d.stats || { total_referrals: 0, successful: 0, reward_earned: 0 });
      setHistory(d.history || []);
    } catch (err) {
      console.error("Failed to load referral data", err);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success("Copied!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div className="space-y-6" data-testid="referrals-page">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Referrals" value={stats.total_referrals} helper="People you've invited" accent="blue" />
        <KpiCard label="Successful" value={stats.successful} helper="Referrals who ordered" accent="emerald" />
        <KpiCard label="Rewards Earned" value={money(stats.reward_earned)} helper="Your referral rewards" accent="amber" />
      </div>

      <SectionCard title="Your Referral" subtitle="Share your code or link with other businesses. You earn rewards when they place their first order.">
        <div className="space-y-4">
          {/* Referral Code */}
          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
            <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-slate-500">Referral Code</div>
              <div className="mt-1 text-lg font-bold text-slate-900 font-mono tracking-wider">
                {referralCode || "—"}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(referralCode, "code")}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white transition"
              data-testid="copy-referral-code"
            >
              {copiedField === "code" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "code" ? "Copied" : "Copy Code"}
            </button>
          </div>

          {/* Referral Link */}
          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
            <Link2 className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-widest text-slate-500">Referral Link</div>
              <div className="mt-1 text-sm text-slate-700 truncate font-mono">
                {referralLink || "—"}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, "link")}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white transition"
              data-testid="copy-referral-link"
            >
              {copiedField === "link" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "link" ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Referral History */}
      <SectionCard title="Referral History" subtitle="People you've referred and their status.">
        {history.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center" data-testid="no-referral-history">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No referrals yet. Share your code or link to start earning rewards!</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" data-testid="referral-history-table">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Business</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Reward</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3 text-slate-900">{r.business_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {r.status === "completed" ? "Ordered" : "Invited"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{r.reward ? money(r.reward) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
