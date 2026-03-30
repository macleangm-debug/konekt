import React, { useState } from "react";
import { ShoppingCart, MessageSquare, Send, Palette } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

export default function PublicRequestButtons({ product, onAddToCart, onBuyNow }) {
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [requestType, setRequestType] = useState("");

  const category = product?.category_type || "products";

  const handleRequest = async () => {
    if (!guestEmail) return toast.error("Email is required");
    setRequesting(true);
    try {
      const res = await api.post("/api/requests", {
        request_type: requestType,
        guest_email: guestEmail,
        guest_name: guestName,
        title: `${requestType.replace(/_/g, " ")} - ${product?.name || "Product"}`,
        details: { product_id: product?.id, product_name: product?.name },
      });
      if (res.data.ok) {
        toast.success(`Request submitted! ${res.data.account_invite ? "Check your email to activate your account." : ""}`);
        setShowForm(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit");
    }
    setRequesting(false);
  };

  const openRequestForm = (type) => {
    setRequestType(type);
    setShowForm(true);
  };

  return (
    <div data-testid="public-request-buttons">
      {/* Primary CTAs */}
      <div className="flex flex-wrap gap-2">
        {category === "products" && (
          <>
            {onBuyNow && (
              <button onClick={onBuyNow} className="flex items-center gap-2 px-5 py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm hover:bg-[#2a4a66] transition" data-testid="buy-now-btn">
                <ShoppingCart className="w-4 h-4" /> Buy Now
              </button>
            )}
            {onAddToCart && (
              <button onClick={onAddToCart} className="flex items-center gap-2 px-5 py-3 border border-[#20364D] text-[#20364D] rounded-xl font-semibold text-sm hover:bg-slate-50 transition" data-testid="add-to-cart-btn">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            )}
            <button onClick={() => openRequestForm("product_bulk")} className="flex items-center gap-2 px-5 py-3 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition" data-testid="request-bulk-quote-btn">
              <MessageSquare className="w-4 h-4" /> Request Bulk Quote
            </button>
          </>
        )}

        {category === "promotional_materials" && (
          <>
            <button onClick={() => openRequestForm("promo_custom")} className="flex items-center gap-2 px-5 py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm hover:bg-[#2a4a66] transition" data-testid="customize-request-btn">
              <Palette className="w-4 h-4" /> Customize & Request Quote
            </button>
            <button onClick={() => openRequestForm("promo_sample")} className="flex items-center gap-2 px-5 py-3 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition" data-testid="request-sample-btn">
              <Send className="w-4 h-4" /> Request Sample
            </button>
          </>
        )}

        {category === "services" && (
          <button onClick={() => openRequestForm("service_quote")} className="flex items-center gap-2 px-5 py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm hover:bg-[#2a4a66] transition" data-testid="request-service-btn">
            <MessageSquare className="w-4 h-4" /> Request Service Quote
          </button>
        )}
      </div>

      {/* Guest request form modal */}
      {showForm && (
        <div className="mt-4 p-4 rounded-xl border bg-slate-50 space-y-3" data-testid="guest-request-form">
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)}
            className="w-full border rounded-xl px-4 py-2.5 text-sm" placeholder="Your name" data-testid="guest-name-input" />
          <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-2.5 text-sm" placeholder="Your email *" type="email" required data-testid="guest-email-input" />
          <div className="flex gap-2">
            <button onClick={handleRequest} disabled={requesting}
              className="flex-1 py-2.5 bg-[#20364D] text-white rounded-xl font-semibold text-sm disabled:opacity-50" data-testid="submit-guest-request-btn">
              {requesting ? "Submitting..." : "Submit Request"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border rounded-xl text-sm text-slate-500" data-testid="cancel-request-btn">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
