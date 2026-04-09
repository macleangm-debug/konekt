import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Palette, FileText, ArrowRight, Sparkles } from "lucide-react";

export default function FirstOrderGuidanceCard({ hasOrders = false, hasServiceRequests = false }) {
  const navigate = useNavigate();

  // If user already has orders/requests, don't show guidance
  if (hasOrders || hasServiceRequests) return null;

  const steps = [
    {
      icon: <Package className="w-5 h-5" />,
      title: "Browse Products",
      description: "Explore branded materials, office supplies, and promotional items",
      action: () => navigate("/marketplace"),
      actionLabel: "Browse Marketplace",
    },
    {
      icon: <Palette className="w-5 h-5" />,
      title: "Request a Service",
      description: "Get logo design, brochures, company profiles, or other creative services",
      action: () => navigate("/services"),
      actionLabel: "View Services",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Get a Quote",
      description: "Need custom pricing for bulk orders or special requirements?",
      action: () => navigate("/request-quote"),
      actionLabel: "Request Quote",
    },
  ];

  return (
    <div
      className="rounded-2xl border border-[#D4A843]/30 bg-gradient-to-br from-[#D4A843]/5 to-white p-6"
      data-testid="first-order-guidance"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#D4A843]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#20364D]">Welcome!</h3>
          <p className="text-slate-600 text-sm">Here's how to get started with your first order</p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border hover:shadow-md transition-all group cursor-pointer"
            onClick={step.action}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#20364D]/10 flex items-center justify-center text-[#20364D]">
                {step.icon}
              </div>
              <span className="text-xs font-medium text-slate-400">Step {idx + 1}</span>
            </div>
            <h4 className="font-semibold text-[#20364D] mb-1">{step.title}</h4>
            <p className="text-sm text-slate-600 mb-3">{step.description}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-[#D4A843] group-hover:gap-2 transition-all">
              {step.actionLabel}
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Pro Tip */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-medium text-[#20364D]">Pro Tip</div>
            <p className="text-sm text-slate-600">
              Earn rewards by referring other businesses! Share your referral code and get points for every successful referral.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
