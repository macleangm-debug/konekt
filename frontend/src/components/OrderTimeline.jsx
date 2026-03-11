import React from "react";
import { CheckCircle2, Clock3, Circle } from "lucide-react";

const statusSteps = [
  { key: "pending", label: "Order Received", description: "Your order has been submitted" },
  { key: "confirmed", label: "Confirmed", description: "Order confirmed by our team" },
  { key: "in_review", label: "Design Review", description: "Customization being reviewed" },
  { key: "approved", label: "Approved", description: "Approved for production" },
  { key: "in_production", label: "In Production", description: "Your items are being produced" },
  { key: "quality_check", label: "Quality Check", description: "Final quality inspection" },
  { key: "ready_for_dispatch", label: "Ready to Ship", description: "Packaged and ready for dispatch" },
  { key: "in_transit", label: "In Transit", description: "On the way to delivery address" },
  { key: "delivered", label: "Delivered", description: "Order delivered successfully" },
];

function getStepIndex(status) {
  return statusSteps.findIndex((step) => step.key === status);
}

function isStepCompleted(stepKey, currentStatus) {
  const stepIndex = getStepIndex(stepKey);
  const currentIndex = getStepIndex(currentStatus);
  return stepIndex <= currentIndex;
}

function isStepActive(stepKey, currentStatus) {
  return stepKey === currentStatus;
}

export default function OrderTimeline({ currentStatus = "pending", history = [] }) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="order-timeline">
      <h2 className="text-2xl font-bold">Order Timeline</h2>
      <p className="text-sm text-slate-500 mt-1">
        Track your order from confirmation to delivery
      </p>

      <div className="space-y-0 mt-8">
        {statusSteps.map((step, index) => {
          const completed = isStepCompleted(step.key, currentStatus);
          const active = isStepActive(step.key, currentStatus);
          const historyItem = history.find((item) => item.status === step.key);
          const isLast = index === statusSteps.length - 1;

          return (
            <div key={step.key} className="relative flex gap-4">
              {/* Timeline line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-full -translate-x-1/2 ${
                    index < currentIndex ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                />
              )}

              {/* Status icon */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    completed
                      ? "bg-emerald-100 text-emerald-700"
                      : active
                      ? "bg-blue-100 text-blue-700 ring-4 ring-blue-50"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : active ? (
                    <Clock3 className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className={`pb-8 ${!completed && !active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`font-semibold ${active ? "text-blue-700" : ""}`}>
                    {step.label}
                  </div>
                  {active && (
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                      Current
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 mt-1">
                  {historyItem?.note || step.description}
                </p>

                {historyItem?.timestamp && (
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(historyItem.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
