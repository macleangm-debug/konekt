import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import QrCodeButton from "@/components/common/QrCodeButton";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2, Download, Copy, Check, Image as ImageIcon, Tag,
  Square, RectangleVertical, MessageSquare, Send, Smartphone,
  Palette, RefreshCw, Sparkles, Save, FileCheck, LayoutTemplate,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function resolveLogoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}/api/files/serve/${path}`;
}

/* ═══ THEMES ═══ */
const THEMES = [
  { key: "light", label: "Light", bg: "#FFFFFF", textPrimary: "#20364D", textSecondary: "#64748b", accent: "#D4A843", badgeBg: "#dc2626", badgeText: "#fff", footerBg: "#f8fafc", footerText: "#64748b", priceBg: "#20364D", priceText: "#fff" },
  { key: "dark", label: "Dark", bg: "#0f172a", textPrimary: "#f1f5f9", textSecondary: "#94a3b8", accent: "#D4A843", badgeBg: "#dc2626", badgeText: "#fff", footerBg: "#1e293b", footerText: "#94a3b8", priceBg: "#D4A843", priceText: "#0f172a" },
  { key: "promo", label: "Promo", bg: "#7c2d12", textPrimary: "#fff", textSecondary: "#fed7aa", accent: "#fbbf24", badgeBg: "#fbbf24", badgeText: "#78350f", footerBg: "#9a3412", footerText: "#fed7aa", priceBg: "#fbbf24", priceText: "#78350f" },
  { key: "minimal", label: "Minimal", bg: "#fafaf9", textPrimary: "#1c1917", textSecondary: "#78716c", accent: "#20364D", badgeBg: "#20364D", badgeText: "#fff", footerBg: "#f5f5f4", footerText: "#78716c", priceBg: "#20364D", priceText: "#fff" },
];

const FORMATS = [
  { key: "square", label: "Square", w: 1080, h: 1080, icon: Square },
  { key: "vertical", label: "Vertical", w: 1080, h: 1920, icon: RectangleVertical },
];

const LAYOUTS = [
  { key: "product", label: "Product Focus" },
  { key: "promo", label: "Promo Focus" },
  { key: "service", label: "Service Focus" },
  { key: "minimal", label: "Minimal Brand" },
  { key: "authority", label: "Authority" },
  { key: "trust", label: "Trust" },
];

/* ═══ BRAND CONTENT TEMPLATES ═══ */
const BRAND_TEMPLATES = [
  { id: "authority_1", intent: "authority", name: "Built for Serious Buyers", description: "Structured sourcing. Real results.", category: "Authority", icon: "shield" },
  { id: "authority_2", intent: "authority", name: "Trusted by Growing Businesses", description: "Reliable procurement you can count on.", category: "Authority", icon: "building" },
  { id: "authority_3", intent: "authority", name: "Your Reliable Sourcing Partner", description: "We simplify procurement so you can focus on growth.", category: "Authority", icon: "handshake" },
  { id: "trust_1", intent: "trust", name: "Verified Vendors. Secure Payments.", description: "Every vendor is vetted. Every payment is verified by admin.", category: "Trust", icon: "check" },
  { id: "trust_2", intent: "trust", name: "Transparent. Accountable. Reliable.", description: "Track your order end-to-end. No surprises.", category: "Trust", icon: "eye" },
  { id: "trust_3", intent: "trust", name: "Your Payment Is Verified First", description: "No order moves forward until payment is confirmed.", category: "Trust", icon: "lock" },
  { id: "urgency_1", intent: "urgency", name: "Limited Slots Remaining", description: "Demand is rising — secure your order now.", category: "Urgency", icon: "clock" },
  { id: "urgency_2", intent: "urgency", name: "Deal Closing Soon", description: "Don't miss out on volume savings.", category: "Urgency", icon: "zap" },
  { id: "soft_1", intent: "soft_sell", name: "A Smarter Way to Source", description: "Simplify your buying process with Konekt.", category: "Soft Sell", icon: "sparkles" },
  { id: "soft_2", intent: "soft_sell", name: "Better Buying Starts Here", description: "Explore what works for your business.", category: "Soft Sell", icon: "compass" },
  { id: "value_1", intent: "value", name: "Quality That Lasts Longer", description: "Value beyond the lowest price.", category: "Value", icon: "star" },
  { id: "value_2", intent: "value", name: "Reliable Sourcing Saves More", description: "Better quality. Better outcomes. Over time.", category: "Value", icon: "trending" },
];

/* ═══ TRIAD SVG (inline for html2canvas) ═══ */
function TriadSVG({ size = 56, variant = "dark", accent = "#D4A843", primary = "#20364D" }) {
  const s = size;
  const nodeColor = variant === "light" ? "#FFFFFF" : primary;
  const connColor = variant === "light" ? "rgba(229,231,235,0.85)" : `${nodeColor}73`;
  const tX = s * 0.58, tY = s * 0.13, lX = s * 0.12, lY = s * 0.82, rX = s * 0.90, rY = s * 0.72;
  const acR = Math.max(2.8, s * 0.14), nR = Math.max(2.2, s * 0.108), sw = Math.max(2, s * 0.062);
  const mX = (tX + rX) / 2 + s * 0.06, mY = (tY + rY) / 2 - s * 0.04;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1={tX} y1={tY} x2={lX} y2={lY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />
      <path d={`M${tX},${tY} Q${mX},${mY} ${rX},${rY}`} stroke={connColor} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <line x1={lX} y1={lY} x2={rX} y2={rY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={tX} cy={tY} r={acR} fill={accent} />
      <circle cx={lX} cy={lY} r={nR} fill={nodeColor} />
      <circle cx={rX} cy={rY} r={nR} fill={nodeColor} />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function AdminContentStudioPage({ viewerPromoCode = "", viewerLabel = "" } = {}) {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [groupDeals, setGroupDeals] = useState([]);
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [selectedItem, setSelectedItem] = useState(null);
  const [theme, setTheme] = useState(THEMES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [layout, setLayout] = useState(LAYOUTS[0]);
  const [showPreview, setShowPreview] = useState(false);

  // When viewer is sales/affiliate, overlay their personal promo code on
  // every item — exactly the discount-driven creative the original
  // sales/affiliate post designs surfaced. Admin (no viewerPromoCode)
  // keeps the clean creatives.
  const applyViewerPromoCode = useCallback((items) => {
    if (!viewerPromoCode) return items;
    return items.map((it) => ({
      ...it,
      promo_code: viewerPromoCode,
      has_promotion: true,
    }));
  }, [viewerPromoCode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, sR, bR, gdR] = await Promise.all([
        api.get("/api/content-engine/template-data/products"),
        api.get("/api/content-engine/template-data/services"),
        api.get("/api/content-engine/template-data/branding"),
        api.get("/api/public/group-deals/featured").catch(() => ({ data: [] })),
      ]);
      setProducts(pR.data?.items || []);
      setServices(sR.data?.items || []);
      const deals = (gdR.data || []).map((d) => ({
        id: d.id, name: d.product_name, description: d.description || "",
        image_url: d.product_image || "", category: "Group Deal",
        type: "group_deal", final_price: d.discounted_price || 0,
        selling_price: d.original_price || 0,
        discount_amount: (d.original_price || 0) > (d.discounted_price || 0) ? (d.original_price - d.discounted_price) : 0,
        has_promotion: false, promo_code: "",
        current_committed: d.current_committed || 0, display_target: d.display_target || 0,
        buyer_count: d.buyer_count || 0,
      }));
      setGroupDeals(deals);
      const b = bR.data?.branding || {};
      b.resolved_logo_url = resolveLogoUrl(b.logo_url);
      setBranding(b);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getItems = () => {
    let raw;
    if (tab === "products") raw = products;
    else if (tab === "services") raw = services;
    else if (tab === "group_deals") raw = groupDeals;
    else if (tab === "brand") raw = BRAND_TEMPLATES.map((t) => ({ ...t, type: "brand", final_price: 0, selling_price: 0, discount_amount: 0, has_promotion: false, promo_code: "", image_url: "" }));
    else raw = products;
    let withCode = applyViewerPromoCode(raw);
    // Promo Focus → only show items that actually carry an active promo
    // (either a per-product/category promo or the global KONEKT continuous).
    if (layout?.key === "promo" && tab !== "brand") {
      withCode = withCode.filter((it) => it.has_promotion && (it.discount_amount || 0) > 0);
    }
    return withCode;
  };
  const items = getItems();

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    // Auto-set best layout for content type
    if (item.type === "brand") {
      const intent = item.intent || "authority";
      if (intent === "trust") setLayout(LAYOUTS.find((l) => l.key === "trust") || LAYOUTS[3]);
      else setLayout(LAYOUTS.find((l) => l.key === "authority") || LAYOUTS[3]);
    } else if (tab === "services") {
      setLayout(LAYOUTS[2]); // Service Focus
    } else if (tab === "group_deals") {
      setLayout(LAYOUTS[1]); // Promo Focus
    } else {
      setLayout(LAYOUTS[0]); // Product Focus
    }
    setShowPreview(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-4" data-testid="content-studio">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Content Studio</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate branded social media creatives</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="refresh-studio-btn">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="studio-controls">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[
            { key: "products", label: `Products (${products.length})` },
            { key: "services", label: `Services (${services.length})` },
            { key: "group_deals", label: `Deals (${groupDeals.length})` },
            { key: "brand", label: `Brand (${BRAND_TEMPLATES.length})` },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`tab-${t.key}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {THEMES.map((t) => (
              <button key={t.key} onClick={() => setTheme(t)} className={`px-2.5 py-2 text-xs font-semibold transition-colors ${theme.key === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`theme-${t.key}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {FORMATS.map((f) => { const I = f.icon; return (
            <button key={f.key} onClick={() => setFormat(f)} className={`px-2.5 py-2 text-xs font-semibold flex items-center gap-1 transition-colors ${format.key === f.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`format-${f.key}`}>
              <I className="w-3 h-3" /> {f.label}
            </button>
          ); })}
        </div>

        <div className="flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {LAYOUTS.map((l) => (
              <button key={l.key} onClick={() => setLayout(l)} className={`px-2.5 py-2 text-xs font-semibold transition-colors ${layout.key === l.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`layout-${l.key}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="studio-empty">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No {tab} available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="studio-grid">
          {items.map((item) => (
            item.type === "brand" ? (
              <BrandTemplateCard key={item.id} item={item} onSelect={() => handleSelectItem(item)} />
            ) : (
              <ItemCard key={item.id} item={item} onSelect={() => handleSelectItem(item)} viewerPromoCode={viewerPromoCode} />
            )
          ))}
        </div>
      )}

      {selectedItem && (
        <CreativeDrawer
          item={selectedItem} theme={theme} format={format} layout={layout}
          branding={branding} open={showPreview} viewerPromoCode={viewerPromoCode}
          onClose={() => { setShowPreview(false); setSelectedItem(null); }}
          onThemeChange={setTheme} onFormatChange={setFormat} onLayoutChange={setLayout}
        />
      )}
    </div>
  );
}

/* ═══ Item Card ═══ */
function ItemCard({ item, onSelect, viewerPromoCode = "" }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer" onClick={onSelect} data-testid={`studio-item-${item.id}`}>
      <div className="relative bg-slate-50 aspect-square overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon className="w-10 h-10 mb-1" /><span className="text-[10px]">No Image</span></div>
        )}
        {item.has_promotion && (
          <div className="absolute top-2.5 right-2.5"><span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-red-500 text-white"><Tag className="w-3 h-3" /> {item.promo_code}</span></div>
        )}
        {item.type === "group_deal" && (
          <div className="absolute top-2.5 left-2.5"><span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-[#D4A843] text-[#17283C]"><Tag className="w-3 h-3" /> Group Deal</span></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <span className="flex items-center gap-2 bg-white text-[#20364D] rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg"><Sparkles className="w-4 h-4" /> Generate Creative</span>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#20364D] truncate">{item.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.category || item.type}</div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <QrCodeButton
              kind={item.type === "group_deal" ? "group_deal" : item.type === "promotion" ? "promo_campaign" : "product"}
              id={item.id}
              label="QR"
              ref={viewerPromoCode}
            />
          </div>
        </div>
        {item.final_price > 0 && (
          <div className="text-xs font-bold text-[#20364D] mt-1">
            {money(item.final_price)}
            {item.discount_amount > 0 && <span className="text-emerald-600 font-semibold ml-1.5">Save {money(item.discount_amount)}</span>}
          </div>
        )}
        {item.type === "group_deal" && item.display_target > 0 && (
          <div className="mt-1.5">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#D4A843] rounded-full" style={{ width: `${Math.min(100, Math.round((item.current_committed / item.display_target) * 100))}%` }} />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.current_committed}/{item.display_target} units</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Brand Template Card ═══ */
const INTENT_COLORS = {
  authority: { bg: "bg-[#20364D]", text: "text-white", accent: "text-[#D4A843]" },
  trust: { bg: "bg-emerald-700", text: "text-white", accent: "text-emerald-200" },
  urgency: { bg: "bg-red-700", text: "text-white", accent: "text-red-200" },
  soft_sell: { bg: "bg-slate-100", text: "text-[#20364D]", accent: "text-slate-500" },
  value: { bg: "bg-amber-50", text: "text-[#20364D]", accent: "text-[#D4A843]" },
};

function BrandTemplateCard({ item, onSelect }) {
  const colors = INTENT_COLORS[item.intent] || INTENT_COLORS.authority;
  return (
    <div className={`group rounded-xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer ${colors.bg}`} onClick={onSelect} data-testid={`brand-template-${item.id}`}>
      <div className="p-6 min-h-[180px] flex flex-col justify-center items-center text-center">
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${colors.accent}`}>{item.category}</div>
        <h3 className={`text-lg font-bold ${colors.text} leading-tight mb-2`}>{item.name}</h3>
        <p className={`text-sm ${colors.accent} leading-relaxed`}>{item.description}</p>
      </div>
      <div className="bg-black/10 px-4 py-2.5 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Sparkles className="w-3.5 h-3.5 text-white" />
        <span className="text-xs font-semibold text-white">Generate Creative</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CREATIVE DRAWER
   ═══════════════════════════════════════════ */
function CreativeDrawer({ item, theme, format, layout, branding, open, onClose, onThemeChange, onFormatChange, onLayoutChange, viewerPromoCode = "" }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const captions = generateCaptions(item, branding);

  const renderCanvas = async () => {
    if (!canvasRef.current) return null;
    return html2canvas(canvasRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const c = await renderCanvas();
      if (!c) throw new Error();
      const a = document.createElement("a");
      a.download = `${item.name.replace(/\s+/g, "_")}-${format.key}-${layout.key}-${theme.key}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
      toast.success("Creative downloaded");
    } catch { toast.error("Download failed"); }
    setDownloading(false);
  };

  const handlePublish = async (status) => {
    setPublishing(true);
    try {
      const c = await renderCanvas();
      if (!c) throw new Error();
      await api.post("/api/admin/content-center/publish", {
        image_data: c.toDataURL("image/png"),
        item_name: item.name, item_id: item.id, item_type: item.type,
        format: format.key, theme: theme.key, category: item.category || "",
        headline: item.name, selling_price: item.selling_price || 0,
        final_price: item.final_price || 0, discount_amount: item.discount_amount || 0,
        promo_code: item.promo_code || "", promotion_name: item.promo_name || "",
        captions, status,
      });
      toast.success(status === "draft" ? "Saved as draft" : "Published to Content Center");
      onClose();
    } catch { toast.error("Publish failed"); }
    setPublishing(false);
  };

  const handleCopy = (k, t) => { navigator.clipboard.writeText(t); setCopiedKey(k); toast.success("Copied"); setTimeout(() => setCopiedKey(""), 2000); };

  const previewScale = format.key === "vertical" ? 0.26 : 0.45;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-5" data-testid="creative-preview-drawer">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-lg font-bold text-[#20364D]">{item.name}</SheetTitle>
            <SheetDescription className="text-xs text-slate-500">Choose theme, layout, and format — then download or publish</SheetDescription>
          </SheetHeader>

          {/* Switchers */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {THEMES.map((t) => <button key={t.key} onClick={() => onThemeChange(t)} className={`px-2 py-1.5 text-[10px] font-semibold ${theme.key === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`drawer-theme-${t.key}`}>{t.label}</button>)}
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {LAYOUTS.map((l) => <button key={l.key} onClick={() => onLayoutChange(l)} className={`px-2 py-1.5 text-[10px] font-semibold ${layout.key === l.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`drawer-layout-${l.key}`}>{l.label}</button>)}
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {FORMATS.map((f) => { const I = f.icon; return <button key={f.key} onClick={() => onFormatChange(f)} className={`px-2 py-1.5 text-[10px] font-semibold flex items-center gap-1 ${format.key === f.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`drawer-format-${f.key}`}><I className="w-3 h-3" />{f.label}</button>; })}
            </div>
          </div>

          {/* WYSIWYG Preview — exact same container used for export */}
          <div className="rounded-xl border border-slate-200 bg-[#e5e5e5] p-3 mb-3 flex justify-center overflow-hidden" style={{ maxHeight: format.key === "vertical" ? "540px" : "500px" }} data-testid="creative-preview-area">
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}>
              <BrandedCreative ref={canvasRef} item={item} theme={theme} format={format} layout={layout} branding={branding} viewerPromoCode={viewerPromoCode} />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={handleDownload} disabled={downloading || publishing} className="flex items-center justify-center gap-1.5 bg-[#20364D] text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-[#1a2d40] disabled:opacity-50" data-testid="download-creative-btn">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download
            </button>
            <button onClick={() => handlePublish("draft")} disabled={downloading || publishing} className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg py-2.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50" data-testid="save-draft-btn">
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Draft
            </button>
            <button onClick={() => handlePublish("active")} disabled={downloading || publishing} className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50" data-testid="save-publish-btn">
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />} Publish
            </button>
          </div>

          {/* Captions */}
          <div className="space-y-2.5 mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready-to-Use Captions</div>
            {[
              { key: "short", label: "Short Caption", icon: MessageSquare },
              { key: "social", label: "Social Post", icon: MessageSquare },
              { key: "whatsapp", label: "WhatsApp / Sales", icon: Send },
              { key: "story", label: "Story Text", icon: Smartphone },
            ].filter((c) => captions[c.key]).map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Icon className="w-3.5 h-3.5 text-slate-400" /> {label}</span>
                  <button onClick={() => handleCopy(key, captions[key])} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${copiedKey === key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} data-testid={`copy-caption-${key}`}>
                    {copiedKey === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copiedKey === key ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{captions[key]}</p>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════
   BRANDED CREATIVE — The Render Template
   Single container: preview + export (true WYSIWYG)
   ═══════════════════════════════════════════ */
const BrandedCreative = React.forwardRef(({ item, theme, format, layout, branding, viewerPromoCode = "" }, ref) => {
  const v = format.key === "vertical";
  const w = format.w;
  const h = format.h;
  const hasImg = !!item.image_url;
  const hasDsc = item.discount_amount > 0;
  const isLight = theme.key === "dark" || theme.key === "promo" ? "light" : "dark";

  const S = {
    headline: v ? 84 : 64,
    price: v ? 60 : 48,
    badge: v ? 30 : 24,
    category: v ? 26 : 22,
    desc: v ? 26 : 22,
    footer: v ? 22 : 18,
    logoText: v ? 36 : 28,
    tagline: v ? 18 : 14,
    promo: v ? 26 : 22,
    triad: v ? 80 : 64,
    pad: v ? 60 : 48,
    pad: v ? 56 : 44,
  };

  const layoutRenderer = {
    product: () => <LayoutProduct item={item} theme={theme} S={S} v={v} w={w} h={h} hasImg={hasImg} hasDsc={hasDsc} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
    promo: () => <LayoutPromo item={item} theme={theme} S={S} v={v} w={w} h={h} hasImg={hasImg} hasDsc={hasDsc} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
    service: () => <LayoutService item={item} theme={theme} S={S} v={v} w={w} h={h} hasImg={hasImg} hasDsc={hasDsc} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
    minimal: () => <LayoutMinimal item={item} theme={theme} S={S} v={v} w={w} h={h} hasImg={hasImg} hasDsc={hasDsc} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
    authority: () => <LayoutAuthority item={item} theme={theme} S={S} v={v} w={w} h={h} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
    trust: () => <LayoutTrust item={item} theme={theme} S={S} v={v} w={w} h={h} branding={branding} isLight={isLight} viewerPromoCode={viewerPromoCode} />,
  };

  return (
    <div ref={ref} style={{ width: w, height: h, backgroundColor: theme.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }} data-testid="branded-creative">
      {(layoutRenderer[layout.key] || layoutRenderer.product)()}
    </div>
  );
});
BrandedCreative.displayName = "BrandedCreative";

/* ═══ LAYOUT A: Product Focus ═══ */
function LayoutProduct({ item, theme, S, v, w, h, hasImg, hasDsc, branding, isLight, viewerPromoCode = "" }) {
  return (
    <>
      <LogoBar theme={theme} S={S} branding={branding} isLight={isLight} hasDsc={hasDsc} discount={item.discount_amount} />
      <div style={{ flex: 1, display: "flex", flexDirection: v ? "column" : "row", padding: `0 ${S.pad}px` }}>
        {hasImg && (
          <div style={{ flex: v ? "none" : 1, height: v ? h * 0.38 : "auto", borderRadius: 16, overflow: "hidden", marginBottom: v ? 28 : 0, marginRight: v ? 0 : 28, backgroundColor: "#f1f5f9" }}>
            <img src={item.image_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: hasImg && !v ? 1 : "none", display: "flex", flexDirection: "column", justifyContent: "center", gap: v ? 20 : 14 }}>
          {item.category && <div style={{ fontSize: S.category, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 2 }}>{item.category}</div>}
          <div style={{ fontSize: S.headline, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1, letterSpacing: -1 }}>{item.name}</div>
          {item.description && <div style={{ fontSize: S.desc, color: theme.textSecondary, lineHeight: 1.4, maxWidth: 500 }}>{item.description}</div>}
          <PriceBlock item={item} theme={theme} S={S} v={v} hasDsc={hasDsc} />
          {/* Product Focus intentionally omits the promo code badge —
              the QR + footer carry attribution; the headline stays clean. */}
        </div>
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}

/* ═══ LAYOUT B: Promo Focus ═══ */
function LayoutPromo({ item, theme, S, v, w, h, hasImg, hasDsc, branding, isLight, viewerPromoCode = "" }) {
  return (
    <>
      <LogoBar theme={theme} S={S} branding={branding} isLight={isLight} hasDsc={false} discount={0} />
      {/* Big Promo Banner */}
      <div style={{ background: theme.badgeBg, padding: `${v ? 40 : 28}px ${S.pad}px`, textAlign: "center" }}>
        <div style={{ fontSize: v ? 36 : 28, fontWeight: 800, color: theme.badgeText, letterSpacing: 2, textTransform: "uppercase" }}>
          {hasDsc ? `SAVE ${money(item.discount_amount)}` : "SPECIAL OFFER"}
        </div>
        {item.promo_code && <div style={{ fontSize: v ? 28 : 22, fontWeight: 800, fontFamily: "monospace", color: theme.badgeText, marginTop: 8, letterSpacing: 3 }}>CODE: {item.promo_code}</div>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: v ? "column" : "row", padding: `${v ? 32 : 24}px ${S.pad}px`, gap: 24 }}>
        {hasImg && (
          <div style={{ flex: v ? "none" : "0 0 40%", height: v ? h * 0.28 : "auto", borderRadius: 16, overflow: "hidden", backgroundColor: "#f1f5f9" }}>
            <img src={item.image_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: S.headline * 0.85, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1 }}>{item.name}</div>
          {item.category && <div style={{ fontSize: S.category, color: theme.textSecondary }}>{item.category}</div>}
          <PriceBlock item={item} theme={theme} S={S} v={v} hasDsc={hasDsc} />
        </div>
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}

/* ═══ LAYOUT C: Service Focus ═══ */
function LayoutService({ item, theme, S, v, w, h, hasImg, hasDsc, branding, isLight, viewerPromoCode = "" }) {
  return (
    <>
      <LogoBar theme={theme} S={S} branding={branding} isLight={isLight} hasDsc={hasDsc} discount={item.discount_amount} />
      <div style={{ flex: 1, padding: `0 ${S.pad}px`, display: "flex", flexDirection: "column", justifyContent: "center", gap: v ? 28 : 20 }}>
        {/* Accent line */}
        <div style={{ width: 70, height: 5, backgroundColor: theme.accent, borderRadius: 3 }} />
        {item.category && <div style={{ fontSize: S.category, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 2 }}>{item.category}</div>}
        <div style={{ fontSize: S.headline, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1, letterSpacing: -1 }}>{item.name}</div>
        {item.description && <div style={{ fontSize: S.desc + 2, color: theme.textSecondary, lineHeight: 1.5, maxWidth: 700 }}>{item.description}</div>}
        {item.final_price > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: S.category, color: theme.textSecondary }}>From</span>
            <span style={{ fontSize: S.price, fontWeight: 800, color: theme.textPrimary }}>{money(item.final_price)}</span>
          </div>
        )}
        <PromoCode item={item} theme={theme} S={S} />
        {/* CTA button */}
        <div style={{ display: "inline-flex", alignSelf: "flex-start", backgroundColor: theme.accent, color: theme.key === "light" || theme.key === "minimal" ? "#fff" : theme.bg, padding: `${v ? 18 : 14}px ${v ? 40 : 32}px`, borderRadius: 12, fontSize: v ? 22 : 18, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          Get a Quote
        </div>
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}

/* ═══ LAYOUT D: Minimal Brand ═══ */
function LayoutMinimal({ item, theme, S, v, w, h, hasImg, hasDsc, branding, isLight, viewerPromoCode = "" }) {
  const [logoErr, setLogoErr] = useState(false);
  const showUploadedLogo = branding.resolved_logo_url && !logoErr;
  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: S.pad, textAlign: "center", gap: v ? 28 : 20 }}>
        {showUploadedLogo ? (
          <img src={branding.resolved_logo_url} alt="" crossOrigin="anonymous" onError={() => setLogoErr(true)} style={{ height: v ? 100 : 80, width: "auto", objectFit: "contain" }} />
        ) : (
          <TriadSVG size={v ? 100 : 80} variant={isLight} primary={theme.textPrimary === "#fff" || theme.textPrimary === "#ffffff" || theme.textPrimary === "#f1f5f9" ? "#FFFFFF" : "#20364D"} accent={theme.accent} />
        )}
        <div style={{ fontSize: v ? 38 : 30, fontWeight: 700, color: theme.textPrimary, lineHeight: 1.2 }}>{branding.trading_name || branding.company_name || ""}</div>
        {hasImg && (
          <div style={{ width: v ? 520 : 420, height: v ? 520 : 420, borderRadius: 20, overflow: "hidden", backgroundColor: "#f1f5f9", margin: "8px auto" }}>
            <img src={item.image_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ fontSize: S.headline * 0.8, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1 }}>{item.name}</div>
        {item.final_price > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: S.price, fontWeight: 800, backgroundColor: theme.priceBg, color: theme.priceText, padding: `${v ? 12 : 8}px ${v ? 28 : 20}px`, borderRadius: 10 }}>{money(item.final_price)}</span>
            {hasDsc && <span style={{ fontSize: S.desc, color: theme.textSecondary, textDecoration: "line-through" }}>{money(item.selling_price)}</span>}
          </div>
        )}
        <PromoCode item={item} theme={theme} S={S} />
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}

/* ═══ LAYOUT E: Authority (Brand Statement) ═══ */
function LayoutAuthority({ item, theme, S, v, w, h, branding, isLight, viewerPromoCode = "" }) {
  const [logoErr, setLogoErr] = useState(false);
  const showUploadedLogo = branding.resolved_logo_url && !logoErr;
  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `${S.pad * 1.5}px ${S.pad}px`, textAlign: "center", gap: v ? 36 : 24 }}>
        {/* Icon/Logo block */}
        <div style={{ width: v ? 120 : 100, height: v ? 120 : 100, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: `${theme.accent}20` }}>
          {showUploadedLogo ? (
            <img src={branding.resolved_logo_url} alt="" crossOrigin="anonymous" onError={() => setLogoErr(true)} style={{ height: v ? 70 : 56, width: "auto", objectFit: "contain" }} />
          ) : (
            <TriadSVG size={v ? 70 : 56} variant={isLight} primary={theme.textPrimary === "#fff" || theme.textPrimary === "#ffffff" || theme.textPrimary === "#f1f5f9" ? "#FFFFFF" : "#20364D"} accent={theme.accent} />
          )}
        </div>

        {/* Accent line */}
        <div style={{ width: 80, height: 5, backgroundColor: theme.accent, borderRadius: 3 }} />

        {/* Statement */}
        <div style={{ fontSize: v ? S.headline * 1.1 : S.headline, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: v ? 900 : 800 }}>
          {item.name}
        </div>

        {/* Subtext */}
        {item.description && (
          <div style={{ fontSize: v ? S.desc + 8 : S.desc + 4, color: theme.textSecondary, lineHeight: 1.5, maxWidth: v ? 700 : 600 }}>
            {item.description}
          </div>
        )}

        {/* Brand name */}
        <div style={{ fontSize: v ? 32 : 24, fontWeight: 700, color: theme.accent, letterSpacing: 3, textTransform: "uppercase", marginTop: v ? 16 : 8 }}>
          {branding.trading_name || branding.company_name || ""}
        </div>

        <PromoCode item={item} theme={theme} S={S} />
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}

/* ═══ LAYOUT F: Trust (Checklist Style) ═══ */
function LayoutTrust({ item, theme, S, v, w, h, branding, isLight, viewerPromoCode = "" }) {
  const [logoErr, setLogoErr] = useState(false);
  const showUploadedLogo = branding.resolved_logo_url && !logoErr;
  const trustPoints = (item.description || "").split(". ").filter(Boolean);
  return (
    <>
      <LogoBar theme={theme} S={S} branding={branding} isLight={isLight} hasDsc={false} discount={0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${S.pad}px`, gap: v ? 32 : 24 }}>
        {/* Accent line */}
        <div style={{ width: 70, height: 5, backgroundColor: theme.accent, borderRadius: 3 }} />

        {/* Main statement */}
        <div style={{ fontSize: S.headline, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1, letterSpacing: -1 }}>
          {item.name}
        </div>

        {/* Trust points as checklist */}
        {trustPoints.length > 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: v ? 20 : 14 }}>
            {trustPoints.map((point, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: v ? 16 : 12 }}>
                <div style={{ width: v ? 36 : 28, height: v ? 36 : 28, borderRadius: 8, backgroundColor: `${theme.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width={v ? 18 : 14} height={v ? 18 : 14} viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: v ? S.desc + 4 : S.desc + 2, fontWeight: 600, color: theme.textPrimary }}>{point.trim().replace(/\.$/, "")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: v ? S.desc + 6 : S.desc + 4, color: theme.textSecondary, lineHeight: 1.5, maxWidth: 700 }}>
            {item.description}
          </div>
        )}

        <PromoCode item={item} theme={theme} S={S} />
      </div>
      <FooterBar theme={theme} S={S} branding={branding} viewerPromoCode={viewerPromoCode} item={item} />
    </>
  );
}


/* ═══ Shared: Konekt Wordmark (icon + text) ═══ */
function KonektMark({ S, theme, isLight, branding }) {
  // Always render an icon + the word "Konekt" so social posts are
  // identifiable even when the admin has not uploaded a custom logo.
  // Falls back to TriadSVG when no uploaded logo is configured.
  const [logoErr, setLogoErr] = useState(false);
  const showUploadedLogo = branding?.resolved_logo_url && !logoErr;
  const wordmark = (branding?.trading_name || branding?.company_name || "Konekt").trim() || "Konekt";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {showUploadedLogo ? (
        <img src={branding.resolved_logo_url} alt="" crossOrigin="anonymous" onError={() => setLogoErr(true)} style={{ height: S.triad, width: "auto", objectFit: "contain", borderRadius: 4 }} />
      ) : (
        <TriadSVG size={S.triad} variant={isLight} primary={theme.textPrimary === "#fff" || theme.textPrimary === "#ffffff" || theme.textPrimary === "#f1f5f9" ? "#FFFFFF" : "#20364D"} accent={theme.accent} />
      )}
      <div style={{ fontSize: S.logoText * 1.05, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1, letterSpacing: -0.5 }}>{wordmark}</div>
    </div>
  );
}

/* ═══ Shared: Logo Bar ═══ */
function LogoBar({ theme, S, branding, isLight, hasDsc, discount }) {
  return (
    <div style={{ padding: `${S.pad * 0.7}px ${S.pad}px ${S.pad * 0.4}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <KonektMark S={S} theme={theme} isLight={isLight} branding={branding} />
        {branding.tagline && <div style={{ fontSize: S.tagline, color: theme.textSecondary, marginTop: 4, marginLeft: S.triad + 12 }}>{branding.tagline}</div>}
      </div>
      {hasDsc && discount > 0 && (
        <div style={{ backgroundColor: theme.badgeBg, color: theme.badgeText, padding: `${S.badge * 0.5}px ${S.badge}px`, borderRadius: 8, fontSize: S.badge, fontWeight: 800, letterSpacing: 0.5 }}>
          SAVE {money(discount)}
        </div>
      )}
    </div>
  );
}

/* ═══ Shared: Price Block ═══ */
function PriceBlock({ item, theme, S, v, hasDsc }) {
  if (!item.final_price || item.final_price <= 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
      <div style={{ backgroundColor: theme.priceBg, color: theme.priceText, padding: `${v ? 14 : 10}px ${v ? 28 : 20}px`, borderRadius: 12, fontSize: S.price, fontWeight: 800, letterSpacing: -0.5 }}>{money(item.final_price)}</div>
      {hasDsc && item.selling_price > 0 && <div style={{ fontSize: S.desc, color: theme.textSecondary, textDecoration: "line-through" }}>{money(item.selling_price)}</div>}
    </div>
  );
}

/* ═══ Shared: Promo Code ═══ */
function PromoCode({ item, theme, S }) {
  if (!item.promo_code) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <span style={{ fontSize: S.promo * 0.8, color: theme.textSecondary }}>Use code:</span>
      <span style={{ border: `2px dashed ${theme.accent}`, padding: `${S.promo * 0.35}px ${S.promo}px`, borderRadius: 8, fontSize: S.promo, fontWeight: 800, fontFamily: "monospace", color: theme.accent, letterSpacing: 2 }}>{item.promo_code}</span>
    </div>
  );
}

/* ═══ Shared: Footer Bar ═══
 *
 * Per-role rules (locked, do not soften):
 *  - Admin (no viewerPromoCode):
 *      * shows the company phone in the footer
 *      * QR encodes konekt.co.tz/<route>?ref=<KONEKT-or-active-promo-code>
 *      * code shown next to the QR is the item's promo_code (KONEKT or
 *        the more specific active-promo code, e.g. COOLTEX)
 *  - Affiliate / Sales (viewerPromoCode set):
 *      * NO company contacts shown (prevents customers bypassing the rep)
 *      * QR encodes konekt.co.tz/<route>?ref=<their personal code>
 *      * code shown is their personal code
 *
 * QR target uses the konekt.co.tz base url (production), never the
 * preview domain — keeps printed/screenshotted creatives valid forever.
 */
function FooterBar({ theme, S, branding, viewerPromoCode = "", item }) {
  const apiBase = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  const isAffiliateOrSales = !!viewerPromoCode;
  const itemPromo = (item?.promo_code || "").trim();
  const refCode = isAffiliateOrSales ? viewerPromoCode : itemPromo;
  const qrKind = item?.type === "group_deal" ? "group_deal"
    : item?.type === "promotion" ? "promo_campaign"
    : "product";
  const showQr = !!item?.id && item?.type !== "brand";
  const qrUrl = showQr && refCode
    ? `${apiBase}/api/qr/${qrKind}/${item.id}.png?ref=${encodeURIComponent(refCode)}`
    : (showQr ? `${apiBase}/api/qr/${qrKind}/${item.id}.png` : "");

  return (
    <div style={{ backgroundColor: theme.footerBg, padding: `${S.pad * 0.55}px ${S.pad}px`, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${theme.textSecondary}20`, gap: 16 }}>
      <div>
        <div style={{ fontSize: S.footer + 2, fontWeight: 700, color: theme.textPrimary || theme.footerText }}>
          {branding.trading_name || branding.company_name || "Konekt"}
        </div>
        {/* Admin sees company phone; affiliate/sales see nothing here to
            prevent the customer from bypassing the rep on the post. */}
        {!isAffiliateOrSales && branding.phone && (
          <div style={{ fontSize: S.footer, color: theme.footerText, marginTop: 2 }}>
            {branding.phone}
          </div>
        )}
      </div>
      {showQr ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: S.footer + 1, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 1 }}>Scan to Order</div>
            {refCode && (
              <div style={{ fontSize: S.footer - 1, color: theme.footerText, marginTop: 2, fontFamily: "monospace" }}>
                Code: {refCode}
              </div>
            )}
          </div>
          <div style={{ background: "#fff", padding: 6, borderRadius: 8, lineHeight: 0 }}>
            <img src={qrUrl} alt="QR" crossOrigin="anonymous" style={{ width: S.pad * 1.6, height: S.pad * 1.6, display: "block" }} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: S.footer + 1, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 1 }}>Order Now</div>
      )}
    </div>
  );
}

/* ═══ Caption Generator ═══ */
function generateCaptions(item, branding) {
  const brand = branding.trading_name || branding.company_name || "";
  const contact = [branding.phone, branding.email].filter(Boolean).join(" | ");

  // Brand/Message content (no price)
  if (item.type === "brand" || (!item.final_price && !item.selling_price)) {
    const short = `${item.name}. ${item.description || ""}`.trim();
    let social = `${item.name}.`;
    if (item.description) social += ` ${item.description}`;
    if (brand) social += `\n\n${brand}`;
    if (item.promo_code) social += `\nUse code ${item.promo_code}`;

    let whatsapp = `*${item.name}*`;
    if (item.description) whatsapp += `\n${item.description}`;
    if (item.promo_code) whatsapp += `\n\nPromo code: *${item.promo_code}*`;
    if (brand || contact) whatsapp += `\n\n${[brand, contact].filter(Boolean).join("\n")}`;

    return { short, social: social.trim(), whatsapp: whatsapp.trim(), story: `${item.name}\n${item.description || ""}` };
  }

  // Product/Service/Deal content (has price)
  const price = money(item.final_price);
  const save = item.discount_amount > 0 ? money(item.discount_amount) : "";
  const orig = item.selling_price !== item.final_price ? money(item.selling_price) : "";

  let short = `${item.name} at ${price}.`;
  if (save) short += ` Save ${save}.`;
  if (item.promo_code) short += ` Code: ${item.promo_code}`;

  let social = `${item.name} is available at ${price}.`;
  if (save && orig) social += ` Was ${orig}, now ${price} — save ${save}.`;
  if (item.promo_code) social += ` Use code ${item.promo_code} at checkout.`;
  if (item.category) social += ` Browse our ${item.category} collection.`;
  if (brand) social += ` ${brand}`;

  let whatsapp = `Hi! We have *${item.name}* available at *${price}*.`;
  if (save) whatsapp += ` Current offer saves you *${save}*.`;
  whatsapp += ` Share your quantity and I will prepare the best quote for your business.`;
  if (item.promo_code) whatsapp += ` Promo code: *${item.promo_code}*`;
  if (brand || contact) whatsapp += `\n\n${[brand, contact].filter(Boolean).join("\n")}`;

  return { short: short.trim(), social: social.trim(), whatsapp: whatsapp.trim(), story: `${item.name}\n${price}${save ? `\nSave ${save}` : ""}` };
}
