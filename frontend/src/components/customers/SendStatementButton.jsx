import React, { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";

export default function SendStatementButton({ customerId, customerName, compact = false }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e?.stopPropagation?.();
    setSending(true);
    try {
      const res = await adminApi.sendStatement(customerId);
      const data = res.data;
      toast.success(
        `Statement logged for ${data.customer_email || customerName}`,
        { description: `${data.statement_summary?.invoice_count || 0} invoices, balance: TZS ${Number(data.statement_summary?.balance_due || 0).toLocaleString()}` }
      );
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to send statement";
      toast.error(msg);
    }
    setSending(false);
  };

  if (compact) {
    return (
      <button
        onClick={handleSend}
        disabled={sending}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
        data-testid="send-statement-btn-compact"
      >
        {sent ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Mail className="h-3.5 w-3.5" />}
        {sending ? "Sending..." : sent ? "Sent" : "Send Statement"}
      </button>
    );
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
      data-testid="send-statement-btn"
    >
      {sent ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4" />}
      {sending ? "Sending..." : sent ? "Statement Sent" : "Send Statement"}
    </button>
  );
}
