import React, { useEffect, useState } from "react";
import { X, ArrowRight, CheckCircle2, ClipboardList, Banknote, UserCog, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

const STORAGE_KEY = "konekt_ops_onboarding_v1_dismissed";

const STEPS = [
  {
    icon: ClipboardList,
    color: "indigo",
    title: "Your daily queue",
    headline: "Keep work flowing from RFQ → Quote → Sales",
    body: "Vendor Ops is the RFQ kanban board at /admin/vendor-ops. New customer requests appear in the left lane. You pick vendors, wait for quotes, pick a winner, then 'Send to Sales' to hand off — Konekt's single source of truth for vendor pricing.",
    bullets: [
      "Red banner at the top = work that needs you now",
      "Each card has one next action — don't skip stages",
      "Konekt sell / min sell / margin reference is inline on every vendor quote",
    ],
    cta: { label: "Open Vendor Ops", path: "/admin/vendor-ops" },
  },
  {
    icon: Banknote,
    color: "amber",
    title: "Vendor payables",
    headline: "Vendors upload invoices — you review and pay",
    body: "At /admin/vendor-payables you'll see two lanes: per-order payables (for new vendors on pay-per-order terms) and monthly statements (for trusted vendors). Vendors upload their own invoice PDF; you click 'Mark paid' with the bank reference.",
    bullets: [
      "Run 'Monthly statements' on the 1st of each month",
      "Use the Modality Requests tab to approve upgrades",
      "Konekt never forces a specific invoice template — we accept vendor's",
    ],
    cta: { label: "Open Payables", path: "/admin/vendor-payables" },
  },
  {
    icon: UserCog,
    color: "emerald",
    title: "Step into a vendor's account",
    headline: "Impersonate to help vendors who are stuck",
    body: "From Admin → Vendors, open any vendor and click 'Impersonate vendor'. You'll land in their portal with a yellow banner at the top. A reason is required — every session is logged at /admin/impersonation-log. Click 'Return to Admin' when done.",
    bullets: [
      "Sessions expire after 2 hours automatically",
      "Writes are allowed — confirm carefully",
      "Use for onboarding help, not routine data edits",
    ],
    cta: { label: "Open Impersonation Log", path: "/admin/impersonation-log" },
  },
];

export function isOnboardingDismissed() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

export default function OpsOnboardingModal({ open, onClose, onCta }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  if (!open) return null;
  const total = STEPS.length;
  const step = STEPS[idx];
  const Icon = step.icon;

  const finish = (dismiss = true) => {
    if (dismiss) { try { localStorage.setItem(STORAGE_KEY, "1"); } catch {} }
    onClose?.();
  };

  const toneBg = {
    indigo: "from-indigo-600 via-indigo-700 to-[#20364D]",
    amber: "from-amber-500 via-amber-600 to-[#20364D]",
    emerald: "from-emerald-500 via-emerald-600 to-[#20364D]",
  }[step.color];

  return (
    <div className="fixed inset-0 z-[60] bg-black/55 flex items-center justify-center p-4" data-testid="ops-onboarding-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Hero */}
        <div className={`bg-gradient-to-br ${toneBg} p-8 text-white relative`}>
          <button onClick={() => finish(false)} className="absolute top-4 right-4 text-white/80 hover:text-white p-1" data-testid="onboarding-close">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Ops onboarding · Step {idx + 1} of {total}
          </div>
          <div className="flex items-start gap-4 mt-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-80">{step.title}</div>
              <h2 className="text-2xl font-bold mt-0.5 leading-tight">{step.headline}</h2>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-8 bg-white" : i < idx ? "w-6 bg-white/60" : "w-6 bg-white/25"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{step.body}</p>
          <ul className="space-y-2" data-testid="onboarding-bullets">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-2">
          <button onClick={() => finish(true)} className="text-xs text-slate-500 hover:text-slate-700 font-semibold" data-testid="onboarding-skip">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIdx(idx - 1)} data-testid="onboarding-back">
                Back
              </Button>
            )}
            {step.cta && (
              <Button variant="outline" size="sm" onClick={() => { onCta?.(step.cta.path); finish(true); }} data-testid="onboarding-cta">
                {step.cta.label}
              </Button>
            )}
            {idx < total - 1 ? (
              <Button size="sm" onClick={() => setIdx(idx + 1)} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="onboarding-next">
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => finish(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="onboarding-finish">
                Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
