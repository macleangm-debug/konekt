import React, { useEffect, useState } from "react";
import { BarChart3, MousePointer, CheckCircle, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import api from "../../lib/api";

export default function CampaignPerformanceWidget() {
  const [data, setData] = useState({ campaigns: [], totals: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/api/admin/campaign-performance/summary");
      setData(res.data || { campaigns: [], totals: {} });
    } catch (error) {
      console.error("Failed to load campaign performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = data.totals || {};
  const campaigns = data.campaigns || [];

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6" data-testid="campaign-performance-widget">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#2D3E50]" />
          <h2 className="text-xl font-bold">Campaign Performance</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-2xl p-6" data-testid="campaign-performance-widget">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#2D3E50]" />
        <h2 className="text-xl font-bold">Campaign Performance</h2>
        <span className="text-sm text-slate-500 ml-auto">Real-time marketing ROI snapshot</span>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-blue-50" data-testid="total-clicks">
          <div className="flex items-center gap-2 text-blue-600">
            <MousePointer className="w-4 h-4" />
            <span className="text-xs font-medium">Clicks</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totals.clicks || 0}
          </div>
        </div>
        
        <div className="p-3 rounded-xl bg-emerald-50" data-testid="total-redemptions">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Redemptions</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {totals.redemptions || 0}
          </div>
        </div>
        
        <div className="p-3 rounded-xl bg-amber-50" data-testid="total-revenue">
          <div className="flex items-center gap-2 text-amber-600">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Revenue</span>
          </div>
          <div className="text-lg font-bold text-amber-700 mt-1">
            TZS {Number(totals.revenue || 0).toLocaleString()}
          </div>
        </div>
        
        <div className="p-3 rounded-xl bg-purple-50" data-testid="total-conversion">
          <div className="flex items-center gap-2 text-purple-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Conversion</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {totals.conversion_rate || 0}%
          </div>
        </div>
      </div>

      {/* Individual Campaigns */}
      {campaigns.length === 0 ? (
        <div className="text-center py-6 text-slate-500" data-testid="no-campaigns">
          No campaigns tracked yet.
        </div>
      ) : (
        <div className="space-y-3" data-testid="campaign-list">
          {campaigns.map((item) => (
            <div 
              key={item.campaign_id} 
              className="border p-4 rounded-xl hover:bg-slate-50 transition"
              data-testid={`campaign-${item.campaign_id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{item.name}</div>
                  {item.headline && (
                    <div className="text-sm text-slate-500">{item.headline}</div>
                  )}
                </div>
                {item.is_active && (
                  <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                    Active
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-5 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-slate-500">Clicks</span>
                  <div className="font-semibold">{item.clicks}</div>
                </div>
                <div>
                  <span className="text-slate-500">Conversions</span>
                  <div className="font-semibold">{item.redemptions}</div>
                </div>
                <div>
                  <span className="text-slate-500">Revenue</span>
                  <div className="font-semibold">TZS {Number(item.revenue || 0).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500">Commission</span>
                  <div className="font-semibold">TZS {Number(item.commissions || 0).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500">Rate</span>
                  <div className="font-semibold text-emerald-600">{item.conversion_rate}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
