import React, { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

export default function ApproveQuoteToInvoiceButton({ quoteId, onApproved }) {
  const [loading, setLoading] = useState(false);

  const approve = async () => {
    setLoading(true);
    try {
      await api.post(`/api/quotes/${quoteId}/approve-and-create-invoice`);
      toast.success("Quote approved. Invoice created.");
      if (onApproved) onApproved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to approve quote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md"
      data-testid="approve-quote-btn"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
      {loading ? "Approving..." : "Approve Quote"}
    </button>
  );
}
