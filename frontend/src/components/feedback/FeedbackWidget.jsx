import React, { useState } from "react";
import { MessageCircle, X, Send, Bug, CreditCard, Package, Lightbulb, HelpCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "bug", label: "Bug / Error", icon: Bug, color: "text-red-500" },
  { key: "payment_issue", label: "Payment Issue", icon: CreditCard, color: "text-amber-500" },
  { key: "order_issue", label: "Order Issue", icon: Package, color: "text-blue-500" },
  { key: "feature_request", label: "Feature Request", icon: Lightbulb, color: "text-purple-500" },
  { key: "general", label: "General Feedback", icon: HelpCircle, color: "text-slate-500" },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!category || !description.trim()) {
      toast.error("Please select a category and describe the issue");
      return;
    }
    setSending(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await api.post("/api/feedback", {
        category,
        description: description.trim(),
        page_url: window.location.href,
        user_id: user.id || user.user_id || "",
        user_email: user.email || "",
        user_name: user.full_name || user.name || "",
        user_role: user.role || "",
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setCategory("");
        setDescription("");
      }, 2000);
    } catch {
      toast.error("Failed to submit feedback");
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="feedback-widget-trigger"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#20364D] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-[#1a2d40] transition-all group"
          style={{ zIndex: 9998 }}
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="text-sm font-semibold">Help & Feedback</span>
        </button>
      )}

      {/* Feedback Panel */}
      {open && (
        <div
          className="fixed bottom-6 left-6 z-50 w-[360px] bg-white rounded-2xl shadow-2xl border overflow-hidden"
          style={{ zIndex: 9999 }}
          data-testid="feedback-widget-panel"
        >
          {/* Header */}
          <div className="bg-[#20364D] text-white px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Help us improve Konekt</h3>
              <p className="text-[10px] text-slate-300 mt-0.5">Report issues or share ideas</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {sent ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Send className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-[#20364D]">Thank you!</p>
              <p className="text-xs text-slate-500 mt-1">Your feedback has been received.</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What's this about?</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key)}
                        data-testid={`feedback-cat-${cat.key}`}
                        className={`flex items-center gap-2 text-left rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                          active
                            ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? "text-[#20364D]" : cat.color}`} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Describe the issue</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What happened? What did you expect?"
                  className="w-full mt-1.5 border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D]"
                  data-testid="feedback-description"
                />
              </div>

              {/* Submit */}
              <button
                onClick={submit}
                disabled={!category || !description.trim() || sending}
                className="w-full py-2.5 rounded-xl bg-[#20364D] text-white text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-40 transition flex items-center justify-center gap-2"
                data-testid="feedback-submit"
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
