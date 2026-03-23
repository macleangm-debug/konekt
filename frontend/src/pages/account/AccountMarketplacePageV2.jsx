import React, { useEffect, useState } from "react";
import axios from "axios";
import AccountProductGrid from "../../components/account/AccountProductGrid";
import MarketplaceSearchAndFilters from "../../components/marketplace/MarketplaceSearchAndFilters";
import { useCartDrawer } from "../../contexts/CartDrawerContext";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function AccountMarketplacePageV2({ embedded = false }) {
  const { addItem, cartCount } = useCartDrawer();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", group_slug: "", subgroup_slug: "" });

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.append("q", filters.q);
        if (filters.group_slug) params.append("group_slug", filters.group_slug);
        if (filters.subgroup_slug) params.append("subgroup_slug", filters.subgroup_slug);
        
        const res = await axios.get(`${API_URL}/api/marketplace/products/search?${params.toString()}`);
        setProducts(res.data || []);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [filters]);

  const handleAddToCart = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.base_price || product.price || product.numericPrice || 0,
      category: product.category,
      branch: product.branch,
      group_name: product.group_name,
    });
  };

  // Transform products for AccountProductGrid
  const gridProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || p.branch || "",
    price: `TZS ${Number(p.base_price || p.price || 0).toLocaleString()}`,
    numericPrice: p.base_price || p.price || 0,
    description: p.description || "",
    image_url: p.image_url,
    base_price: p.base_price || p.price || 0,
  }));

  return (
    <div className="space-y-8" data-testid="account-marketplace-page">
      {!embedded && (
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Marketplace</div>
          <div className="text-slate-600 mt-2">Browse and add products to cart without leaving your account shell.</div>
        </div>
      )}

      <MarketplaceSearchAndFilters value={filters} onChange={setFilters} />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading products...</div>
      ) : gridProducts.length > 0 ? (
        <AccountProductGrid products={gridProducts} onAddToCart={handleAddToCart} />
      ) : (
        <div className="text-center py-12 text-slate-500">No products found. Try adjusting your filters.</div>
      )}
    </div>
  );
}
