import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2,
  RefreshCw,
  Plus,
  Eye,
  Archive,
  Copy,
  Download,
  Image as ImageIcon,
  Sparkles,
  Tag,
  MessageSquare,
  Send,
  Smartphone,
  Square,
  RectangleVertical,
  CheckCircle2,
  X,
  ExternalLink,
  Check,
  LayoutGrid,
} from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}
function authH() {
  const t =
    localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

const FORMAT_ICONS = { square: Square, vertical: RectangleVertical, image: ImageIcon };
const FORMAT_LABELS = { square: "Square", vertical: "Vertical", image: "Image" };

/* Normalize old vs new content item fields */
function normalizeItem(raw) {
  return {
    ...raw,
    format: raw.format || "image",
    target_name: raw.target_name || raw.title || "",
    promotion_code: raw.promotion_code || raw.promo_code || "",
    promotion_name: raw.promotion_name || "",
    captions: normalizeCaptions(raw.captions || {}),
    headline: raw.headline || raw.title || raw.target_name || "",
  };
}

function normalizeCaptions(c) {
  return {
    short: c.short || c.short_social || "",
    medium: c.medium || c.professional || "",
    whatsapp_sales: c.whatsapp_sales || c.closing_script || "",
    story: c.story || "",
  };
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

export default function AdminContentCenterPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [formatFilter, setFormatFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (formatFilter) params.set("format", formatFilter);
      if (campaignFilter) params.set("campaign_id", campaignFilter);

      const [contentRes, campRes, sugRes] = await Promise.all([
        api.get(`/api/admin/content-center?${params.toString()}`, {
          headers: authH(),
        }),
        api.get("/api/content-engine/campaigns", { headers: authH() }),
        api.get("/api/content-engine/suggestions", { headers: authH() }),
      ]);
      const rawItems = (contentRes.data?.items || []).map(normalizeItem);
      // Sort: items with images first, then by updated_at
      rawItems.sort((a, b) => {
        const aHas = a.image_url ? 1 : 0;
        const bHas = b.image_url ? 1 : 0;
        return bHas - aHas;
      });
      setItems(rawItems);
      setCampaigns(campRes.data?.campaigns || []);
      setSuggestions(sugRes.data?.suggestions || []);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [statusFilter, formatFilter, campaignFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async (type, actionId) => {
    setGenerating(actionId || type);
    try {
      const endpoint =
        type === "promotion"
          ? "/api/content-engine/generate-campaign"
          : "/api/content-engine/generate-product";
      const body =
        type === "promotion"
          ? { promotion_id: actionId }
          : { product_id: actionId };
      const res = await api.post(endpoint, body, { headers: authH() });
      toast.success(`Generated ${res.data?.count || 0} content assets`);
      load();
    } catch {
      toast.error("Generation failed");
    }
    setGenerating(null);
  };

  const handleArchive = async (id) => {
    try {
      await api.post(
        `/api/admin/content-center/${id}/archive`,
        {},
        { headers: authH() }
      );
      toast.success("Content archived");
      load();
      if (selected?.id === id) setSelected(null);
    } catch {
      toast.error("Archive failed");
    }
  };

  const activeCampaignName = campaigns.find(
    (c) => c.id === campaignFilter
  )?.name;

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5"
      data-testid="admin-content-center"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Content Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ready-to-share campaign content for your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/content-studio")}
            className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#1a2d40] transition-colors"
            data-testid="create-branded-post-btn"
          >
            <Sparkles className="w-4 h-4" />
            Create Branded Post
          </button>
          <button
            onClick={load}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            data-testid="refresh-content-btn"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ─── Smart Suggestions ─── */}
      {suggestions.length > 0 && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"
          data-testid="content-suggestions"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3">
            <Sparkles className="w-4 h-4" /> Suggestions
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2.5"
              >
                <div className="min-w-0 mr-3">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {s.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {s.description}
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleGenerate(
                      s.action_type === "generate_from_promotion"
                        ? "promotion"
                        : "product",
                      s.action_id
                    )
                  }
                  disabled={generating === s.action_id}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shrink-0"
                  data-testid={`generate-suggestion-${i}`}
                >
                  {generating === s.action_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Generate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Campaigns Row ─── */}
      {campaigns.length > 0 && (
        <div data-testid="campaigns-section">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Campaigns
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {campaigns.map((c) => {
              const isActive = campaignFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    setCampaignFilter(isActive ? "" : c.id)
                  }
                  className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-all ${
                    isActive
                      ? "border-[#20364D] bg-[#20364D] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  data-testid={`campaign-chip-${c.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">
                      {c.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.content_count} assets
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-0.5 truncate max-w-[160px] ${
                      isActive ? "text-white/80" : "text-slate-400"
                    }`}
                  >
                    {c.name}
                  </div>
                  {c.content_count === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerate("promotion", c.id);
                      }}
                      disabled={generating === c.id}
                      className="mt-1.5 w-full flex items-center justify-center gap-1 rounded bg-[#D4A843] text-white text-[10px] font-semibold py-1 hover:bg-[#c49a3a] disabled:opacity-50 transition-colors"
                      data-testid={`generate-campaign-${c.id}`}
                    >
                      {generating === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Generate
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Filters Bar ─── */}
      <div
        className="flex items-center gap-2 flex-wrap"
        data-testid="content-filters"
      >
        {/* Status tabs */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.key
                  ? "bg-[#20364D] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              data-testid={`filter-status-${tab.key || "all"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Format toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setFormatFilter("")}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              !formatFilter
                ? "bg-[#20364D] text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            data-testid="filter-format-all"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button
            onClick={() =>
              setFormatFilter(formatFilter === "square" ? "" : "square")
            }
            className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${
              formatFilter === "square"
                ? "bg-[#20364D] text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            data-testid="filter-format-square"
          >
            <Square className="w-3 h-3" /> Square
          </button>
          <button
            onClick={() =>
              setFormatFilter(formatFilter === "vertical" ? "" : "vertical")
            }
            className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${
              formatFilter === "vertical"
                ? "bg-[#20364D] text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            data-testid="filter-format-vertical"
          >
            <RectangleVertical className="w-3 h-3" /> Vertical
          </button>
        </div>

        {/* Active campaign filter badge */}
        {campaignFilter && (
          <button
            onClick={() => setCampaignFilter("")}
            className="flex items-center gap-1 text-xs font-semibold text-[#20364D] bg-[#20364D]/10 px-2.5 py-1.5 rounded-lg hover:bg-[#20364D]/20 transition-colors"
            data-testid="clear-campaign-filter"
          >
            <Tag className="w-3 h-3" />
            {activeCampaignName || "Campaign"}
            <X className="w-3 h-3 ml-1" />
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">
          {items.length} items
        </span>
      </div>

      {/* ─── Content Grid ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl"
          data-testid="content-empty"
        >
          <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            No content found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Generate content from a campaign above, or adjust your filters
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="content-grid"
        >
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onPreview={() => setSelected(item)}
              onArchive={() => handleArchive(item.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Preview Drawer ─── */}
      <ContentPreviewDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ContentCard — Media-First with Quick Actions
   ═══════════════════════════════════════════ */
function ContentCard({ item, onPreview, onArchive }) {
  const [copied, setCopied] = useState(false);
  const FmtIcon = FORMAT_ICONS[item.format] || Square;
  const nc = normalizeCaptions(item.captions || {});
  const shortCaption = nc.short || nc.medium || item.headline || "";

  const handleCopyCaption = (e) => {
    e.stopPropagation();
    if (!shortCaption) return;
    navigator.clipboard.writeText(shortCaption);
    setCopied(true);
    toast.success("Caption copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!item.image_url) {
      toast.error("No image available to download");
      return;
    }
    downloadImage(
      item.image_url,
      `${item.target_name || "content"}-${item.format}.jpg`
    );
  };

  return (
    <div
      className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
      onClick={onPreview}
      data-testid={`content-card-${item.id}`}
    >
      {/* ── Image Area ── */}
      <div className="relative bg-slate-50 aspect-[4/3] overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.target_name || "Content"}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <ImageIcon className="w-10 h-10 mb-1" />
            <span className="text-[10px] font-medium">No Image</span>
          </div>
        )}

        {/* Top-left: Format badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
            <FmtIcon className="w-3 h-3" />
            {FORMAT_LABELS[item.format] || item.format}
          </span>
        </div>

        {/* Bottom-left: Promo badge */}
        {item.has_promotion && (item.promotion_code || item.promo_code) && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-red-500/90 text-white backdrop-blur-sm">
              <Tag className="w-3 h-3" />
              {item.promotion_code || item.promo_code}
            </span>
          </div>
        )}

        {/* Hover overlay — Quick Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center gap-1.5 bg-white text-slate-700 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg hover:bg-slate-50 transition-colors"
            data-testid={`preview-btn-${item.id}`}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-white text-slate-700 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg hover:bg-slate-50 transition-colors"
            data-testid={`download-btn-${item.id}`}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 bg-white text-slate-700 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg hover:bg-slate-50 transition-colors"
            data-testid={`copy-btn-${item.id}`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Caption"}
          </button>
        </div>
      </div>

      {/* ── Info Footer ── */}
      <div className="px-3.5 py-3">
        <div className="text-sm font-semibold text-[#20364D] truncate leading-tight">
          {item.headline || item.target_name || "Untitled"}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {item.promotion_name && (
            <span className="text-[10px] text-slate-400 truncate">
              {item.promotion_name}
            </span>
          )}
          {!item.promotion_name && item.category && (
            <span className="text-[10px] text-slate-400 truncate">
              {item.category}
            </span>
          )}
        </div>
        {item.final_price > 0 && (
          <div className="text-xs font-bold text-[#20364D] mt-1">
            {money(item.final_price)}
            {item.discount_amount > 0 && (
              <span className="text-emerald-600 font-semibold ml-1.5">
                Save {money(item.discount_amount)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ContentPreviewDrawer — Full Preview + Actions
   ═══════════════════════════════════════════ */
function ContentPreviewDrawer({ item, onClose }) {
  if (!item) return null;

  const captions = normalizeCaptions(item.captions || {});
  const captionEntries = [
    { key: "short", label: "Short Caption", icon: MessageSquare },
    { key: "medium", label: "Social Post", icon: MessageSquare },
    { key: "whatsapp_sales", label: "WhatsApp / Sales", icon: Send },
    { key: "story", label: "Story", icon: Smartphone },
  ].filter((c) => captions[c.key]);

  const FmtIcon = FORMAT_ICONS[item.format] || Square;

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
        <div className="p-5" data-testid="content-preview-drawer">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold text-[#20364D] leading-tight">
              {item.headline || item.target_name || "Content Preview"}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <FmtIcon className="w-3 h-3" />
                {FORMAT_LABELS[item.format] || item.format}
              </span>
              {item.promotion_code && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="font-mono font-bold text-[#20364D]">
                    {item.promotion_code}
                  </span>
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* ── Section 1: Large Media Preview ── */}
          <div className="rounded-xl overflow-hidden bg-slate-100 mb-5">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.target_name || "Preview"}
                className="w-full object-contain max-h-[340px]"
              />
            ) : (
              <div className="w-full h-52 flex flex-col items-center justify-center text-slate-300">
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="text-xs font-medium">No image available</span>
              </div>
            )}
          </div>

          {/* ── Section 2: Download Actions ── */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() =>
                item.image_url
                  ? downloadImage(
                      item.image_url,
                      `${item.target_name || "content"}-${item.format}.jpg`
                    )
                  : toast.error("No image available")
              }
              className="flex-1 flex items-center justify-center gap-2 bg-[#20364D] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#1a2d40] transition-colors"
              data-testid="drawer-download-btn"
            >
              <Download className="w-4 h-4" />
              Download {FORMAT_LABELS[item.format] || "Image"}
            </button>
          </div>

          {/* ── Section 3: Content Details ── */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 mb-5 space-y-2">
            {item.promotion_name && (
              <DetailRow label="Campaign" value={item.promotion_name} />
            )}
            {item.category && (
              <DetailRow label="Category" value={item.category} />
            )}
            {item.target_name && (
              <DetailRow label="Product / Service" value={item.target_name} />
            )}
            <DetailRow
              label="Format"
              value={FORMAT_LABELS[item.format] || item.format}
            />
            <DetailRow
              label="Status"
              value={
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {item.status || "active"}
                </span>
              }
            />
            {item.final_price > 0 && (
              <DetailRow
                label="Price"
                value={
                  <span className="font-bold text-[#20364D]">
                    {money(item.final_price)}
                    {item.discount_amount > 0 && (
                      <span className="text-emerald-600 font-semibold ml-1.5 text-xs">
                        (Save {money(item.discount_amount)})
                      </span>
                    )}
                  </span>
                }
              />
            )}
          </div>

          {/* ── Section 4: Captions ── */}
          {captionEntries.length > 0 && (
            <div className="space-y-3 mb-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ready-to-Use Captions
              </div>
              {captionEntries.map(({ key, label, icon: Icon }) => (
                <CaptionBlock
                  key={key}
                  label={label}
                  icon={Icon}
                  text={captions[key]}
                  testId={`copy-caption-${key}`}
                />
              ))}
            </div>
          )}

          {/* ── Section 5: Promo Code + CTA ── */}
          {(item.promotion_code || item.cta) && (
            <div className="rounded-xl border border-[#20364D]/10 bg-[#20364D]/5 p-3.5 space-y-2.5">
              {item.promotion_code && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Promo Code
                  </span>
                  <CopyButton
                    text={item.promotion_code}
                    label={item.promotion_code}
                    isMono
                    testId="copy-promo-code"
                  />
                </div>
              )}
              {item.cta && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Call to Action
                  </span>
                  <span className="text-sm font-semibold text-[#20364D]">
                    {item.cta}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══ Helper: Detail Row ═══ */
function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-sm text-slate-700">{typeof value === "string" ? value : value}</span>
    </div>
  );
}

/* ═══ Helper: Caption Block ═══ */
function CaptionBlock({ label, icon: Icon, text, testId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          {label}
        </div>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
          data-testid={testId}
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {text}
      </p>
    </div>
  );
}

/* ═══ Helper: Copy Button ═══ */
function CopyButton({ text, label, isMono, testId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-sm font-bold text-[#20364D] hover:text-[#D4A843] transition-colors ${
        isMono ? "font-mono" : ""
      }`}
      data-testid={testId}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

/* ═══ Utility: Download Image ═══ */
function downloadImage(url, filename) {
  // Try fetch+blob for same-origin or CORS-enabled, fallback to link
  fetch(url, { mode: "cors" })
    .then((res) => {
      if (!res.ok) throw new Error("Network");
      return res.blob();
    })
    .then((blob) => {
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
      toast.success("Download started");
    })
    .catch(() => {
      // Fallback: open in new tab
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      toast.info("Image opened in new tab — right-click to save");
    });
}
