import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, Check, Package, Truck, Clock,
  ShoppingCart, ShieldCheck, CreditCard, ArrowRight,
  Minus, Plus, ChevronLeft, FileText,
  Share2, Heart,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useCart } from "../../contexts/CartContext";
import SalesAssistCtaCard from "../../components/marketplace/SalesAssistCtaCard";
import SalesAssistModal from "../../components/marketplace/SalesAssistModal";
import StickyMobileSalesAssistBar from "../../components/marketplace/StickyMobileSalesAssistBar";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MarketplaceListingDetailContent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedPrintMethod, setSelectedPrintMethod] = useState(null);
  const [showSalesAssist, setShowSalesAssist] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    axios
      .get(`${API_URL}/api/public-marketplace/listing/${slug}`)
      .then((res) => {
        const data = res.data;
        setListing(data.listing);
        setRelated(data.related || data.related_items || []);
        setActiveImage(0);
        // Set defaults
        const l = data.listing;
        if (l?.sizes?.length) setSelectedSize(l.sizes[0]);
        if (l?.colors?.length) setSelectedColor(l.colors[0]?.name || l.colors[0]);
        if (l?.print_methods?.length) setSelectedPrintMethod(l.print_methods[0]);
        if (l?.min_quantity > 1) setQuantity(l.min_quantity);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex items-center justify-center" data-testid="listing-loading">
        <div className="w-10 h-10 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center" data-testid="listing-not-found">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Product Not Found</h1>
        <p className="text-slate-500 mb-6">This product may no longer be available.</p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Products
        </Link>
      </div>
    );
  }

  // Resolve images — support both image_url (single) and images (array)
  const allImages = [];
  if (listing.images?.length > 0) allImages.push(...listing.images.filter(Boolean));
  else if (listing.hero_image) allImages.push(listing.hero_image);
  else if (listing.image_url) allImages.push(listing.image_url);
  else if (listing.primary_image) allImages.push(listing.primary_image);
  const hasImage = allImages.length > 0;

  // Resolve price — support customer_price, base_price, price
  const price = Number(listing.customer_price || listing.base_price || listing.price || 0);
  const isService = listing.listing_type === "service";
  const inStock = listing.stock_quantity > 0 || listing.partner_available_qty > 0;
  const minQty = listing.min_quantity || 1;

  const handleAddToCart = () => {
    addItem({
      product_id: listing.id || slug,
      product_name: listing.name || "",
      quantity,
      unit_price: price,
      subtotal: quantity * price,
      size: selectedSize,
      color: selectedColor,
      print_method: selectedPrintMethod,
      listing_type: listing.listing_type || "product",
      image_url: allImages[0] || "",
      category: listing.category || "",
    });
    toast.success(`${listing.name} added to cart`);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6" data-testid="marketplace-listing-detail">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap" data-testid="pdp-breadcrumb">
        <Link to="/" className="text-slate-500 hover:text-[#20364D] transition">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/marketplace" className="text-slate-500 hover:text-[#20364D] transition">Products</Link>
        {listing.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{listing.category}</span>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[#20364D] font-medium truncate max-w-[200px]">{listing.name}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">
        {/* Left: Image */}
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white overflow-hidden aspect-square flex items-center justify-center" data-testid="pdp-main-image">
            {hasImage ? (
              <img
                src={allImages[activeImage] || allImages[0]}
                alt={listing.name}
                className="w-full h-full object-contain"
                data-testid="main-product-image"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-300">
                <Package className="w-20 h-20" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition ${
                    activeImage === idx ? "border-[#20364D]" : "border-transparent hover:border-slate-300"
                  }`}
                  data-testid={`thumbnail-${idx}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description (below image on desktop) */}
          {listing.description && (
            <div className="rounded-2xl border bg-white p-6 mt-4" data-testid="pdp-description">
              <h2 className="text-lg font-bold text-[#20364D] mb-3">Product Description</h2>
              <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </div>
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#20364D]/8 text-[#20364D] text-xs font-semibold">
              {isService ? "Service" : "Product"}
            </span>
            {listing.category && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {listing.category}
              </span>
            )}
            {listing.branch && listing.branch !== listing.category && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {listing.branch}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#20364D] leading-tight" data-testid="listing-title">
            {listing.name}
          </h1>

          {listing.short_description && (
            <p className="text-slate-600 leading-relaxed">{listing.short_description}</p>
          )}

          {/* Price Block */}
          <div className="rounded-2xl border bg-white p-5" data-testid="pdp-price-block">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#20364D]" data-testid="pdp-price">
                {money(price)}
              </span>
              {price > 0 && (
                <span className="text-sm text-slate-500">per unit</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              {!isService && inStock && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> In Stock
                </span>
              )}
              {listing.lead_time_days && (
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Delivery in {listing.lead_time_days} day{listing.lead_time_days !== 1 ? "s" : ""}
                </span>
              )}
              {minQty > 1 && (
                <span className="text-slate-500">Min. order: {minQty} units</span>
              )}
            </div>
          </div>

          {/* Customization Options */}
          {!isService && (
            <div className="space-y-4">
              {/* Sizes */}
              {listing.sizes?.length > 0 && (
                <div data-testid="pdp-sizes">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Size</label>
                  <div className="flex flex-wrap gap-2">
                    {listing.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                          selectedSize === size
                            ? "bg-[#20364D] text-white border-[#20364D]"
                            : "bg-white text-slate-700 hover:border-[#20364D]"
                        }`}
                        data-testid={`size-${size}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {listing.colors?.length > 0 && (
                <div data-testid="pdp-colors">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Color{selectedColor ? `: ${selectedColor}` : ""}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {listing.colors.map((color) => {
                      const colorName = color?.name || color;
                      const colorHex = color?.hex || "#ccc";
                      return (
                        <button
                          key={colorName}
                          onClick={() => setSelectedColor(colorName)}
                          className={`w-10 h-10 rounded-xl border-2 transition flex items-center justify-center ${
                            selectedColor === colorName ? "border-[#20364D] ring-2 ring-[#20364D]/20" : "border-slate-200 hover:border-slate-400"
                          }`}
                          style={{ backgroundColor: colorHex }}
                          title={colorName}
                          data-testid={`color-${colorName}`}
                        >
                          {selectedColor === colorName && (
                            <Check className={`w-4 h-4 ${colorHex === '#FFFFFF' || colorHex === '#ffffff' ? 'text-slate-800' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Print Methods */}
              {listing.print_methods?.length > 0 && listing.is_customizable && (
                <div data-testid="pdp-print-methods">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Branding Method</label>
                  <div className="flex flex-wrap gap-2">
                    {listing.print_methods.map((method) => (
                      <button
                        key={method}
                        onClick={() => setSelectedPrintMethod(method)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                          selectedPrintMethod === method
                            ? "bg-[#20364D] text-white border-[#20364D]"
                            : "bg-white text-slate-700 hover:border-[#20364D]"
                        }`}
                        data-testid={`print-method-${method}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity + Add to Cart */}
          {!isService ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                    className="px-3 py-3 hover:bg-slate-100 transition"
                    data-testid="qty-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-3 font-semibold min-w-[56px] text-center border-x" data-testid="qty-display">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-3 hover:bg-slate-100 transition"
                    data-testid="qty-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {price > 0 && (
                  <span className="text-sm text-slate-500" data-testid="pdp-line-total">
                    Subtotal: <span className="font-semibold text-[#20364D]">{money(quantity * price)}</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-bold hover:brightness-110 transition flex items-center justify-center gap-2"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                navigate(
                  `/request-quote?type=service_quote&service=${encodeURIComponent(listing.name || "")}&category=${encodeURIComponent(listing.category || "")}`
                )
              }
              className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-bold hover:brightness-110 transition flex items-center justify-center gap-2"
              data-testid="request-quote-btn"
            >
              Request a Quote <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Payment Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({ title: listing.name, url: window.location.href });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Product link copied to clipboard");
                  }
                } catch {}
              }}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              data-testid="share-product-btn"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={() => {
                toast.info("Log in to save items to your wishlist");
                navigate("/login");
              }}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              data-testid="save-product-btn"
            >
              <Heart className="w-4 h-4" /> Save
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 border p-4" data-testid="pdp-payment-info">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#20364D] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[#20364D]">Bank Transfer Payment</p>
                <p className="text-slate-600 mt-0.5">Place your order and pay via bank transfer. Payment is verified by our team before your order is processed.</p>
              </div>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="grid grid-cols-2 gap-3" data-testid="pdp-trust-signals">
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#20364D]">Managed Delivery</p>
                <p className="text-xs text-slate-500">Nationwide coverage</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#20364D]">Quality Assured</p>
                <p className="text-xs text-slate-500">Inspected before dispatch</p>
              </div>
            </div>
          </div>

          {/* Bulk / Business CTA */}
          <div className="rounded-2xl bg-[#20364D] text-white p-5" data-testid="pdp-bulk-cta">
            <h3 className="font-bold">Buying in bulk or for a company?</h3>
            <p className="text-slate-300 text-sm mt-1">Get better pricing on large orders, recurring supply, or contract terms.</p>
            <div className="flex gap-2 mt-3">
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A843] text-[#17283C] px-4 py-2 text-sm font-semibold hover:bg-[#c49a3d] transition"
                data-testid="request-business-pricing-btn"
              >
                <FileText className="w-3.5 h-3.5" /> Request Pricing
              </Link>
              <button
                type="button"
                onClick={() => setShowSalesAssist(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition"
                data-testid="talk-to-sales-btn"
              >
                Talk to Sales
              </button>
            </div>
          </div>

          {/* Sales Assist CTA */}
          <SalesAssistCtaCard
            title="Prefer a human to help?"
            body="Our sales team can prepare the right quote — including custom quantities, branding, and service support."
            onClick={() => setShowSalesAssist(true)}
            compact
          />
        </div>
      </div>

      {/* Sales Assist Modal */}
      <SalesAssistModal
        isOpen={showSalesAssist}
        onClose={() => setShowSalesAssist(false)}
        productName={listing.name || ""}
        productId={listing.id || slug}
        source="pdp_sales_assist"
      />

      {/* Sticky Mobile Sales Assist */}
      <StickyMobileSalesAssistBar onClick={() => setShowSalesAssist(true)} />

      {/* Documents */}
      {listing.documents?.length > 0 && (
        <div className="mt-10 rounded-2xl border bg-white p-6" data-testid="pdp-documents">
          <h2 className="text-lg font-bold text-[#20364D] mb-4">Documents & Specifications</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {listing.documents.map((doc, idx) => (
              <a
                key={idx}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-sm font-medium truncate">{doc.split("/").pop()}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-12" data-testid="pdp-related">
          <h2 className="text-2xl font-bold text-[#20364D] mb-6">Related {isService ? "Services" : "Products"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                to={`/marketplace/${item.slug || item.id}`}
                className="rounded-2xl border bg-white overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all"
                data-testid={`related-item-${item.id}`}
              >
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  {(item.hero_image || item.images?.[0] || item.image_url) ? (
                    <img
                      src={item.hero_image || item.images?.[0] || item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm text-[#20364D] truncate">{item.name}</p>
                  <p className="text-[#20364D] font-bold text-sm mt-1">
                    {money(item.customer_price || item.base_price || item.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
