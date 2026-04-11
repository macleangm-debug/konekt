import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { safeDisplay } from "@/utils/safeDisplay";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Megaphone, Loader2, RefreshCw, Plus, Eye, Archive, Copy, ChevronRight,
  Image, LayoutGrid, Sparkles, AlertTriangle, CheckCircle2, Tag, MessageSquare,
  Smartphone, Square, RectangleVertical, Send,
} from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function authH() {
  const t = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

const ROLE_COLORS = { sales: "bg-blue-100 text-blue-700", affiliate: "bg-purple-100 text-purple-700", admin: "bg-slate-100 text-slate-700" };
const FORMAT_ICONS = { square: Square, vertical: RectangleVertical };
const FORMAT_LABELS = { square: "Square", vertical: "Vertical" };

export default function AdminContentCenterPage() {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterFormat) params.set("format", filterFormat);
      if (filterCampaign) params.set("campaign_id", filterCampaign);
      if (filterRole || filterFormat || filterCampaign) params.set("status", "active");

      const [contentRes, campRes, sugRes] = await Promise.all([
        api.get(`/api/admin/content-center?${params.toString()}`, { headers: authH() }),
        api.get("/api/content-engine/campaigns", { headers: authH() }),
        api.get("/api/content-engine/suggestions", { headers: authH() }),
      ]);
      setItems(contentRes.data?.items || []);
      setKpis(contentRes.data?.kpis || {});
      setCampaigns(campRes.data?.campaigns || []);
      setSuggestions(sugRes.data?.suggestions || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterRole, filterFormat, filterCampaign]);

  const handleGenerate = async (type, actionId) => {
    setGenerating(actionId || type);
    try {
      const endpoint = type === "promotion"
        ? "/api/content-engine/generate-campaign"
        : "/api/content-engine/generate-product";
      const body = type === "promotion"
        ? { promotion_id: actionId }
        : { product_id: actionId };
      const res = await api.post(endpoint, body, { headers: authH() });
      toast.success(`Generated ${res.data?.count || 0} content assets`);
      load();
    } catch { toast.error("Generation failed"); }
    setGenerating(null);
  };

  const handleArchive = async (id) => {
    try {
      await api.post(`/api/admin/content-center/${id}/archive`, {}, { headers: authH() });
      toast.success("Archived");
      load();
      if (selected?.id === id) setSelected(null);
    } catch { toast.error("Archive failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="admin-content-center">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Content Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Campaign-driven content for sales and marketing</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg transition" data-testid="refresh-content-btn">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" data-testid="content-suggestions">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Sparkles className="w-4 h-4" /> Smart Suggestions
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">{s.title}</div>
                  <div className="text-xs text-slate-500">{s.description}</div>
                </div>
                <button
                  onClick={() => handleGenerate(
                    s.action_type === "generate_from_promotion" ? "promotion" : "product",
                    s.action_id
                  )}
                  disabled={generating === s.action_id}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shrink-0"
                  data-testid={`generate-suggestion-${i}`}
                >
                  {generating === s.action_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Generate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Campaigns */}
      <div data-testid="campaigns-section">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Active Campaigns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {campaigns.map(c => (
            <div
              key={c.id}
              onClick={() => setFilterCampaign(filterCampaign === c.id ? "" : c.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${filterCampaign === c.id ? "border-[#20364D] bg-[#20364D]/5 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              data-testid={`campaign-card-${c.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#20364D]">{c.code}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
              </div>
              <div className="text-sm font-semibold text-slate-700 truncate">{c.name}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${money(c.discount_value)} off`}
                </span>
                <span className="text-xs font-semibold text-[#20364D]">{c.content_count} assets</span>
              </div>
              {c.content_count === 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate("promotion", c.id); }}
                  disabled={generating === c.id}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#20364D] text-white py-1.5 text-xs font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors"
                  data-testid={`generate-campaign-${c.id}`}
                >
                  {generating === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Generate Content
                </button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && !loading && (
            <div className="col-span-full text-center py-8 text-slate-400 text-sm">
              No active campaigns. Create a promotion first.
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="content-filters">
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-1 focus:ring-[#20364D] outline-none" data-testid="filter-role">
          <option value="">All Roles</option>
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
          <option value="affiliate">Affiliate</option>
        </select>
        <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-1 focus:ring-[#20364D] outline-none" data-testid="filter-format">
          <option value="">All Formats</option>
          <option value="square">Square</option>
          <option value="vertical">Vertical</option>
        </select>
        {filterCampaign && (
          <button onClick={() => setFilterCampaign("")} className="text-xs text-red-500 hover:text-red-700 font-semibold" data-testid="clear-campaign-filter">
            Clear Campaign Filter
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{items.length} items</span>
      </div>

      {/* Content Grid — Visual-First */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl" data-testid="content-empty">
          <Image className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No content assets yet</p>
          <p className="text-xs text-slate-400 mt-1">Generate content from a campaign above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="content-grid">
          {items.map(item => (
            <ContentCard key={item.id} item={item} onPreview={() => setSelected(item)} onArchive={() => handleArchive(item.id)} />
          ))}
        </div>
      )}

      {/* Preview Drawer */}
      <ContentPreviewDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ContentCard({ item, onPreview, onArchive }) {
  const FmtIcon = FORMAT_ICONS[item.format] || Square;
  return (
    <div
      className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={onPreview}
      data-testid={`content-card-${item.id}`}
    >
      {/* Image area */}
      <div className={`relative bg-slate-100 ${item.format === "vertical" ? "aspect-[9/16] max-h-[200px]" : "aspect-square"} overflow-hidden`}>
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white flex items-center gap-1`}>
            <FmtIcon className="w-2.5 h-2.5" /> {FORMAT_LABELS[item.format] || item.format}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${ROLE_COLORS[item.role] || ROLE_COLORS.admin}`}>
            {item.role}
          </span>
        </div>
        {item.has_promotion && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> {item.promotion_code || "PROMO"}
            </span>
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="bg-white rounded-full p-2 shadow-lg mr-2">
            <Eye className="w-4 h-4 text-[#20364D]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onArchive(); }} className="bg-white rounded-full p-2 shadow-lg">
            <Archive className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
      {/* Info */}
      <div className="p-3">
        <div className="text-xs font-semibold text-slate-700 truncate">{item.headline || item.target_name}</div>
        <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.category || item.promotion_name || "General"}</div>
        {item.final_price > 0 && (
          <div className="text-xs font-bold text-[#20364D] mt-1">{money(item.final_price)}</div>
        )}
      </div>
    </div>
  );
}

function ContentPreviewDrawer({ item, onClose }) {
  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!item) return null;

  const captions = item.captions || {};
  const captionEntries = [
    { key: "short", label: "Short (Social)", icon: MessageSquare },
    { key: "medium", label: "Medium (Post)", icon: MessageSquare },
    { key: "whatsapp_sales", label: "WhatsApp / Sales", icon: Send },
    { key: "story", label: "Story Text", icon: Smartphone },
  ];

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item.target_name || item.headline}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[item.role] || ROLE_COLORS.admin}`}>
              {item.role}
            </span>
          </SheetTitle>
          <SheetDescription>
            {FORMAT_LABELS[item.format] || item.format} format — {item.promotion_code ? `Campaign: ${item.promotion_code}` : "General content"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4" data-testid="content-preview-drawer">
          {/* Image */}
          {item.image_url ? (
            <img src={item.image_url} alt="" className="w-full rounded-xl object-cover max-h-[300px]" />
          ) : (
            <div className="w-full h-48 rounded-xl bg-slate-100 flex items-center justify-center">
              <Image className="w-10 h-10 text-slate-300" />
            </div>
          )}

          {/* Headline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Headline</label>
              <button onClick={() => copyText(item.headline)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1" data-testid="copy-headline">
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="text-sm font-semibold text-[#20364D]">{item.headline}</div>
          </div>

          {/* Pricing */}
          {item.final_price > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Price</span>
                <span className="font-bold text-[#20364D]">{money(item.final_price)}</span>
              </div>
              {item.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Savings</span>
                  <span className="font-semibold text-emerald-600">{money(item.discount_amount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Captions */}
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Captions</div>
            {captionEntries.map(({ key, label, icon: Icon }) => {
              const text = captions[key];
              if (!text) return null;
              return (
                <div key={key} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                    </div>
                    <button onClick={() => copyText(text)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1" data-testid={`copy-${key}`}>
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
                </div>
              );
            })}
          </div>

          {/* Share Data */}
          {(item.promotion_code || item.cta) && (
            <div className="rounded-xl bg-[#20364D]/5 p-3 space-y-2">
              {item.promotion_code && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Promo Code</span>
                  <button onClick={() => copyText(item.promotion_code)} className="font-mono text-sm font-bold text-[#20364D] hover:text-[#D4A843] transition-colors" data-testid="copy-promo-code">
                    {item.promotion_code}
                  </button>
                </div>
              )}
              {item.cta && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">CTA</span>
                  <span className="text-sm font-semibold text-[#20364D]">{item.cta}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
