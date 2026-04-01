import React, { useState } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

export default function VendorEtaInput({ vendorOrderId, currentEta, onUpdated }) {
  const [date, setDate] = useState(currentEta || "");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) return toast.error("Please select a delivery date");

    setSubmitting(true);
    try {
      await api.post(`/api/vendor/orders/${vendorOrderId}/eta`, {
        promised_date: date,
      });
      toast.success("Delivery date submitted");
      setSaved(true);
      onUpdated?.(date);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit ETA");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-slate-50 p-4 space-y-3" data-testid="vendor-eta-input">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#20364D]" />
        <span className="text-sm font-semibold text-[#20364D]">Promised Delivery Date</span>
        {saved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setSaved(false); }}
          min={new Date().toISOString().split("T")[0]}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          data-testid="eta-date-input"
        />
        <button
          type="submit"
          disabled={submitting || !date}
          className="rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold disabled:opacity-40 transition"
          data-testid="eta-submit-btn"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set ETA"}
        </button>
      </div>
      {currentEta && !saved && (
        <p className="text-xs text-slate-500">Current ETA: {new Date(currentEta).toLocaleDateString()}</p>
      )}
    </form>
  );
}
