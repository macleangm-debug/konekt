import React from "react";
import { Clock, CheckCircle, FileText, ShoppingCart, DollarSign, Package } from "lucide-react";

const ACTIVITY_ICONS = {
  quote: FileText,
  order: ShoppingCart,
  payment: DollarSign,
  delivery: Package,
  default: Clock,
};

const ACTIVITY_COLORS = {
  quote: "bg-blue-100 text-blue-600",
  order: "bg-purple-100 text-purple-600",
  payment: "bg-green-100 text-green-600",
  delivery: "bg-teal-100 text-teal-600",
  default: "bg-slate-100 text-slate-600",
};

export default function RecentActivityFeed({ items = [] }) {
  const getIcon = (type) => {
    if (type?.includes("quote")) return ACTIVITY_ICONS.quote;
    if (type?.includes("order")) return ACTIVITY_ICONS.order;
    if (type?.includes("payment")) return ACTIVITY_ICONS.payment;
    if (type?.includes("delivery") || type?.includes("shipped")) return ACTIVITY_ICONS.delivery;
    return ACTIVITY_ICONS.default;
  };

  const getColor = (type) => {
    if (type?.includes("quote")) return ACTIVITY_COLORS.quote;
    if (type?.includes("order")) return ACTIVITY_COLORS.order;
    if (type?.includes("payment")) return ACTIVITY_COLORS.payment;
    if (type?.includes("delivery") || type?.includes("shipped")) return ACTIVITY_COLORS.delivery;
    return ACTIVITY_COLORS.default;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-lg font-semibold text-[#0f172a]">Recent Activity</div>
      <div className="space-y-3 mt-4">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="text-sm text-[#64748b]">No recent activity yet.</div>
            <div className="text-xs text-[#94a3b8] mt-1">Your updates will appear here</div>
          </div>
        ) : (
          items.map((item, index) => {
            const IconComponent = getIcon(item.type);
            const colorClass = getColor(item.type);
            
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0f172a]">{item.title}</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">{item.time}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
