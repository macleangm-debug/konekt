import React from "react";
import { Copy, CheckCircle2 } from "lucide-react";

/**
 * Displays a prominent order code with copy action.
 * Used after checkout and payment proof submission.
 */
export default function OrderCodeCard({ orderNumber = "", className = "" }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = orderNumber;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!orderNumber) return null;

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 ${className}`} data-testid="order-code-card">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
        Your Order Code
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-2xl font-bold text-amber-900 font-mono tracking-wide" data-testid="order-code-value">
          {orderNumber}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
          data-testid="copy-order-code-btn"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <p className="mt-3 text-sm text-amber-800">
        Save this code — you can use it to track your order anytime, even without an account.
      </p>
    </div>
  );
}
