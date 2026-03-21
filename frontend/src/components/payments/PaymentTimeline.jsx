import React from "react";
import { Check, Clock, Loader2 } from "lucide-react";

const PAYMENT_TIMELINE_STEPS = [
  { key: "issued", label: "Invoice Issued" },
  { key: "proof_submitted", label: "Payment Submitted" },
  { key: "verification", label: "Verification In Progress" },
  { key: "confirmed", label: "Payment Confirmed" },
  { key: "fulfilled", label: "Processing / Fulfilled" },
];

/**
 * PaymentTimeline - Visual timeline component for payment status tracking
 * Shows progress through the payment verification workflow
 */
export default function PaymentTimeline({ events = [], currentStatus }) {
  // Build a set of completed event keys from actual events
  const completedKeys = new Set(events.map(e => e.event_key));
  
  // Determine current step index based on status or events
  let currentIndex = -1;
  if (currentStatus) {
    currentIndex = PAYMENT_TIMELINE_STEPS.findIndex(s => s.key === currentStatus);
  }
  if (currentIndex < 0 && events.length > 0) {
    // Find the highest completed step
    for (let i = PAYMENT_TIMELINE_STEPS.length - 1; i >= 0; i--) {
      if (completedKeys.has(PAYMENT_TIMELINE_STEPS[i].key)) {
        currentIndex = i;
        break;
      }
    }
  }

  return (
    <div className="space-y-4" data-testid="payment-timeline">
      {PAYMENT_TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index <= currentIndex || completedKeys.has(step.key);
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex && !completedKeys.has(step.key);

        // Find the matching event for timestamp
        const matchingEvent = events.find(e => e.event_key === step.key);
        const timestamp = matchingEvent?.created_at 
          ? new Date(matchingEvent.created_at).toLocaleString()
          : null;

        return (
          <div key={step.key} className="flex items-start gap-4" data-testid={`timeline-step-${step.key}`}>
            {/* Status indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-[#D4A843] text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              {/* Connector line */}
              {index < PAYMENT_TIMELINE_STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-8 mt-1 ${
                    index < currentIndex ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-4">
              <div
                className={`font-semibold ${
                  isCompleted || isCurrent ? "text-[#20364D]" : "text-slate-400"
                }`}
              >
                {step.label}
              </div>
              {timestamp && (
                <div className="text-sm text-slate-500 mt-1">{timestamp}</div>
              )}
              {matchingEvent?.note && (
                <div className="text-sm text-slate-600 mt-1">{matchingEvent.note}</div>
              )}
              {isCurrent && !matchingEvent && (
                <div className="text-sm text-[#D4A843] mt-1">In progress...</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
