import React from "react";
import { Star, MessageSquare } from "lucide-react";

export default function SalespersonScoreCard({ summary }) {
  if (!summary) return null;

  const avgRating = summary.average_rating || 0;
  const fullStars = Math.floor(avgRating);
  const hasHalfStar = avgRating - fullStars >= 0.5;

  return (
    <div className="rounded-[2rem] border bg-white p-8" data-testid="salesperson-score-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Star className="w-6 h-6 text-amber-600" />
        </div>
        <div className="text-2xl font-bold text-[#20364D]">Customer Rating</div>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div className="text-6xl font-bold text-[#20364D]">{avgRating}</div>
        <div className="pb-2">
          <div className="text-amber-500 text-2xl">
            {'★'.repeat(fullStars)}{hasHalfStar ? '½' : ''}{'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
          </div>
          <div className="text-sm text-slate-500 mt-1">{summary.ratings_count || 0} ratings</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-2xl font-bold text-[#20364D]">{summary.five_star_count || 0}</div>
          <div className="text-sm text-slate-500">5-star ratings</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-2xl font-bold text-[#20364D]">{summary.ratings_count || 0}</div>
          <div className="text-sm text-slate-500">Total reviews</div>
        </div>
      </div>

      {summary.recent_feedback?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            <div className="text-lg font-semibold text-[#20364D]">Recent Feedback</div>
          </div>
          <div className="space-y-3">
            {summary.recent_feedback.map((item, idx) => (
              <div key={idx} className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-amber-500">{'★'.repeat(item.stars || 0)}{'☆'.repeat(5 - (item.stars || 0))}</div>
                <div className="text-slate-600 mt-2">{item.feedback || "No written feedback provided."}</div>
                <div className="text-xs text-slate-400 mt-2">{item.created_at?.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
