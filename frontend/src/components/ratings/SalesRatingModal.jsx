import React, { useState } from "react";
import { X, Star, Send, Loader2 } from "lucide-react";
import axios from "axios";
import StarRatingInput from "./StarRatingInput";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function SalesRatingModal({ open, onClose, task, customerId, onSubmitted }) {
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !task) return null;

  const submit = async () => {
    if (!stars) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/sales-ratings/submit`, {
        customer_id: customerId,
        order_id: task.order_id,
        sales_owner_id: task.sales_owner_id,
        sales_owner_name: task.sales_owner_name,
        stars,
        feedback,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      onSubmitted?.();
      onClose?.();
      setStars(0);
      setFeedback("");
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" data-testid="sales-rating-modal">
      <div className="w-full max-w-[560px] rounded-[2rem] bg-white p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-xl border flex items-center justify-center hover:bg-slate-50 transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#20364D]">Rate Your Sales Advisor</div>
        </div>
        <div className="text-slate-600 mt-2">
          Help us keep the Konekt sales experience as strong as a ride-rating system.
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 mt-5">
          <div className="font-semibold text-[#20364D]">{task.sales_owner_name}</div>
          <div className="text-sm text-slate-500 mt-1">{task.order_number} • {task.order_title}</div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-slate-500 mb-3">How was your experience?</div>
          <StarRatingInput value={stars} onChange={setStars} />
        </div>

        <div className="mt-6">
          <div className="text-sm text-slate-500 mb-2">Optional feedback</div>
          <textarea
            className="w-full min-h-[140px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
            placeholder="Tell us what stood out — speed, clarity, follow-up, professionalism..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition"
          >
            Later
          </button>
          <button
            onClick={submit}
            disabled={!stars || saving}
            className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="submit-rating-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
