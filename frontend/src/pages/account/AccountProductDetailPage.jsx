import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Loader2, Package, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import InstantQuoteEstimator from "@/components/commerce/InstantQuoteEstimator";

export default function AccountProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/marketplace/products/${productId}`);
        setProduct(res.data);
      } catch {
        setProduct(null);
      }
      setLoading(false);
    };
    load();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      const item = {
        product_id: product.id,
        name: product.name,
        price: selectedVariant?.price_override || product.price || product.customer_price || 0,
        quantity: 1,
        variant: selectedVariant || null,
        image: product.primary_image || (product.images || [])[0] || "",
      };
      await api.post("/api/account/cart/add", item);
    } catch {}
    setAddingToCart(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="product-detail-loading">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center" data-testid="product-detail-not-found">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-700">Product Not Found</h2>
        <Link to="/account/marketplace" className="text-sm text-blue-600 underline mt-2 inline-block">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];
  const displayPrice = selectedVariant?.price_override || product.price || product.customer_price || 0;
  const images = product.images || [];
  const primaryImage = product.primary_image || images[0] || "";

  return (
    <div className="space-y-6" data-testid="product-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400" data-testid="product-breadcrumb">
        <Link to="/account/marketplace" className="hover:text-slate-600 transition-colors">Marketplace</Link>
        <ChevronRight className="w-3 h-3" />
        {product.category_name && (
          <>
            <span className="text-slate-500">{product.category_name}</span>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-slate-700 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <Link to="/account/marketplace" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700" data-testid="back-to-marketplace">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Image */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="aspect-[4/3] rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
            {primaryImage ? (
              <img src={primaryImage} alt={product.name} className="w-full h-full object-contain" data-testid="product-primary-image" />
            ) : (
              <Package className="w-16 h-16 text-slate-200" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {images.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-lg border bg-slate-50 flex-shrink-0 overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="rounded-2xl border bg-white p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-[#20364D]" data-testid="product-detail-name">{product.name}</h1>
            {product.brand && <p className="text-sm text-slate-500 mt-1">{product.brand}</p>}
            {product.category_name && (
              <p className="text-xs text-slate-400 mt-1">{[product.group_name, product.category_name, product.subcategory_name].filter(Boolean).join(" > ")}</p>
            )}
          </div>

          <div className="text-2xl font-bold text-[#20364D]" data-testid="product-detail-price">
            TZS {Number(displayPrice).toLocaleString()}
          </div>

          {product.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          )}
          {product.full_description && (
            <p className="text-sm text-slate-500 leading-relaxed">{product.full_description}</p>
          )}

          {/* Supply info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {product.supply_mode && (
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-slate-400 block">Supply Mode</span>
                <span className="text-slate-700 font-medium capitalize">{product.supply_mode.replace(/_/g, " ")}</span>
              </div>
            )}
            {product.lead_time_days > 0 && (
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-slate-400 block">Lead Time</span>
                <span className="text-slate-700 font-medium">{product.lead_time_days} days</span>
              </div>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-600 mb-2">Variants</h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label = [v.size, v.color, v.model].filter(Boolean).join(" / ") || v.sku;
                  const isSelected = selectedVariant?.variant_id === v.variant_id;
                  return (
                    <button key={v.variant_id} onClick={() => setSelectedVariant(isSelected ? null : v)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${isSelected ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}
                      data-testid={`variant-option-${v.variant_id}`}>
                      {label}
                      {v.price_override && <span className="ml-1 opacity-70">(TZS {Number(v.price_override).toLocaleString()})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3 pt-3">
            <button onClick={handleAddToCart} disabled={addingToCart}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50"
              data-testid="add-to-cart-btn">
              {addingToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Add to Cart
            </button>
            <Link to="/account/assisted-cart" className="flex items-center justify-center rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 font-semibold text-center hover:bg-[#efe0b0] transition-colors"
              data-testid="assisted-cart-link">
              Let Sales Assist Me
            </Link>
          </div>

          {/* Instant Quote Estimator */}
          <InstantQuoteEstimator
            baseCost={product.base_cost || product.partner_cost || displayPrice}
            productName={product.name}
            categoryId={product.category_id}
            productId={product.id}
            onRequestQuote={({ quantity, estimatedTotal, promoCode }) => {
              navigate("/account/assisted-cart", {
                state: {
                  prefill: {
                    product_id: product.id,
                    product_name: product.name,
                    quantity,
                    estimated_total: estimatedTotal,
                    promo_code: promoCode,
                  },
                },
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
