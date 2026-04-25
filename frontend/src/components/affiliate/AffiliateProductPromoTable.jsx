import React from "react";
import { toast } from "sonner";
import { MessageCircle, Link2, Tag } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

function buildWhatsAppShare({ productName, finalPrice, discount, code, link }) {
  const lines = [
    `Check out ${productName} on Konekt!`,
    finalPrice ? `Price: ${money(finalPrice)}` : null,
    discount ? `You save ${money(discount)} when you use my code: ${code}` : (code ? `Use my code: ${code}` : null),
    link ? `Order here: ${link}` : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n\n"))}`;
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
            const whatsappUrl = buildWhatsAppShare({
              productName: row.product_name,
              finalPrice: row.final_price,
              discount: row.discount_amount,
              code: row.promo_code,
              link: shareLink,
            });
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
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white px-3 py-1.5 text-xs font-semibold transition shadow-sm"
                      data-testid={`whatsapp-share-${i}`}
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                    <button
                      onClick={() => copyToClipboard(shareLink, "Link")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      data-testid={`copy-link-${i}`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Link
                    </button>
                    <button
                      onClick={() => copyToClipboard(row.promo_code, "Code")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      data-testid={`copy-code-${i}`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Code
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
