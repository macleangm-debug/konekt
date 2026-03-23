import React from "react";
import OrderStatusTimeline from "../growth/OrderStatusTimeline";
import { Package, Wrench } from "lucide-react";

export default function OrderDetailTimelineSection({ order }) {
  // Different steps for product vs service orders
  const steps = order?.type === "service"
    ? ["Received", "Payment", "In Progress", "Quality Review", "Completed"]
    : ["Received", "Payment", "In Progress", "Shipped", "Delivered"];
  
  const currentIndex = Number(order?.timeline_index || 0);
  const isService = order?.type === "service";

  return (
    <section className="rounded-[2rem] border bg-white p-6" data-testid="order-timeline-section">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isService ? "bg-purple-100" : "bg-[#20364D]/10"
        }`}>
          {isService ? (
            <Wrench className="w-5 h-5 text-purple-600" />
          ) : (
            <Package className="w-5 h-5 text-[#20364D]" />
          )}
        </div>
        <div>
          <div className="text-2xl font-bold text-[#20364D]">Order Progress</div>
          <div className="text-slate-600">
            {isService ? "Service request progress" : "Track your order delivery"}
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <OrderStatusTimeline steps={steps} currentStepIndex={currentIndex} />
      </div>

      {/* Status explanation */}
      <div className="mt-6 p-4 rounded-xl bg-slate-50">
        <div className="text-sm font-medium text-[#20364D]">Current Status</div>
        <div className="text-slate-600 mt-1">
          {steps[currentIndex] || "Processing"} - {getStatusDescription(steps[currentIndex], isService)}
        </div>
      </div>
    </section>
  );
}

function getStatusDescription(status, isService) {
  const descriptions = {
    "Received": "We've received your order and are reviewing it.",
    "Payment": isService 
      ? "Awaiting payment confirmation before we begin work."
      : "Awaiting payment confirmation before shipping.",
    "In Progress": isService
      ? "Our team is actively working on your request."
      : "Your order is being prepared for shipment.",
    "Quality Review": "Final quality checks before delivery.",
    "Shipped": "Your order is on its way!",
    "Delivered": "Your order has been delivered. Thank you!",
    "Completed": "Your service has been completed. Thank you!",
  };
  return descriptions[status] || "Processing your order.";
}
