import React, { useState } from "react";
import { Star, Send } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RatingPrompt({ orderNumber, phone, token, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { rating, comment };
      if (token) payload.token = token;
      else { payload.order_number = orderNumber; payload.phone = phone; }
      await api.post("/api/ratings/submit", payload);
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
      if (onSubmitted) onSubmitted(rating);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit rating");
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center" data-testid="rating-submitted">
        <div className="flex justify-center gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`w-6 h-6 ${s <= rating ? "text-[#D4A843] fill-[#D4A843]" : "text-slate-200"}`} />
          ))}
        </div>
        <p className="text-sm font-semibold text-[#20364D]">Thank you for your feedback!</p>
        <p className="text-xs text-slate-500 mt-1">Your rating helps us improve our service.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5" data-testid="rating-prompt">
      <h3 className="text-sm font-bold text-[#20364D] mb-1">How was your experience?</h3>
      <p className="text-xs text-slate-500 mb-3">Rate the service for order {orderNumber}</p>

      {/* Star selector */}
      <div className="flex gap-1 mb-3" data-testid="star-selector">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button"
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="p-0.5 transition-transform hover:scale-110"
            data-testid={`star-${s}`}
          >
            <Star className={`w-8 h-8 transition-colors ${
              s <= (hover || rating) ? "text-[#D4A843] fill-[#D4A843]" : "text-slate-200"
            }`} />
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        className="w-full border rounded-xl px-3 py-2.5 text-sm min-h-[60px] resize-none mb-3"
        maxLength={500}
        data-testid="rating-comment"
      />

      <Button onClick={handleSubmit} disabled={submitting || rating === 0}
        className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold"
        data-testid="submit-rating-btn">
        <Send className="w-3.5 h-3.5 mr-2" />
        {submitting ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
}
