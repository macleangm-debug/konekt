import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function resolveLogoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}/api/files/serve/${path}`;
}

export default function useContentStudioData() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [groupDeals, setGroupDeals] = useState([]);
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, sR, bR, gdR, hubR] = await Promise.all([
        api.get("/api/content-engine/template-data/products"),
        api.get("/api/content-engine/template-data/services"),
        api.get("/api/content-engine/template-data/branding"),
        api.get("/api/public/group-deals/featured").catch(() => ({ data: [] })),
        api.get("/api/admin/settings-hub").catch(() => ({ data: {} })),
      ]);
      setProducts(pR.data?.items || []);
      setServices(sR.data?.items || []);
      const deals = (gdR.data || []).map((d) => ({ id: d.id, name: d.product_name, description: d.description || "", image_url: d.product_image || "", category: "Group Deal", type: "group_deal", final_price: d.discounted_price || 0, selling_price: d.original_price || 0, discount_amount: (d.original_price || 0) > (d.discounted_price || 0) ? (d.original_price - d.discounted_price) : 0, has_promotion: false, promo_code: "", current_committed: d.current_committed || 0, display_target: d.display_target || 0, buyer_count: d.buyer_count || 0 }));
      setGroupDeals(deals);
      const b = bR.data?.branding || {};
      const hub = hubR.data || {};
      b.phone = b.phone || hub?.invoice_branding?.contact_phone || "";
      b.email = b.email || hub?.invoice_branding?.contact_email || "";
      b.resolved_logo_url = resolveLogoUrl(b.logo_url);
      setBranding(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { products, services, groupDeals, branding, loading, reload: load };
}
