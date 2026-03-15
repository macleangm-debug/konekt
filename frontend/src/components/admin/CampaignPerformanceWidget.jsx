import React, { useEffect, useState } from "react";
import { BarChart3, Loader2, MousePointerClick, BadgePercent, Wallet, Coins } from "lucide-react";
import api from "../../lib/api";

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-lg font-bold text-[#2D3E50]">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignPerformanceWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/admin/campaign-performance/summary");
        setData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const topCampaigns = (data.campaigns || []).slice(0, 5);

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="campaign-performance-widget">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#2D3E50]/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[#2D3E50]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2D3E50]">Campaign Performance</h2>
          <p className="text-sm text-slate-500">Real-time marketing ROI snapshot</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Metric icon={MousePointerClick} label="Clicks" value={Number(data.totals?.clicks || 0).toLocaleString()} accent="bg-blue-100 text-blue-700" />
        <Metric icon={BadgePercent} label="Redemptions" value={Number(data.totals?.redemptions || 0).toLocaleString()} accent="bg-emerald-100 text-emerald-700" />
        <Metric icon={Wallet} label="Revenue" value={`TZS ${Number(data.totals?.revenue || 0).toLocaleString()}`} accent="bg-amber-100 text-amber-700" />
        <Metric icon={Coins} label="Conversion" value={`${Number(data.totals?.conversion_rate || 0).toLocaleString()}%`} accent="bg-purple-100 text-purple-700" />
      </div>

      <div className="space-y-3">
        {topCampaigns.length === 0 ? (
          <div className="text-sm text-slate-500">No campaigns tracked yet.</div>
        ) : (
          topCampaigns.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2D3E50]">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.promo_code || item.channel}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <div><span className="text-slate-500">Clicks</span><div className="font-medium">{Number(item.clicks || 0).toLocaleString()}</div></div>
                <div><span className="text-slate-500">Redeemed</span><div className="font-medium">{Number(item.redemptions || 0).toLocaleString()}</div></div>
                <div><span className="text-slate-500">Revenue</span><div className="font-medium">TZS {Number(item.revenue || 0).toLocaleString()}</div></div>
                <div><span className="text-slate-500">Conv.</span><div className="font-medium">{Number(item.conversion_rate || 0).toLocaleString()}%</div></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
