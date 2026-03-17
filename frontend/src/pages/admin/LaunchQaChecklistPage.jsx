import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

const checks = [
  { id: 1, text: "Homepage loads correctly and all public CTAs work" },
  { id: 2, text: "Services page loads and each service card opens correctly" },
  { id: 3, text: "Service request CTA redirects guest to login and then back into dashboard form" },
  { id: 4, text: "Marketplace product can be added to guest cart" },
  { id: 5, text: "Guest cart survives login and proceeds to checkout" },
  { id: 6, text: "Bank transfer details display correctly" },
  { id: 7, text: "Payment proof submission works and appears in admin" },
  { id: 8, text: "Affiliate registration and affiliate dashboard work" },
  { id: 9, text: "Business pricing request creates sales opportunity" },
  { id: 10, text: "Sales queue shows service, quote, and business-pricing opportunities" },
  { id: 11, text: "Launch readiness audit shows correct statuses" },
  { id: 12, text: "Admin configuration pages save and reload correctly" },
  { id: 13, text: "Points validation prevents excessive redemption at checkout" },
  { id: 14, text: "Auto-numbering generates correct formats for orders/quotes/invoices" },
  { id: 15, text: "Customer business profile can be created and viewed by sales" },
];

export default function LaunchQaChecklistPage() {
  const [checkedItems, setCheckedItems] = React.useState({});

  const toggleItem = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = Math.round((checkedCount / checks.length) * 100);

  return (
    <div className="space-y-8" data-testid="launch-qa-checklist-page">
      <PageHeader
        title="Launch QA Checklist"
        subtitle="Use this checklist to verify launch-critical customer, staff, affiliate, and admin flows."
      />

      <SurfaceCard className="bg-gradient-to-r from-[#20364D] to-[#2a4a66] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">Progress</div>
            <div className="text-3xl font-bold">{checkedCount} / {checks.length} checked</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{progress}%</div>
            <div className="text-sm text-white/70">complete</div>
          </div>
        </div>
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-400 transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-3">
          {checks.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full text-left rounded-2xl border p-4 flex items-start gap-4 transition ${
                checkedItems[item.id] 
                  ? "bg-emerald-50 border-emerald-200" 
                  : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                checkedItems[item.id] 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-200 text-slate-400"
              }`}>
                {checkedItems[item.id] ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{item.id}</span>
                )}
              </div>
              <span className={checkedItems[item.id] ? "text-emerald-700 line-through" : "text-slate-700"}>
                {item.text}
              </span>
            </button>
          ))}
        </div>
      </SurfaceCard>

      {progress === 100 && (
        <SurfaceCard className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <div>
              <div className="text-xl font-bold text-emerald-700">All checks passed!</div>
              <p className="text-emerald-600">The platform is ready for launch.</p>
            </div>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
