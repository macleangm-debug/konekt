import React, { useState } from "react";
import { X, MessageSquare, Send } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function SalesAssistModalV2({ open, onClose, contextType = "general", contextItems = [], serviceContext = null }) {
  const [form, setForm] = useState({ objective: "", timeline: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const contextSummary =
    contextType === "cart"
      ? `${contextItems.length} item(s) in cart`
      : contextType === "service"
      ? `Service selected: ${serviceContext?.name || "Service Request"}`
      : "General support";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/sales/assist-requests`, {
        context_type: contextType,
        context_summary: contextSummary,
        items: contextItems,
        service_context: serviceContext,
        objective: form.objective,
        timeline: form.timeline,
        notes: form.notes,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit assist request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ objective: "", timeline: "", notes: "" });
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" data-testid="sales-assist-modal">
      <div className="w-full max-w-[520px] rounded-[2rem] bg-white p-8 relative">
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-xl border flex items-center justify-center hover:bg-slate-50 transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {!submitted ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#F4E7BF] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#8B6A10]" />
              </div>
              <div className="text-2xl font-bold text-[#20364D]">Let Sales Assist You</div>
            </div>
            <div className="text-slate-600 mb-6">A sales advisor will review your context and prepare the right quote.</div>

            <div className="rounded-2xl bg-slate-50 p-4 mb-6">
              <div className="text-sm font-medium text-[#20364D]">Context</div>
              <div className="text-slate-600 mt-1">{contextSummary}</div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-slate-500 mb-2 block">What is your objective?</label>
                <input 
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="e.g., Corporate event merchandise" 
                  value={form.objective} 
                  onChange={(e) => setForm({ ...form, objective: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-sm text-slate-500 mb-2 block">Timeline</label>
                <input 
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="e.g., Need by next Friday" 
                  value={form.timeline} 
                  onChange={(e) => setForm({ ...form, timeline: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-sm text-slate-500 mb-2 block">Extra notes</label>
                <textarea 
                  className="w-full min-h-[100px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="Any other details we should know..." 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleClose} 
                className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending..." : "Send to Sales"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-[#20364D] mb-2">Request Sent!</div>
            <div className="text-slate-600 mb-6">Our sales team will review your request and get back to you shortly.</div>
            <button 
              onClick={handleClose}
              className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
