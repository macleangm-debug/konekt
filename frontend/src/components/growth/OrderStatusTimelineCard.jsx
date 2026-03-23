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
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="text-2xl font-bold text-[#20364D]">{title}</div>
      
      {/* Progress Bar */}
      <div className="mt-6 mb-8">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#20364D] transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Started</span>
          <span>{Math.round(((currentIndex + 1) / steps.length) * 100)}% Complete</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const IconComponent = STEP_ICONS[step] || Clock;

          return (
            <div key={step} className="flex items-center gap-4">
              {/* Icon/Indicator */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-[#20364D] text-white' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <IconComponent className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <div className={`font-medium ${
                isPending ? 'text-slate-400' : 
                isCurrent ? 'text-[#20364D]' : 
                'text-green-600'
              }`}>
                {step}
                {isCurrent && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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
