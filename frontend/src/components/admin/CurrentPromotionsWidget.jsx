import React, { useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import api from "../../lib/api";

export default function CurrentPromotionsWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/admin/affiliate-campaigns/current");
        setItems(res.data || []);
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
      <div className="rounded-3xl border bg-white p-6" data-testid="current-promotions-widget-loading">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="current-promotions-widget">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#D4A843]/20 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-[#D4A843]" />
        </div>
        <h2 className="text-xl font-bold text-[#2D3E50]">Current Promotions</h2>
      </div>
      
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-[#2D3E50]">{item.name}</div>
                <div className="text-sm text-slate-500 mt-1 capitalize">{item.channel} channel</div>
              </div>
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                Active
              </span>
            </div>
            {item.headline && (
              <div className="text-sm text-slate-700 mt-2">{item.headline}</div>
            )}
            {item.reward?.type && (
              <div className="text-sm text-[#D4A843] font-medium mt-2">
                {item.reward.type === "percentage_discount" && `${item.reward.value}% off`}
                {item.reward.type === "fixed_discount" && `TZS ${Number(item.reward.value || 0).toLocaleString()} off`}
                {item.reward.type === "free_addon" && `Free ${item.reward.free_addon_code || "add-on"}`}
                {item.reward.cap > 0 && ` (max TZS ${Number(item.reward.cap).toLocaleString()})`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
