import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, FileText, Building2 } from "lucide-react";

export default function BusinessPricingCtaBox({
  title = "Need better pricing?",
  description = "Companies, bulk buyers, and recurring clients can request better commercial pricing and contract terms.",
  compact = false,
  variant = "dark", // dark | light | gold
}) {
  const variants = {
    dark: {
      container: "bg-[#20364D] text-white",
      subtitle: "text-slate-200",
      primaryBtn: "bg-[#D4A843] hover:bg-[#c49a3d] text-[#20364D] font-semibold",
      secondaryBtn: "border border-white/30 bg-white/5 text-white hover:bg-white/10",
    },
    light: {
      container: "bg-slate-50 border border-slate-200 text-slate-900",
      subtitle: "text-slate-600",
      primaryBtn: "bg-[#20364D] hover:bg-[#1a2d40] text-white font-semibold",
      secondaryBtn: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    },
    gold: {
      container: "bg-gradient-to-br from-[#D4A843] to-[#b8923a] text-white",
      subtitle: "text-white/90",
      primaryBtn: "bg-[#20364D] hover:bg-[#1a2d40] text-white font-semibold",
      secondaryBtn: "border border-white/40 bg-white/10 text-white hover:bg-white/20",
    },
  };

  const style = variants[variant] || variants.dark;

  return (
    <div
      className={`rounded-2xl ${compact ? "p-5" : "p-6 md:p-8"} ${style.container}`}
      data-testid="business-pricing-cta"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${variant === "dark" ? "bg-white/10" : "bg-[#20364D]/10"}`}>
          <Building2 className={`w-6 h-6 ${variant === "dark" || variant === "gold" ? "text-white" : "text-[#20364D]"}`} />
        </div>
        <div className="flex-1">
          <div className={`${compact ? "text-lg" : "text-xl md:text-2xl"} font-bold`}>{title}</div>
          <p className={`${style.subtitle} mt-2 max-w-2xl ${compact ? "text-sm" : ""}`}>{description}</p>
        </div>
      </div>

      <div className={`flex flex-col sm:flex-row gap-3 ${compact ? "mt-4" : "mt-6"}`}>
        <Link
          to="/request-quote"
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 transition ${style.primaryBtn}`}
          data-testid="request-business-pricing-btn"
        >
          <FileText className="w-4 h-4" />
          Request Business Pricing
        </Link>
        <Link
          to="/contact"
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 transition ${style.secondaryBtn}`}
          data-testid="talk-to-sales-btn"
        >
          <MessageSquare className="w-4 h-4" />
          Talk to Sales
        </Link>
      </div>

      {!compact && (
        <div className={`mt-4 text-sm ${style.subtitle}`}>
          Available: Bulk pricing, contract supply, recurring orders, furniture, uniforms, branded materials
        </div>
      )}
    </div>
  );
}
