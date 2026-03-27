import React from "react";
import { Package, Wrench, Megaphone, Check } from "lucide-react";

/**
 * Customer-Safe Timeline Section
 * Uses timeline_steps and timeline_index from the API (backend maps statuses).
 * Customer never sees vendor-internal labels.
 */
export default function OrderDetailTimelineSection({ order }) {
  const steps = order?.timeline_steps || getFallbackSteps(order?.type);
  const currentIndex = Number(order?.timeline_index ?? 0);
  const isService = (order?.type || "").toLowerCase() === "service";
  const isPromo = ["promo", "promotion", "campaign"].includes((order?.type || "").toLowerCase());

  const icon = isPromo
    ? <Megaphone className="w-5 h-5 text-amber-600" />
    : isService
      ? <Wrench className="w-5 h-5 text-purple-600" />
      : <Package className="w-5 h-5 text-[#20364D]" />;

  const iconBg = isPromo
    ? "bg-amber-100"
    : isService
      ? "bg-purple-100"
      : "bg-[#20364D]/10";

  const subtitle = isPromo
    ? "Promotion campaign progress"
    : isService
      ? "Service request progress"
      : "Track your order delivery";

  return (
    <section className="rounded-[2rem] border bg-white p-6" data-testid="order-timeline-section">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-[#20364D]">Order Progress</div>
          <div className="text-slate-600">{subtitle}</div>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="mt-6 flex items-center gap-0" data-testid="timeline-bar">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step} className="flex items-center flex-1" data-testid={`timeline-step-${idx}`}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-[#20364D] text-white ring-4 ring-[#20364D]/20"
                      : "bg-slate-200 text-slate-400"
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`mt-2 text-xs text-center font-medium ${
                  isCurrent ? "text-[#20364D]" : isDone ? "text-green-600" : "text-slate-400"
                }`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-1 ${isDone ? "bg-green-400" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status description */}
      <div className="mt-6 p-4 rounded-xl bg-slate-50" data-testid="timeline-status-description">
        <div className="text-sm font-medium text-[#20364D]">Current Status</div>
        <div className="text-slate-600 mt-1">
          {order?.customer_status || steps[currentIndex] || "Processing"} — {order?.status_description || "Processing your order."}
        </div>
      </div>
    </section>
  );
}

function getFallbackSteps(type) {
  const t = (type || "product").toLowerCase();
  if (t === "service") return ["Requested", "Scheduled", "In Progress", "Review", "Completed"];
  if (["promo", "promotion", "campaign"].includes(t)) return ["Submitted", "Processing", "Active", "Completed"];
  return ["Ordered", "Confirmed", "In Progress", "Quality Check", "Ready", "Completed"];
}
