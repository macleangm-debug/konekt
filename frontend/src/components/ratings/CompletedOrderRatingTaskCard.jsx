import React from "react";
import { Star, ChevronRight } from "lucide-react";

export default function CompletedOrderRatingTaskCard({ task, onRate }) {
  return (
    <div className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition" data-testid="rating-task-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#20364D]">Rate your sales advisor</div>
            <div className="text-slate-600 mt-2">
              Your order is complete. Take a moment to rate <span className="font-semibold">{task.sales_owner_name}</span>.
            </div>
            <div className="text-sm text-slate-500 mt-3">
              {task.order_number} • {task.order_title}
            </div>
          </div>
        </div>
        <button
          onClick={() => onRate(task)}
          className="rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 font-semibold hover:bg-[#ede0b0] transition flex items-center gap-2 flex-shrink-0"
          data-testid="rate-now-btn"
        >
          Rate Now
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
