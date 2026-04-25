import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Tag, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import DealEndedFallback from "@/components/public/DealEndedFallback";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

/**
 * /promo/:id — public landing page for a platform-promotion deep link.
 * Shared via QR codes baked onto affiliate / sales creatives.
 *
 * If the promotion is missing, expired, or paused we delegate to
 * DealEndedFallback so customers always see live alternatives instead
 * of a blank "not found".
 */
export default function PromotionLandingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/promotion-engine/promotions/${id}`);
        setPromo(r.data);
        if (r.data?.product_id) {
          try {
            const pr = await api.get(`/api/products/${r.data.product_id}`);
            setProduct(pr.data);
          } catch { /* product optional */ }
        }
      } catch {
        setMissing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (missing || !promo) return <DealEndedFallback kind="promotion" reason="missing" />;

  const now = new Date();
  const isExpired = (promo.ends_at && new Date(promo.ends_at) < now) || (promo.end_date && new Date(promo.end_date) < now);
  const isInactive = ["paused", "expired", "ended", "archived"].includes((promo.status || "").toLowerCase());
  if (isExpired || isInactive) return <DealEndedFallback kind="promotion" reason="ended" />;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4" data-testid="promotion-landing-page">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3 h-3" /> Konekt Home
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 mb-4">
            <Tag className="w-3 h-3" /> {promo.code ? `Code ${promo.code}` : "Live promotion"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20364D]">{promo.name || promo.title || "Save with Konekt"}</h1>
          {promo.description && <p className="text-slate-500 mt-2 text-sm sm:text-base leading-relaxed">{promo.description}</p>}
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {promo.discount_amount > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">You Save</div>
                <div className="text-xl font-extrabold text-emerald-900 mt-1">{fmt(promo.discount_amount)}</div>
              </div>
            )}
            {promo.discount_pct > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Discount</div>
                <div className="text-xl font-extrabold text-amber-900 mt-1">{promo.discount_pct}% off</div>
              </div>
            )}
            {promo.ends_at && (
              <div className="rounded-xl bg-slate-100 border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Clock className="w-3 h-3" /> Ends</div>
                <div className="text-sm font-semibold text-slate-700 mt-1">{new Date(promo.ends_at).toLocaleDateString()}</div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {product?.id ? (
              <Button onClick={() => navigate(`/marketplace/${product.slug || product.id}`)} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="promo-go-product">
                Order {product.name} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/marketplace")} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="promo-go-marketplace">
                Browse marketplace <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/group-deals")} data-testid="promo-go-deals">View live group deals</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
