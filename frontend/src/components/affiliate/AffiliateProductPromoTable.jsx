import React from "react";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function AffiliateProductPromoTable({ rows = [], baseUrl = "" }) {
  if (!rows.length) {
    return (
      <div className="text-center py-10 text-slate-500" data-testid="affiliate-promo-table-empty">
        No active products with promotions yet.
      </div>
    );
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`);
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border" data-testid="affiliate-promo-table">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">Product</th>
            <th className="px-4 py-3 font-medium text-slate-600">Sell Price</th>
            <th className="px-4 py-3 font-medium text-slate-600">You Earn</th>
            <th className="px-4 py-3 font-medium text-slate-600">Customer Saves</th>
            <th className="px-4 py-3 font-medium text-slate-600">Promo Code</th>
            <th className="px-4 py-3 font-medium text-slate-600">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const shareLink = baseUrl ? `${baseUrl}${row.share_link}` : row.share_link;
            return (
              <tr key={row.id || i} className="border-t hover:bg-slate-50/50 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{row.product_name}</div>
                  {row.category_name && <div className="text-xs text-slate-500">{row.category_name}</div>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{money(row.final_price)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">{money(row.affiliate_amount)}</td>
                <td className="px-4 py-3 font-semibold text-amber-700">{money(row.discount_amount)}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">{row.promo_code}</code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(shareLink, "Link")}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      data-testid={`copy-link-${i}`}
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => copyToClipboard(row.promo_code, "Code")}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      data-testid={`copy-code-${i}`}
                    >
                      Copy Code
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
