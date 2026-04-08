import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Package, Copy, ChevronRight, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function SalesContentBlock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await api.get("/api/staff/content-feed");
      setItems(res.data.items || []);
      if (res.data.items?.length > 0) {
        setSelected(res.data.items[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-5" data-testid="content-block-empty">
        <h2 className="text-base font-bold text-[#0f172a] mb-3">Content to Share Today</h2>
        <div className="text-center py-6 text-slate-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No content available yet. Ask admin to generate content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5" data-testid="content-block">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#0f172a]">Content to Share Today</h2>
          <p className="text-xs text-slate-400 mt-0.5">Ready-to-use content based on active promotions</p>
        </div>
        <span className="text-xs text-slate-400">{items.length} items</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* LEFT: Content Cards (3 cols) */}
        <div className="lg:col-span-3 space-y-2 max-h-[360px] overflow-y-auto pr-1" data-testid="content-cards">
          {items.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                selected?.id === item.id
                  ? "border-[#0f172a] bg-[#0f172a]/5"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              data-testid={`content-card-${item.id}`}
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#0f172a] truncate">{item.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-[#0f172a]">{money(item.final_price)}</span>
                  {item.discount_amount > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium">Save {money(item.discount_amount)}</span>
                  )}
                </div>
                <div className="text-[10px] text-[#D4A843] font-semibold mt-0.5">
                  Your commission: {money(item.earning_amount)}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 transition ${
                selected?.id === item.id ? "text-[#0f172a]" : "text-slate-300"
              }`} />
            </button>
          ))}
        </div>

        {/* RIGHT: Selected Content Detail (2 cols) */}
        <div className="lg:col-span-2" data-testid="content-detail">
          {selected ? (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 sticky top-0">
              <div className="text-sm font-bold text-[#0f172a]">{selected.headline}</div>

              {/* Short Caption */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Quick Caption</span>
                  <button
                    onClick={() => copy(selected.captions?.short_social || "")}
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                    data-testid="copy-short-caption"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{selected.captions?.short_social}</p>
              </div>

              {/* Professional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Professional</span>
                  <button
                    onClick={() => copy(selected.captions?.professional || "")}
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                    data-testid="copy-professional"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{selected.captions?.professional}</p>
              </div>

              {/* Closing Script */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Closing Script</span>
                  <button
                    onClick={() => copy(selected.captions?.closing_script || "")}
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                    data-testid="copy-closing-script"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white rounded-lg p-2.5 border border-slate-200">
                  {selected.captions?.closing_script}
                </p>
              </div>

              {/* Share Data */}
              <div className="flex gap-2 pt-1">
                {selected.short_link && (
                  <button
                    onClick={() => copy(selected.short_link)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f172a] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#1e293b] transition"
                    data-testid="copy-link-btn"
                  >
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                )}
                {selected.promo_code && (
                  <button
                    onClick={() => copy(selected.promo_code)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[#0f172a] text-[#0f172a] py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                    data-testid="copy-promo-btn"
                  >
                    <Copy className="w-3 h-3" /> {selected.promo_code}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-400">
              <MessageSquare className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Select a content item to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
