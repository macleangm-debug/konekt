import React, { useState } from "react";
import { Tag, Loader2, CheckCircle, XCircle, Gift } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../ui/button";

export default function AffiliatePerkPreviewBox({ 
  customerEmail = "", 
  orderAmount = 0, 
  category = "",
  onApplied 
}) {
  const [affiliateCode, setAffiliateCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const previewPerk = async () => {
    if (!affiliateCode.trim()) return;
    
    try {
      setLoading(true);
      const res = await api.post("/api/affiliate-perks/preview", {
        affiliate_code: affiliateCode.trim(),
        customer_email: customerEmail,
        order_amount: orderAmount,
        category,
      });
      setPreview(res.data);
      
      if (res.data?.eligible && onApplied) {
        onApplied({
          affiliateCode: affiliateCode.trim(),
          perk: res.data,
        });
        setApplied(true);
      }
    } catch (error) {
      console.error(error);
      setPreview({ eligible: false, reason: "Failed to validate code" });
    } finally {
      setLoading(false);
    }
  };

  const clearCode = () => {
    setAffiliateCode("");
    setPreview(null);
    setApplied(false);
    if (onApplied) {
      onApplied(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-slate-50 p-4" data-testid="affiliate-perk-preview-box">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Affiliate / Partner Code</span>
      </div>

      {!applied ? (
        <>
          <div className="flex gap-3">
            <input
              className="flex-1 border rounded-xl px-4 py-3 bg-white"
              placeholder="Enter affiliate code"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && previewPerk()}
              data-testid="affiliate-code-input"
            />
            <Button
              type="button"
              onClick={previewPerk}
              disabled={loading || !affiliateCode.trim()}
              className="bg-[#2D3E50] hover:bg-[#1e2d3d]"
              data-testid="affiliate-code-apply-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>

          {preview && !preview.eligible && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm" data-testid="affiliate-code-error">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{preview.reason || "Code not eligible"}</span>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50" data-testid="affiliate-code-applied">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-emerald-700">Code Applied: {affiliateCode}</span>
            </div>
            <button
              onClick={clearCode}
              className="text-sm text-slate-500 hover:text-slate-700"
              data-testid="affiliate-code-remove-btn"
            >
              Remove
            </button>
          </div>

          {preview?.eligible && (
            <div className="p-3 rounded-xl bg-white border" data-testid="affiliate-perk-details">
              <div className="flex items-center gap-2 text-[#D4A843]">
                <Gift className="w-4 h-4" />
                <span className="font-medium">Your Perk</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {preview.perk_type === "percentage_discount" && (
                  <>
                    {preview.perk_value}% discount
                    {preview.discount_cap > 0 && ` (max TZS ${Number(preview.discount_cap).toLocaleString()})`}
                  </>
                )}
                {preview.perk_type === "fixed_discount" && (
                  <>TZS {Number(preview.discount_amount).toLocaleString()} off</>
                )}
                {preview.perk_type === "free_addon" && (
                  <>Free: {preview.free_addon_code}</>
                )}
              </div>
              {preview.discount_amount > 0 && (
                <div className="mt-2 text-lg font-bold text-emerald-600" data-testid="affiliate-perk-savings">
                  You save: TZS {Number(preview.discount_amount).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
