import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ShoppingCart, Heart, Share2, Check, 
  Package, Truck, Clock, Star, ChevronRight 
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function MarketplaceListingDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!slug) return;
    
    setLoading(true);
    axios.get(`${API_URL}/api/public-marketplace/listing/${slug}`)
      .then(res => {
        setListing(res.data.listing);
        setRelated(res.data.related_items || []);
        setSuggestions(res.data.you_might_also_like || []);
        setActiveImage(0);
      })
      .catch(err => {
        console.error("Failed to fetch listing:", err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="listing-loading">
        <div className="w-10 h-10 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8" data-testid="listing-not-found">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Listing Not Found</h1>
        <p className="text-slate-500 mb-6">This product or service may no longer be available.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-[#20364D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a4a68] transition"
        >
          <ChevronLeft className="w-5 h-5" />
          Go Back
        </button>
      </div>
    );
  }

  const images = listing.images?.length > 0 ? listing.images : [listing.hero_image || "/placeholder-product.jpg"];
  const isService = listing.listing_type === "service";

  return (
    <div className="min-h-screen bg-slate-50" data-testid="marketplace-listing-detail-page">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-slate-500 hover:text-[#20364D]">Home</Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <Link to="/products" className="text-slate-500 hover:text-[#20364D]">Products</Link>
            {listing.category && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 capitalize">{listing.category}</span>
              </>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-[#20364D] font-medium truncate max-w-[200px]">{listing.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-white rounded-2xl border overflow-hidden aspect-square">
              <img
                src={images[activeImage]}
                alt={listing.name}
                className="w-full h-full object-contain"
                data-testid="main-product-image"
              />
            </div>
            
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 transition ${
                      activeImage === idx ? "border-[#20364D]" : "border-transparent hover:border-slate-300"
                    }`}
                    data-testid={`thumbnail-${idx}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isService ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {isService ? "Service" : "Product"}
              </span>
              {listing.category && (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm capitalize">
                  {listing.category}
                </span>
              )}
            </div>

            {/* Title & SKU */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#20364D]" data-testid="listing-title">
                {listing.name}
              </h1>
              {listing.sku && (
                <p className="text-slate-500 mt-1">SKU: {listing.sku}</p>
              )}
            </div>

            {/* Short Description */}
            {listing.short_description && (
              <p className="text-lg text-slate-600">{listing.short_description}</p>
            )}

            {/* Price */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#20364D]">
                  {listing.currency || "TZS"} {Number(listing.customer_price || 0).toLocaleString()}
                </span>
                {!isService && listing.partner_available_qty > 0 && (
                  <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> In Stock
                  </span>
                )}
              </div>
              {listing.lead_time_days && (
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Delivery in {listing.lead_time_days} {listing.lead_time_days === 1 ? "day" : "days"}
                </p>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {!isService && (
              <div className="flex gap-4">
                <div className="flex items-center border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 py-3 hover:bg-slate-100 transition"
                    data-testid="qty-decrease"
                  >
                    -
                  </button>
                  <span className="px-4 py-3 font-medium min-w-[50px] text-center" data-testid="qty-display">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 py-3 hover:bg-slate-100 transition"
                    data-testid="qty-increase"
                  >
                    +
                  </button>
                </div>
                
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-[#20364D] text-white rounded-xl font-semibold hover:bg-[#2a4a68] transition"
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            )}

            {isService && (
              <button
                className="w-full flex items-center justify-center gap-2 bg-[#20364D] text-white py-4 rounded-xl font-semibold hover:bg-[#2a4a68] transition"
                data-testid="request-quote-btn"
              >
                Request a Quote
              </button>
            )}

            {/* Quick Actions */}
            <div className="flex gap-4 pt-2">
              <button className="flex items-center gap-2 text-slate-600 hover:text-[#20364D] transition">
                <Heart className="w-5 h-5" />
                <span className="text-sm">Save</span>
              </button>
              <button className="flex items-center gap-2 text-slate-600 hover:text-[#20364D] transition">
                <Share2 className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Fast Delivery</p>
                  <p className="text-xs text-slate-500">Nationwide shipping</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Quality Assured</p>
                  <p className="text-xs text-slate-500">Verified sourcing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Description */}
        {listing.description && (
          <div className="mt-12 bg-white rounded-2xl border p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Description</h2>
            <div className="prose max-w-none text-slate-600 whitespace-pre-wrap">
              {listing.description}
            </div>
          </div>
        )}

        {/* Documents */}
        {listing.documents?.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Documents & Specifications</h2>
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
                    <Package className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="text-sm font-medium truncate">{doc.split('/').pop()}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related Items */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related {isService ? "Services" : "Products"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.slug}`}
                  className="bg-white rounded-xl border hover:shadow-md transition overflow-hidden group"
                  data-testid={`related-item-${item.id}`}
                >
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={item.hero_image || item.images?.[0] || "/placeholder-product.jpg"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-[#20364D] font-bold text-sm mt-1">
                      {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* You Might Also Like */}
        {suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {suggestions.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.slug}`}
                  className="bg-white rounded-xl border hover:shadow-md transition overflow-hidden group"
                  data-testid={`suggestion-item-${item.id}`}
                >
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={item.hero_image || item.images?.[0] || "/placeholder-product.jpg"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-[#20364D] font-bold text-sm mt-1">
                      {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
