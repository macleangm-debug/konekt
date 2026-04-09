import React from "react";
import { Copy, CheckCircle2, Award, Link as LinkIcon } from "lucide-react";

export default function AffiliateCard({
  title = "Verified Affiliate",
  affiliateName = "",
  promoCode = "",
  referralLink = "",
  joinedAt = "",
  performance = null,
}) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopy = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="rounded-3xl border bg-gradient-to-br from-[#0E1A2B] to-[#1a2d42] p-6 sm:p-8 text-white" data-testid="affiliate-card">
      <div className="flex items-center gap-3 mb-4">
        <Award className="w-6 h-6 text-[#D4A843]" />
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</div>
      </div>

      <div className="text-2xl font-bold">{affiliateName}</div>
      {joinedAt && (
        <div className="text-sm text-slate-400 mt-1">
          Member since {new Date(joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
        </div>
      )}

      {/* Promo Code */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Promo Code</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xl font-bold font-mono tracking-wider text-[#D4A843]" data-testid="affiliate-promo-code">
            {promoCode}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(promoCode, setCopiedCode)}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10 transition"
            data-testid="copy-promo-code-btn"
          >
            {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Referral Link */}
      {referralLink && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Referral Link</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300 break-all flex-1 font-mono" data-testid="affiliate-referral-link">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(referralLink, setCopiedLink)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10 transition"
              data-testid="copy-referral-link-btn"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
              <span>{copiedLink ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Performance Stats */}
      {performance && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-lg font-bold">{performance.orders || 0}</div>
            <div className="text-xs text-slate-400">Orders</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-lg font-bold text-[#D4A843]">TZS {(performance.earnings || 0).toLocaleString()}</div>
            <div className="text-xs text-slate-400">Earned</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-lg font-bold">{performance.clicks || 0}</div>
            <div className="text-xs text-slate-400">Clicks</div>
          </div>
        </div>
      )}
    </div>
  );
}
