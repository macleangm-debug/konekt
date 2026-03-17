import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Wrench, FileText, RefreshCw, Users } from "lucide-react";

const icons = {
  orders: ShoppingBag,
  services: Wrench,
  quotes: FileText,
  recurring: RefreshCw,
  referrals: Users,
  default: ShoppingBag,
};

export default function AccountBlankState({
  icon = "default",
  title,
  description,
  primaryLabel,
  primaryAction,
  secondaryLabel,
  secondaryAction,
  benefits = [],
}) {
  const navigate = useNavigate();
  const IconComponent = icons[icon] || icons.default;

  const handlePrimary = () => {
    if (typeof primaryAction === "function") {
      primaryAction();
    } else if (typeof primaryAction === "string") {
      navigate(primaryAction);
    }
  };

  const handleSecondary = () => {
    if (typeof secondaryAction === "function") {
      secondaryAction();
    } else if (typeof secondaryAction === "string") {
      navigate(secondaryAction);
    }
  };

  return (
    <div className="space-y-6" data-testid="account-blank-state">
      <div className="rounded-[2rem] border bg-white p-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
          <IconComponent className="w-8 h-8 text-slate-400" />
        </div>

        <div className="text-3xl font-bold text-[#20364D] mt-6">{title}</div>
        <p className="text-slate-600 mt-4 text-lg max-w-2xl mx-auto">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          {primaryLabel && primaryAction && (
            <button
              type="button"
              onClick={handlePrimary}
              className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4560] transition-colors"
              data-testid="blank-state-primary-btn"
            >
              {primaryLabel}
            </button>
          )}

          {secondaryLabel && secondaryAction && (
            <button
              type="button"
              onClick={handleSecondary}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors"
              data-testid="blank-state-secondary-btn"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>

      {benefits.length > 0 && (
        <div className="rounded-3xl border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Why this matters</div>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {benefits.map((benefit, idx) => (
              <div key={idx}>
                <div className="text-lg font-bold text-[#20364D]">{benefit.title}</div>
                <p className="text-slate-600 mt-2">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
