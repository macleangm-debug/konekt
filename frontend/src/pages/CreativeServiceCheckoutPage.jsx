import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, FileText, Tag, Gift, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import AffiliatePerkPreviewBox from "../components/checkout/AffiliatePerkPreviewBox";

// Helper to read cookie value
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export default function CreativeServiceCheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState("pay_now");
  
  // Attribution state
  const [affiliatePerk, setAffiliatePerk] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [detectedAffiliate, setDetectedAffiliate] = useState(null);

  const project = state?.projectDraft;
  const baseTotal = project?.total_price || 0;
  
  // Calculate totals with discounts
  const perkDiscount = affiliatePerk?.perk?.discount_amount || 0;
  const campaignDiscount = appliedCampaign?.discount_amount || 0;
  const totalDiscount = perkDiscount + campaignDiscount;
  const finalTotal = Math.max(0, baseTotal - totalDiscount);

  // Detect affiliate attribution on mount
  useEffect(() => {
    if (!project) return;
    
    const detectAttribution = async () => {
      const cookieAffiliate = getCookie("affiliate_code");
      
      if (cookieAffiliate) {
        try {
          const res = await api.get(`/api/checkout/detect-attribution?affiliate=${cookieAffiliate}`);
          if (res.data.has_attribution) {
            setDetectedAffiliate(res.data);
          }
        } catch (err) {
          console.error("Failed to detect attribution:", err);
        }
      }
    };
    
    detectAttribution();
  }, [project]);

  // Evaluate campaigns when project loads
  useEffect(() => {
    if (!project) return;
    
    const evaluateCampaigns = async () => {
      if (baseTotal <= 0) return;
      
      try {
        const res = await api.post("/api/checkout/evaluate-campaigns", {
          customer_email: project.customer_email || null,
          order_amount: baseTotal,
          category: "creative_services",
          service_slug: project.service_slug || null,
          affiliate_code: detectedAffiliate?.affiliate_code || getCookie("affiliate_code") || null,
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
  }, [baseTotal, project, detectedAffiliate, appliedCampaign]);

  // Early return AFTER all hooks
  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No creative service draft found.</p>
          <Link to="/creative-services">
            <Button variant="outline" data-testid="browse-services-btn">Browse Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAffiliatePerkApplied = (perkData) => {
    setAffiliatePerk(perkData);
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

  const proceed = async () => {
    // If we have attribution data, update the project with it
    const attributionData = {
      affiliate_code: affiliatePerk?.affiliateCode || detectedAffiliate?.affiliate_code || null,
      campaign_id: appliedCampaign?.campaign_id || null,
      campaign_name: appliedCampaign?.campaign_name || null,
      campaign_discount: campaignDiscount,
      perk_discount: perkDiscount,
      total_discount: totalDiscount,
      final_total: finalTotal,
    };
    
    if (paymentMode === "pay_now") {
      navigate(
        `/payment/select?target_type=creative_project&target_id=${project.id}&email=${encodeURIComponent(project.customer_email || "")}&amount=${finalTotal}`,
        {
          state: {
            customerName: project.customer_name,
            attribution: attributionData,
          },
        }
      );
      return;
    }

    navigate("/account/designs", {
      state: { attribution: attributionData },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        {/* Back link */}
        <Link
          to="/creative-services"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          data-testid="back-to-services"
        >
          <ArrowLeft size={16} />
          Back to Services
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Review & Complete Order</h1>
          <p className="text-slate-600 mt-2">
            Confirm your creative service details and choose how you want to proceed.
          </p>
        </div>

        {/* Detected Affiliate Banner */}
        {detectedAffiliate?.has_attribution && !affiliatePerk && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4" data-testid="affiliate-detected-banner">
            <div className="flex items-center gap-2 text-amber-800">
              <Tag className="w-5 h-5" />
              <span className="font-medium">
                You were referred by {detectedAffiliate.affiliate_name || detectedAffiliate.affiliate_code}
              </span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Enter the affiliate code below to unlock your special discount.
            </p>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-bold text-[#2D3E50]">{project.service_title}</h2>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Base Price</span>
              <span>{project.currency || "TZS"} {Number(project.base_price || 0).toLocaleString()}</span>
            </div>
            {project.add_on_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Add-ons</span>
                <span>{project.currency || "TZS"} {Number(project.add_on_total).toLocaleString()}</span>
              </div>
            )}
            
            {/* Show discounts */}
            {perkDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600" data-testid="perk-discount-row">
                <span className="flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  Affiliate Perk
                </span>
                <span>-{project.currency || "TZS"} {perkDiscount.toLocaleString()}</span>
              </div>
            )}
            
            {campaignDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600" data-testid="campaign-discount-row">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {appliedCampaign?.campaign_name || "Promotion"}
                </span>
                <span>-{project.currency || "TZS"} {campaignDiscount.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>Total</span>
              <span data-testid="checkout-total">{project.currency || "TZS"} {Number(finalTotal).toLocaleString()}</span>
            </div>
          </div>

          {/* Customer details summary */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-slate-700 mb-3">Delivery Details</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>{project.customer_name}</p>
              {project.company_name && <p>{project.company_name}</p>}
              <p>{project.customer_email}</p>
              {project.customer_phone && <p>{project.phone_prefix} {project.customer_phone}</p>}
              {project.address_line_1 && (
                <p>
                  {project.address_line_1}
                  {project.address_line_2 && `, ${project.address_line_2}`}
                  {project.city && `, ${project.city}`}
                  {project.country && `, ${project.country}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Affiliate Perk Box */}
        <AffiliatePerkPreviewBox
          customerEmail={project.customer_email || ""}
          orderAmount={baseTotal}
          category="creative_services"
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
                        TZS {Number(campaign.discount_amount || 0).toLocaleString()} off
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

        {/* Payment Options */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#2D3E50]">Choose Completion Option</h2>

          <label className="flex items-start gap-4 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition" data-testid="pay-now-option">
            <input
              type="radio"
              name="payment_mode"
              checked={paymentMode === "pay_now"}
              onChange={() => setPaymentMode("pay_now")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[#D4A843]" />
                <span className="font-semibold">Pay now</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Complete payment immediately and push the project into active delivery.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition" data-testid="pay-later-option">
            <input
              type="radio"
              name="payment_mode"
              checked={paymentMode === "pay_later"}
              onChange={() => setPaymentMode("pay_later")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-600" />
                <span className="font-semibold">Pay later</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Save the request and complete payment later from your invoice or dashboard.
              </p>
            </div>
          </label>

          <Button
            type="button"
            onClick={proceed}
            className="w-full rounded-xl bg-[#2D3E50] hover:bg-[#253242] text-white py-3 font-semibold"
            data-testid="checkout-continue-btn"
          >
            {paymentMode === "pay_now" ? "Continue to Payment" : "Submit & Pay Later"}
          </Button>
        </div>
      </div>
    </div>
  );
}
