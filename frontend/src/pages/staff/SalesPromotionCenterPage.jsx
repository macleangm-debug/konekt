import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import SectionCard from "../../components/dashboard/SectionCard";
import { Copy, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

function SalesPromoCard({ product }) {
  const [showCaptions, setShowCaptions] = useState(false);
  const [copied, setCopied] = useState(null);

  const copy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      toast.success("Copied!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" data-testid={`sales-promo-card-${product.id}`}>
      <div className="flex items-start gap-4 p-5">
        {product.image_url ? (
          <img src={product.image_url} alt={product.product_name} className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs shrink-0">No img</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">{product.product_name}</h3>
          {product.category_name && <p className="text-xs text-slate-500 mt-0.5">{product.category_name}</p>}
          <p className="text-lg font-bold text-slate-900 mt-1">{money(product.final_price)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t text-center">
        <div className="border-r py-3 px-2">
          <div className="text-xs text-slate-500">Your Commission</div>
          <div className="text-base font-bold text-emerald-700 mt-0.5">{money(product.sales_amount)}</div>
          <div className="text-[10px] text-slate-400">{product.sales_pct}% of pool</div>
        </div>
        <div className="py-3 px-2">
          <div className="text-xs text-slate-500">Client Saves</div>
          <div className="text-base font-bold text-amber-700 mt-0.5">{money(product.discount_amount)}</div>
          <div className="text-[10px] text-slate-400">{product.discount_pct}% of pool</div>
        </div>
      </div>

      <div className="border-t px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Share link</span>
          <button onClick={() => copy(`konekt.co/p/${(product.id || '').slice(0,8)}`, `link-${product.id}`)} className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 transition" data-testid={`sales-copy-link-${product.id}`}>
            {copied === `link-${product.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === `link-${product.id}` ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      {product.captions?.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            data-testid={`sales-toggle-captions-${product.id}`}
          >
            <span>Suggested captions ({product.captions.length})</span>
            {showCaptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showCaptions && (
            <div className="px-5 pb-4 space-y-2">
              {product.captions.map((cap, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">{cap.type}</span>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{cap.text}</p>
                  </div>
                  <button onClick={() => copy(cap.text, `caption-${product.id}-${i}`)} className="shrink-0 mt-3" data-testid={`sales-copy-caption-${product.id}-${i}`}>
                    {copied === `caption-${product.id}-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SalesPromotionCenterPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/staff/commissions/promotions")
      .then(res => setProducts(res.data?.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="sales-promotions-loading">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="sales-promotion-center">
      <SectionCard
        title="Promotion Center"
        subtitle="Share these products with clients. Each card shows your commission, client discount, and ready-to-use captions."
      >
        {products.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-500">No active products available for promotion.</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map(p => (
              <SalesPromoCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
