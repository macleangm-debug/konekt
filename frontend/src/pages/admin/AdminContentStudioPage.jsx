import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2, Download, Copy, Check, Image as ImageIcon, Tag,
  Square, RectangleVertical, MessageSquare, Send, Smartphone,
  Palette, RefreshCw, ChevronDown, Sparkles, Eye,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

/* ═══════════════════════════════════════════
   TEMPLATE THEMES
   ═══════════════════════════════════════════ */
const THEMES = [
  {
    key: "light",
    label: "Light",
    bg: "#FFFFFF",
    textPrimary: "#20364D",
    textSecondary: "#64748b",
    accent: "#D4A843",
    badgeBg: "#dc2626",
    badgeText: "#ffffff",
    footerBg: "#f8fafc",
    footerText: "#64748b",
    priceBg: "#20364D",
    priceText: "#ffffff",
  },
  {
    key: "dark",
    label: "Dark Premium",
    bg: "#0f172a",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    accent: "#D4A843",
    badgeBg: "#dc2626",
    badgeText: "#ffffff",
    footerBg: "#1e293b",
    footerText: "#94a3b8",
    priceBg: "#D4A843",
    priceText: "#0f172a",
  },
  {
    key: "promo",
    label: "Promotional",
    bg: "#7c2d12",
    textPrimary: "#ffffff",
    textSecondary: "#fed7aa",
    accent: "#fbbf24",
    badgeBg: "#fbbf24",
    badgeText: "#78350f",
    footerBg: "#9a3412",
    footerText: "#fed7aa",
    priceBg: "#fbbf24",
    priceText: "#78350f",
  },
  {
    key: "minimal",
    label: "Clean Minimal",
    bg: "#fafaf9",
    textPrimary: "#1c1917",
    textSecondary: "#78716c",
    accent: "#20364D",
    badgeBg: "#20364D",
    badgeText: "#ffffff",
    footerBg: "#f5f5f4",
    footerText: "#78716c",
    priceBg: "#20364D",
    priceText: "#ffffff",
  },
];

const FORMATS = [
  { key: "square", label: "Square", w: 1080, h: 1080, icon: Square },
  { key: "vertical", label: "Vertical", w: 1080, h: 1920, icon: RectangleVertical },
];

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function AdminContentStudioPage() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [selectedItem, setSelectedItem] = useState(null);
  const [theme, setTheme] = useState(THEMES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, svcRes, brandRes] = await Promise.all([
        api.get("/api/content-engine/template-data/products"),
        api.get("/api/content-engine/template-data/services"),
        api.get("/api/content-engine/template-data/branding"),
      ]);
      setProducts(prodRes.data?.items || []);
      setServices(svcRes.data?.items || []);
      setBranding(brandRes.data?.branding || {});
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = tab === "products" ? products : services;

  const handleSelect = (item) => {
    setSelectedItem(item);
    setShowPreview(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="content-studio">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Content Studio</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate branded social media creatives</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg transition" data-testid="refresh-studio-btn">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="studio-controls">
        {/* Tab: Products / Services */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setTab("products")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === "products" ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
            data-testid="tab-products"
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setTab("services")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === "services" ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
            data-testid="tab-services"
          >
            Services ({services.length})
          </button>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${theme.key === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                data-testid={`theme-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFormat(f)}
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1 ${format.key === f.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                data-testid={`format-${f.key}`}
              >
                <Icon className="w-3 h-3" /> {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="studio-empty">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No {tab} available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="studio-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              theme={theme}
              format={format}
              branding={branding}
              onSelect={() => handleSelect(item)}
            />
          ))}
        </div>
      )}

      {/* Preview & Download Drawer */}
      {selectedItem && (
        <CreativePreviewDrawer
          item={selectedItem}
          theme={theme}
          format={format}
          branding={branding}
          open={showPreview}
          onClose={() => { setShowPreview(false); setSelectedItem(null); }}
          onThemeChange={setTheme}
          onFormatChange={setFormat}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ItemCard — Product/Service Selector Card
   ═══════════════════════════════════════════ */
function ItemCard({ item, theme, format, branding, onSelect }) {
  return (
    <div
      className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
      onClick={onSelect}
      data-testid={`studio-item-${item.id}`}
    >
      {/* Image */}
      <div className="relative bg-slate-50 aspect-[4/3] overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <ImageIcon className="w-10 h-10 mb-1" />
            <span className="text-[10px]">No Image</span>
          </div>
        )}
        {item.has_promotion && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-red-500 text-white">
              <Tag className="w-3 h-3" /> {item.promo_code}
            </span>
          </div>
        )}
        {/* Hover: Generate CTA */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="flex items-center gap-2 bg-white text-[#20364D] rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-slate-50 transition-colors"
            data-testid={`generate-btn-${item.id}`}
          >
            <Sparkles className="w-4 h-4" /> Generate Creative
          </button>
        </div>
      </div>
      {/* Info */}
      <div className="px-3.5 py-3">
        <div className="text-sm font-semibold text-[#20364D] truncate">{item.name}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{item.category || item.type}</div>
        {item.final_price > 0 && (
          <div className="text-xs font-bold text-[#20364D] mt-1">
            {money(item.final_price)}
            {item.discount_amount > 0 && (
              <span className="text-emerald-600 font-semibold ml-1.5">Save {money(item.discount_amount)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Creative Preview Drawer
   ═══════════════════════════════════════════ */
function CreativePreviewDrawer({ item, theme, format, branding, open, onClose, onThemeChange, onFormatChange }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const captions = generateCaptions(item, branding);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight,
      });
      const link = document.createElement("a");
      link.download = `${item.name.replace(/\s+/g, "_")}-${format.key}-${theme.key}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Creative downloaded");
    } catch (err) {
      toast.error("Download failed — try again");
    }
    setDownloading(false);
  };

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Caption copied");
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const captionEntries = [
    { key: "short", label: "Short Caption", icon: MessageSquare },
    { key: "social", label: "Social Post", icon: MessageSquare },
    { key: "whatsapp", label: "WhatsApp / Sales", icon: Send },
    { key: "story", label: "Story Text", icon: Smartphone },
  ].filter((c) => captions[c.key]);

  // Scale factor for preview display
  const previewScale = format.key === "vertical" ? 0.25 : 0.42;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-5" data-testid="creative-preview-drawer">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold text-[#20364D]">
              {item.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Generate branded creative — choose theme and format, then download
            </SheetDescription>
          </SheetHeader>

          {/* Theme + Format Switcher */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onThemeChange(t)}
                  className={`px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${theme.key === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  data-testid={`drawer-theme-${t.key}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => onFormatChange(f)}
                    className={`px-2.5 py-1.5 text-[10px] font-semibold transition-colors flex items-center gap-1 ${format.key === f.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    data-testid={`drawer-format-${f.key}`}
                  >
                    <Icon className="w-3 h-3" /> {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Creative Preview */}
          <div className="rounded-xl border border-slate-200 bg-[#e8e8e8] p-3 mb-4 flex items-start justify-center overflow-hidden" style={{ maxHeight: format.key === "vertical" ? "520px" : "480px" }} data-testid="creative-preview-area">
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}>
              <BrandedCreative
                ref={canvasRef}
                item={item}
                theme={theme}
                format={format}
                branding={branding}
              />
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-[#20364D] text-white rounded-lg py-3 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors mb-5"
            data-testid="download-creative-btn"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download {format.label} ({format.w}x{format.h})
          </button>

          {/* Captions */}
          {captionEntries.length > 0 && (
            <div className="space-y-3 mb-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready-to-Use Captions</div>
              {captionEntries.map(({ key, label, icon: Icon }) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                    </div>
                    <button
                      onClick={() => handleCopy(key, captions[key])}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${copiedKey === key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      data-testid={`copy-caption-${key}`}
                    >
                      {copiedKey === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === key ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{captions[key]}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Share Pack */}
          {item.promo_code && (
            <div className="rounded-xl border border-[#20364D]/10 bg-[#20364D]/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Promo Code</span>
                <button
                  onClick={() => handleCopy("promo", item.promo_code)}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-[#20364D] hover:text-[#D4A843] transition-colors"
                  data-testid="copy-promo-code"
                >
                  {copiedKey === "promo" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {item.promo_code}
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════
   BrandedCreative — The Actual Template
   ═══════════════════════════════════════════ */
const BrandedCreative = React.forwardRef(({ item, theme, format, branding }, ref) => {
  const isVertical = format.key === "vertical";
  const w = format.w;
  const h = format.h;

  const logoUrl = branding.logo_url
    ? (branding.logo_url.startsWith("http") ? branding.logo_url : `${API_URL}/api/files/serve/${branding.logo_url}`)
    : "";

  const hasDiscount = item.discount_amount > 0;
  const hasImage = !!item.image_url;

  return (
    <div
      ref={ref}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        backgroundColor: theme.bg,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      data-testid="branded-creative"
    >
      {/* ── Top: Logo Bar ── */}
      <div
        style={{
          padding: isVertical ? "40px 48px 24px" : "32px 40px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              crossOrigin="anonymous"
              style={{ height: isVertical ? "48px" : "40px", objectFit: "contain" }}
            />
          )}
          <div>
            <div style={{ fontSize: isVertical ? "24px" : "20px", fontWeight: 700, color: theme.textPrimary, lineHeight: 1.2 }}>
              {branding.trading_name || "Konekt"}
            </div>
            {branding.tagline && (
              <div style={{ fontSize: isVertical ? "13px" : "11px", color: theme.textSecondary, marginTop: "2px" }}>
                {branding.tagline}
              </div>
            )}
          </div>
        </div>
        {hasDiscount && (
          <div
            style={{
              backgroundColor: theme.badgeBg,
              color: theme.badgeText,
              padding: isVertical ? "10px 20px" : "8px 16px",
              borderRadius: "8px",
              fontSize: isVertical ? "18px" : "14px",
              fontWeight: 800,
              letterSpacing: "0.5px",
            }}
          >
            SAVE {money(item.discount_amount)}
          </div>
        )}
      </div>

      {/* ── Middle: Product Image + Info ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: isVertical ? "column" : "row", padding: isVertical ? "0 48px" : "0 40px" }}>
        {/* Image Section */}
        {hasImage && (
          <div
            style={{
              flex: isVertical ? "none" : 1,
              height: isVertical ? "680px" : "auto",
              borderRadius: "16px",
              overflow: "hidden",
              marginBottom: isVertical ? "32px" : 0,
              marginRight: isVertical ? 0 : "32px",
              backgroundColor: "#f1f5f9",
            }}
          >
            <img
              src={item.image_url}
              alt={item.name}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {/* Text Section */}
        <div style={{ flex: hasImage && !isVertical ? 1 : "none", display: "flex", flexDirection: "column", justifyContent: "center", gap: isVertical ? "20px" : "16px" }}>
          {/* Category */}
          {item.category && (
            <div style={{ fontSize: isVertical ? "16px" : "13px", fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: "2px" }}>
              {item.category}
            </div>
          )}

          {/* Product Name */}
          <div style={{ fontSize: isVertical ? "48px" : "36px", fontWeight: 800, color: theme.textPrimary, lineHeight: 1.15, letterSpacing: "-0.5px" }}>
            {item.name}
          </div>

          {/* Description */}
          {item.description && (
            <div style={{ fontSize: isVertical ? "20px" : "16px", color: theme.textSecondary, lineHeight: 1.5, maxWidth: "500px" }}>
              {item.description}
            </div>
          )}

          {/* Price Block */}
          {item.final_price > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
              <div
                style={{
                  backgroundColor: theme.priceBg,
                  color: theme.priceText,
                  padding: isVertical ? "14px 28px" : "10px 20px",
                  borderRadius: "12px",
                  fontSize: isVertical ? "32px" : "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                {money(item.final_price)}
              </div>
              {hasDiscount && item.selling_price > 0 && (
                <div style={{ fontSize: isVertical ? "22px" : "16px", color: theme.textSecondary, textDecoration: "line-through" }}>
                  {money(item.selling_price)}
                </div>
              )}
            </div>
          )}

          {/* Promo Code */}
          {item.promo_code && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ fontSize: isVertical ? "16px" : "13px", color: theme.textSecondary }}>Use code:</div>
              <div
                style={{
                  border: `2px dashed ${theme.accent}`,
                  padding: isVertical ? "8px 20px" : "6px 14px",
                  borderRadius: "8px",
                  fontSize: isVertical ? "20px" : "16px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: theme.accent,
                  letterSpacing: "2px",
                }}
              >
                {item.promo_code}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── No Image: Full-Width Text Block ── */}
      {!hasImage && (
        <div style={{ flex: 1, padding: isVertical ? "40px 48px" : "24px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* Decorative accent line */}
          <div style={{ width: "60px", height: "4px", backgroundColor: theme.accent, borderRadius: "2px", marginBottom: isVertical ? "32px" : "20px" }} />
        </div>
      )}

      {/* ── Bottom: Footer ── */}
      <div
        style={{
          backgroundColor: theme.footerBg,
          padding: isVertical ? "32px 48px" : "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${theme.textSecondary}20`,
        }}
      >
        <div>
          <div style={{ fontSize: isVertical ? "16px" : "13px", fontWeight: 700, color: theme.textPrimary || theme.footerText }}>
            {branding.trading_name || branding.company_name || "Konekt"}
          </div>
          <div style={{ fontSize: isVertical ? "14px" : "11px", color: theme.footerText, marginTop: "2px" }}>
            {[branding.phone, branding.email].filter(Boolean).join(" | ")}
          </div>
        </div>
        <div style={{
          fontSize: isVertical ? "15px" : "12px",
          fontWeight: 700,
          color: theme.accent,
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}>
          Order Now
        </div>
      </div>
    </div>
  );
});

BrandedCreative.displayName = "BrandedCreative";

/* ═══════════════════════════════════════════
   Caption Generator
   ═══════════════════════════════════════════ */
function generateCaptions(item, branding) {
  const price = money(item.final_price);
  const save = item.discount_amount > 0 ? money(item.discount_amount) : "";
  const orig = item.selling_price !== item.final_price ? money(item.selling_price) : "";
  const brand = branding.trading_name || branding.company_name || "Konekt";
  const contact = [branding.phone, branding.email].filter(Boolean).join(" | ");

  let short = `${item.name} at ${price}.`;
  if (save) short += ` Save ${save}.`;
  if (item.promo_code) short += ` Code: ${item.promo_code}`;

  let social = `${item.name} is available at ${price}.`;
  if (save && orig) social += ` Was ${orig}, now ${price} — save ${save}.`;
  if (item.promo_code) social += ` Use code ${item.promo_code} at checkout.`;
  if (item.category) social += ` Browse our ${item.category} collection.`;
  social += ` ${brand}`;

  let whatsapp = `Hi! We have *${item.name}* available at *${price}*.`;
  if (save) whatsapp += ` There is a current offer saving you *${save}*.`;
  whatsapp += ` Share your quantity and I will prepare the best quote for your business.`;
  if (item.promo_code) whatsapp += ` Promo code: *${item.promo_code}*`;
  if (contact) whatsapp += `\n\n${brand}\n${contact}`;

  let story = `${item.name}\n${price}`;
  if (save) story += `\nSave ${save}`;

  return {
    short: short.trim(),
    social: social.trim(),
    whatsapp: whatsapp.trim(),
    story: story.trim(),
  };
}
