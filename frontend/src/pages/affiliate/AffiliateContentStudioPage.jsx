import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import AdminContentStudioPage from "../admin/AdminContentStudioPage";

/**
 * Affiliate Content Studio
 * ─────────────────────────
 * Re-uses the canonical AdminContentStudioPage for layout + creative
 * rendering, BUT injects the affiliate's personal promo code (e.g.,
 * PARTNER10) onto every product / service / deal so the on-image
 * badge, captions and CTA are all discount-driven and personalised —
 * which is what affiliates and sales already had on their original
 * sharing surfaces. Admin-side renders stay clean (no override) since
 * that path passes no viewerPromoCode.
 */
export default function AffiliateContentStudioPage() {
  const [promoCode, setPromoCode] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/affiliate-program/my-status");
        if (cancelled) return;
        setPromoCode(res.data?.affiliate_code || res.data?.promo_code || "");
        setName(res.data?.name || "");
      } catch {
        // Falls back to admin-style clean creatives if no profile resolved
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div data-testid="affiliate-content-studio-page" data-promo-code={promoCode || ""}>
      <AdminContentStudioPage viewerPromoCode={promoCode} viewerLabel={name} />
    </div>
  );
}
