import React from "react";
import { CheckCircle, Clock, Truck, Package, CreditCard, FileText } from "lucide-react";

const STEP_ICONS = {
  "Received": FileText,
  "Payment": CreditCard,
  "In Progress": Clock,
  "Shipped": Truck,
  "Delivered": Package,
  "Completed": CheckCircle,
};

export default function OrderStatusTimelineCard({ 
  steps = ["Received", "Payment", "In Progress", "Completed"], 
  currentIndex = 0, 
  title = "Order Timeline" 
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-lg font-semibold text-[#0f172a]">{title}</div>
      
      {/* Progress Bar */}
      <div className="mt-4 mb-6">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#1f3a5f] transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-[#94a3b8]">
          <span>Started</span>
          <span>{Math.round(((currentIndex + 1) / steps.length) * 100)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const IconComponent = STEP_ICONS[step] || Clock;

          return (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-[#1f3a5f] text-white' :
                'bg-gray-100 text-[#94a3b8]'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <IconComponent className="w-4 h-4" />
                )}
              </div>

              <div className={`text-sm font-medium ${
                isPending ? 'text-[#94a3b8]' : 
                isCurrent ? 'text-[#0f172a]' : 
                'text-green-600'
              }`}>
                {step}
                {isCurrent && (
                  <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
