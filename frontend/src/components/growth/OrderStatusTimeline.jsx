import React from "react";
import { CheckCircle, Clock, Truck, Package, CreditCard, FileText } from "lucide-react";

const ORDER_STAGES = [
  { key: "received", label: "Order Received", icon: FileText, description: "Your order has been received" },
  { key: "payment", label: "Payment Confirmed", icon: CreditCard, description: "Payment verified" },
  { key: "processing", label: "In Progress", icon: Clock, description: "Your order is being prepared" },
  { key: "shipped", label: "Shipped", icon: Truck, description: "On the way to you" },
  { key: "delivered", label: "Delivered", icon: Package, description: "Order completed" },
];

const QUOTE_STAGES = [
  { key: "sent", label: "Quote Sent", icon: FileText, description: "Quote has been created" },
  { key: "reviewed", label: "Under Review", icon: Clock, description: "Awaiting your review" },
  { key: "approved", label: "Approved", icon: CheckCircle, description: "Quote approved" },
  { key: "payment", label: "Payment", icon: CreditCard, description: "Awaiting payment" },
  { key: "completed", label: "Completed", icon: CheckCircle, description: "Order placed" },
];

const SERVICE_STAGES = [
  { key: "submitted", label: "Request Submitted", icon: FileText, description: "Your request was received" },
  { key: "review", label: "Under Review", icon: Clock, description: "Sales team reviewing" },
  { key: "quoted", label: "Quote Prepared", icon: FileText, description: "Quote ready for review" },
  { key: "approved", label: "Approved", icon: CheckCircle, description: "You approved the quote" },
  { key: "in_progress", label: "In Progress", icon: Clock, description: "Work in progress" },
  { key: "completed", label: "Completed", icon: CheckCircle, description: "Service delivered" },
];

/**
 * Order Status Timeline - Visual progress tracking
 */
export function OrderStatusTimeline({ 
  status, 
  type = "order", // order, quote, service
  timestamps = {},
  compact = false 
}) {
  const stages = type === "order" ? ORDER_STAGES : 
                 type === "quote" ? QUOTE_STAGES : SERVICE_STAGES;
  
  // Map status to stage index
  const statusMap = {
    // Order statuses
    pending: 0, confirmed: 0, received: 0,
    paid: 1, payment_confirmed: 1, payment_received: 1,
    processing: 2, in_progress: 2, in_production: 2,
    shipped: 3, out_for_delivery: 3,
    delivered: 4, completed: 4,
    // Quote statuses
    sent: 0, draft: 0,
    reviewed: 1, viewed: 1,
    approved: 2,
    // Service statuses
    submitted: 0, new: 0,
    review: 1, reviewing: 1,
    quoted: 2,
  };

  const currentIndex = statusMap[status] ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => (
          <div 
            key={stage.key}
            className={`w-3 h-3 rounded-full ${
              idx < currentIndex ? 'bg-green-500' :
              idx === currentIndex ? 'bg-blue-500' :
              'bg-slate-200'
            }`}
            title={stage.label}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="order-status-timeline">
      {stages.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;
        const IconComponent = stage.icon;
        const timestamp = timestamps[stage.key];

        return (
          <div key={stage.key} className="flex gap-4">
            {/* Timeline Connector */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-blue-500 text-white' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <IconComponent className="w-5 h-5" />
                )}
              </div>
              {idx < stages.length - 1 && (
                <div className={`w-0.5 h-8 ${
                  isCompleted ? 'bg-green-500' : 'bg-slate-200'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className={`font-medium ${
                isPending ? 'text-slate-400' : 'text-slate-800'
              }`}>
                {stage.label}
              </div>
              <div className={`text-sm ${
                isPending ? 'text-slate-300' : 'text-slate-500'
              }`}>
                {stage.description}
              </div>
              {timestamp && (
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact Status Badge with progress indicator
 */
export function StatusProgressBadge({ status, type = "order" }) {
  const stages = type === "order" ? ORDER_STAGES : 
                 type === "quote" ? QUOTE_STAGES : SERVICE_STAGES;
  
  const statusMap = {
    pending: 0, confirmed: 0, received: 0,
    paid: 1, payment_confirmed: 1, payment_received: 1,
    processing: 2, in_progress: 2, in_production: 2,
    shipped: 3, out_for_delivery: 3,
    delivered: 4, completed: 4,
    sent: 0, draft: 0,
    reviewed: 1, viewed: 1,
    approved: 2,
    submitted: 0, new: 0,
    review: 1, reviewing: 1,
    quoted: 2,
  };

  const currentIndex = statusMap[status] ?? 0;
  const progress = ((currentIndex + 1) / stages.length) * 100;
  const currentStage = stages[currentIndex];

  const statusColors = {
    pending: "text-yellow-600 bg-yellow-100",
    processing: "text-blue-600 bg-blue-100",
    shipped: "text-indigo-600 bg-indigo-100",
    delivered: "text-green-600 bg-green-100",
    completed: "text-green-600 bg-green-100",
    approved: "text-green-600 bg-green-100",
  };

  const colorClass = statusColors[status] || "text-slate-600 bg-slate-100";

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {currentStage?.label || status}
      </span>
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Mini Timeline for list views
 */
export function MiniStatusTimeline({ status, type = "order" }) {
  return (
    <div className="flex items-center gap-2">
      <OrderStatusTimeline status={status} type={type} compact />
      <span className="text-xs text-slate-500 capitalize">{status}</span>
    </div>
  );
}

export default OrderStatusTimeline;
