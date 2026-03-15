import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { ShieldCheck, Truck, CreditCard, Tag, Gift, Sparkles } from "lucide-react";
import api from "../lib/api";
import AffiliatePerkPreviewBox from "../components/checkout/AffiliatePerkPreviewBox";
import { bootstrapAffiliateAttribution, getStoredAffiliateCode } from "../lib/attribution";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, total, clearCart } = useCart();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    delivery_address: "",
    city: "",
    country: "Tanzania",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Attribution state - initialize from localStorage/URL
  const [affiliateCode, setAffiliateCode] = useState(() => bootstrapAffiliateAttribution());
  const [affiliatePerk, setAffiliatePerk] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [detectedAffiliate, setDetectedAffiliate] = useState(null);

  const deliveryFee = 0;
  
  // Calculate totals with discounts
  const perkDiscount = affiliatePerk?.perk?.discount_amount || 0;
  const campaignDiscount = appliedCampaign?.discount_amount || 0;
  const totalDiscount = perkDiscount + campaignDiscount;
  const grandTotal = Math.max(0, total + deliveryFee - totalDiscount);

  // Detect affiliate attribution on mount
  useEffect(() => {
    const detectAttribution = async () => {
      // Check URL param first, then localStorage
      const urlAffiliate = searchParams.get("affiliate");
      const storedCode = getStoredAffiliateCode();
      const effectiveCode = urlAffiliate || storedCode || affiliateCode;
      
      if (effectiveCode) {
        setAffiliateCode(effectiveCode);
        try {
          const res = await api.get(`/api/checkout/detect-attribution?affiliate=${effectiveCode}`);
          if (res.data.has_attribution) {
            setDetectedAffiliate(res.data);
          }
        } catch (err) {
          console.error("Failed to detect attribution:", err);
        }
      }
    };
    
    detectAttribution();
  }, [searchParams]);

  // Evaluate campaigns when total changes
  useEffect(() => {
    const evaluateCampaigns = async () => {
      if (total <= 0) return;
      
      try {
        const res = await api.post("/api/checkout/evaluate-campaigns", {
          customer_email: form.email || null,
          order_amount: total,
          category: null,
          affiliate_code: detectedAffiliate?.affiliate_code || affiliateCode || null,
        });
        
        setAvailableCampaigns(res.data.campaigns || []);
        
        // Auto-select best campaign if available
        if (res.data.best_campaign && !appliedCampaign) {
          setAppliedCampaign(res.data.best_campaign);
        }
      } catch (err) {
        console.error("Failed to evaluate campaigns:", err);
      }
    };
    
    evaluateCampaigns();
  }, [total, form.email, detectedAffiliate, affiliateCode]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAffiliatePerkApplied = (perkData) => {
    setAffiliatePerk(perkData);
    // If perk is applied, it takes precedence over detected affiliate
    if (perkData?.affiliateCode) {
      setDetectedAffiliate({
        affiliate_code: perkData.affiliateCode,
        affiliate_name: perkData.perk?.affiliate_name,
        has_attribution: true,
      });
    }
  };

  const selectCampaign = (campaign) => {
    setAppliedCampaign(campaign);
  };

  const clearCampaign = () => {
    setAppliedCampaign(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.full_name || !form.email || !form.phone) {
      setError("Please fill in all required fields");
      return;
    }

    if (!items.length) {
      setError("Your cart is empty");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer_name: form.full_name,
        customer_email: form.email,
        customer_phone: form.phone,
        customer_company: form.company_name,
        delivery_address: form.delivery_address,
        city: form.city,
        country: form.country,
        notes: form.notes,
        line_items: items.map((item) => ({
          description: item.title || item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.subtotal || item.quantity * item.unit_price,
          customization_summary: item.customization_summary || 
            (item.customization ? `${item.color || ''} ${item.size || ''} ${item.print_method || ''}`.trim() : ''),
        })),
        subtotal: total,
        tax: 0,
        discount: totalDiscount,
        total: grandTotal,
        status: "pending",
        // Attribution fields
        affiliate_code: affiliatePerk?.affiliateCode || detectedAffiliate?.affiliate_code || null,
        affiliate_email: null, // Will be looked up by backend
        campaign_id: appliedCampaign?.campaign_id || null,
        campaign_name: appliedCampaign?.campaign_name || null,
        campaign_discount: campaignDiscount,
        campaign_reward_type: appliedCampaign?.reward_type || null,
      };

      const res = await api.post("/api/guest/orders", payload);
      const orderId = res.data.id || res.data.order_id;
      const orderNumber = res.data.order_number;
      
      clearCart();
      
      // Redirect to payment selection
      navigate(
        `/payment/select?target_type=order&target_id=${orderId}&email=${encodeURIComponent(form.email)}&amount=${grandTotal}`,
        {
          state: {
            customerName: form.full_name,
            orderNumber: orderNumber,
          },
        }
      );
    } catch (error) {
      console.error("Checkout failed", error);
      setError("Failed to submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if cart is empty
  if (!items.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Your cart is empty</h1>
          <p className="text-slate-500 mt-2">Add products before checking out</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
            data-testid="browse-products-btn"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Checkout</h1>
          <p className="mt-2 text-slate-600">
            Confirm your order details and submit your request.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700" data-testid="checkout-error">
            {error}
          </div>
        )}

        {/* Detected Affiliate Banner */}
        {detectedAffiliate?.has_attribution && !affiliatePerk && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4" data-testid="affiliate-detected-banner">
            <div className="flex items-center gap-2 text-amber-800">
              <Tag className="w-5 h-5" />
              <span className="font-medium">
                You were referred by {detectedAffiliate.affiliate_name || detectedAffiliate.affiliate_code}
              </span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Special perks may apply to your order. Enter the code below to unlock your discount.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_420px] gap-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Details Card */}
            <div className="rounded-3xl border bg-white p-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#2D3E50]" />
                Customer Details
              </h2>
              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Full name *"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  required
                  data-testid="checkout-fullname"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Email address *"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  data-testid="checkout-email"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Phone number *"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  data-testid="checkout-phone"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Company name (optional)"
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  data-testid="checkout-company"
                />
              </div>
            </div>

            {/* Delivery Details Card */}
            <div className="rounded-3xl border bg-white p-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Truck className="w-6 h-6 text-[#2D3E50]" />
                Delivery Details
              </h2>
              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <input
                  className="border rounded-xl px-4 py-3 md:col-span-2"
                  placeholder="Delivery address"
                  value={form.delivery_address}
                  onChange={(e) => updateField("delivery_address", e.target.value)}
                  data-testid="checkout-address"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  data-testid="checkout-city"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  data-testid="checkout-country"
                />
              </div>
            </div>

            {/* Order Notes Card */}
            <div className="rounded-3xl border bg-white p-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-[#2D3E50]" />
                Order Notes
              </h2>
              <textarea
                className="border rounded-xl px-4 py-3 w-full min-h-[140px] mt-5"
                placeholder="Any special instructions, branding notes, or delivery details"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                data-testid="checkout-notes"
              />
            </div>

            {/* Affiliate Perk Box */}
            <AffiliatePerkPreviewBox
              customerEmail={form.email}
              orderAmount={total}
              category=""
              onApplied={handleAffiliatePerkApplied}
            />

            {/* Available Campaigns */}
            {availableCampaigns.length > 0 && (
              <div className="rounded-3xl border bg-white p-6" data-testid="available-campaigns">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#D4A843]" />
                  Available Promotions
                </h3>
                <div className="space-y-3">
                  {availableCampaigns.map((campaign) => (
                    <div
                      key={campaign.campaign_id}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        appliedCampaign?.campaign_id === campaign.campaign_id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => selectCampaign(campaign)}
                      data-testid={`campaign-${campaign.campaign_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{campaign.campaign_name}</div>
                          <div className="text-sm text-slate-500">{campaign.campaign_headline}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">
                            {campaign.reward_type === "percentage_discount"
                              ? `${campaign.reward_value}% off`
                              : `TZS ${Number(campaign.discount_amount).toLocaleString()} off`}
                          </div>
                          {appliedCampaign?.campaign_id === campaign.campaign_id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearCampaign();
                              }}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#2D3E50] text-white py-4 font-semibold text-lg disabled:opacity-50 transition"
              data-testid="checkout-submit"
            >
              {submitting ? "Submitting Order..." : "Submit Order"}
            </button>
          </form>

          <aside className="rounded-3xl border bg-white p-8 h-fit sticky top-24">
            <h2 className="text-2xl font-bold">Order Summary</h2>

            <div className="space-y-4 mt-6">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="font-semibold">{item.title || item.name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Qty: {item.quantity}
                    {item.color && ` • ${item.color}`}
                    {item.size && ` • ${item.size}`}
                  </div>
                  {item.print_method && (
                    <div className="text-sm text-slate-500">
                      {item.print_method}
                    </div>
                  )}
                  <div className="text-sm font-medium mt-2">
                    TZS {(item.subtotal || item.quantity * item.unit_price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>TZS {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery</span>
                <span>{deliveryFee === 0 ? "Calculated later" : `TZS ${deliveryFee.toLocaleString()}`}</span>
              </div>
              
              {/* Show discounts */}
              {perkDiscount > 0 && (
                <div className="flex justify-between text-emerald-600" data-testid="perk-discount-row">
                  <span className="flex items-center gap-1">
                    <Gift className="w-4 h-4" />
                    Affiliate Perk
                  </span>
                  <span>-TZS {perkDiscount.toLocaleString()}</span>
                </div>
              )}
              
              {campaignDiscount > 0 && (
                <div className="flex justify-between text-emerald-600" data-testid="campaign-discount-row">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {appliedCampaign?.campaign_name || "Promotion"}
                  </span>
                  <span>-TZS {campaignDiscount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total</span>
                <span data-testid="checkout-total">TZS {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <ShieldCheck className="w-5 h-5" />
                Secure Checkout
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                Your order details are protected and secure.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
