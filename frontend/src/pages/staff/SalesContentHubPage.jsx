import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";
import {
  Download, Copy, Check, Image as ImageIcon, Tag,
  MessageSquare, Send, Smartphone, Square, RectangleVertical,
  Loader2, Eye, RefreshCw,
} from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

function downloadImage(url, filename) {
  fetch(url, { mode: "cors" })
    .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded");
    })
    .catch(() => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.click();
      toast.info("Opened in new tab — save from there");
    });
}

function generateWhatsApp(item, branding) {
  const price = money(item.final_price || item.selling_price || 0);
  const save = item.discount_amount > 0 ? money(item.discount_amount) : "";
  const brand = branding.trading_name || "Konekt";
  const contact = [branding.phone, branding.email].filter(Boolean).join(" | ");

  let msg = `Hi! We have *${item.name}* available at *${price}*.`;
  if (save) msg += ` Current offer saves you *${save}*.`;
  msg += ` Share your quantity and I will prepare the best quote for your business.`;
  if (item.promo_code) msg += ` Promo code: *${item.promo_code}*`;
  if (contact) msg += `\n\n${brand}\n${contact}`;
  return msg;
}

function generateShort(item) {
  const price = money(item.final_price || item.selling_price || 0);
  let s = `${item.name} at ${price}.`;
  if (item.discount_amount > 0) s += ` Save ${money(item.discount_amount)}.`;
  if (item.promo_code) s += ` Code: ${item.promo_code}`;
  return s;
}

function generateSocial(item, branding) {
  const price = money(item.final_price || item.selling_price || 0);
  const brand = branding.trading_name || "Konekt";
  let s = `${item.name} is available at ${price}.`;
  if (item.discount_amount > 0 && item.selling_price) {
    s += ` Was ${money(item.selling_price)}, now ${price} — save ${money(item.discount_amount)}.`;
  }
  if (item.promo_code) s += ` Use code ${item.promo_code} at checkout.`;
  s += ` ${brand}`;
  return s;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "products", label: "Products" },
  { key: "services", label: "Services" },
];

export default function SalesContentHubPage() {
  const [items, setItems] = useState([]);
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, svcRes, brandRes] = await Promise.all([
        api.get("/api/content-engine/template-data/products"),
        api.get("/api/content-engine/template-data/services"),
        api.get("/api/content-engine/template-data/branding"),
      ]);

      const products = (prodRes.data?.items || []).filter((p) => p.image_url);
      const services = (svcRes.data?.items || []).filter((s) => s.image_url);

      const all = [...products, ...services].sort((a, b) => {
        if (a.has_promotion && !b.has_promotion) return -1;
        if (!a.has_promotion && b.has_promotion) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      setItems(all);
      setBranding(brandRes.data?.branding || {});
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? items : items.filter((i) => i.type === tab.replace(/s$/, ""));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4" data-testid="sales-content-hub">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#20364D]">Content to Share</h1>
          <p className="text-xs text-slate-400 mt-0.5">Pick, download, copy — ready to post</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="refresh-hub-btn">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit" data-testid="hub-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`}
            data-testid={`hub-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="hub-empty">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No content available yet</p>
          <p className="text-xs text-slate-400 mt-1">Content will appear here once your team generates creatives</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="hub-grid">
          {filtered.map((item) => (
            <SalesCard
              key={`${item.type}-${item.id}`}
              item={item}
              branding={branding}
              onPreview={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {/* Preview Drawer */}
      {selected && (
        <SalesPreviewDrawer
          item={selected}
          branding={branding}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SalesCard — Mobile-First, Action-Focused
   ═══════════════════════════════════════════ */
function SalesCard({ item, branding, onPreview }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCaption = () => {
    const caption = generateWhatsApp(item, branding);
    navigator.clipboard.writeText(caption);
    setCopied(true);
    toast.success("WhatsApp caption copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!item.image_url) return toast.error("No image");
    downloadImage(item.image_url, `${item.name.replace(/\s+/g, "_")}.jpg`);
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
      data-testid={`sales-card-${item.id}`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {item.has_promotion && item.promo_code && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 text-white shadow-sm">
              <Tag className="w-3 h-3" /> {item.promo_code}
            </span>
          </div>
        )}
        {/* Tap to preview overlay — bottom right */}
        <button
          onClick={onPreview}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg px-3 py-2 text-xs font-semibold shadow-md active:scale-95 transition-transform"
          data-testid={`preview-sales-${item.id}`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-[#20364D] truncate">{item.name}</div>
        <div className="flex items-center gap-2 mt-1">
          {item.category && <span className="text-[10px] text-slate-400">{item.category}</span>}
        </div>
        {item.final_price > 0 && (
          <div className="text-sm font-bold text-[#20364D] mt-1.5">
            {money(item.final_price)}
            {item.discount_amount > 0 && (
              <span className="text-emerald-600 font-semibold ml-2 text-xs">Save {money(item.discount_amount)}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons — Always Visible, Big Tap Targets */}
      <div className="flex border-t border-slate-100" data-testid={`actions-${item.id}`}>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[#20364D] hover:bg-slate-50 active:bg-slate-100 transition-colors border-r border-slate-100"
          data-testid={`download-sales-${item.id}`}
        >
          <Download className="w-4 h-4" /> Download
        </button>
        <button
          onClick={handleCopyCaption}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors active:scale-95 ${
            copied
              ? "bg-emerald-50 text-emerald-700"
              : "text-[#20364D] hover:bg-slate-50 active:bg-slate-100"
          }`}
          data-testid={`copy-sales-${item.id}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy Caption"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SalesPreviewDrawer — Full Preview + All Captions
   ═══════════════════════════════════════════ */
function SalesPreviewDrawer({ item, branding, onClose }) {
  const [copiedKey, setCopiedKey] = useState("");

  const captions = {
    whatsapp: generateWhatsApp(item, branding),
    short: generateShort(item),
    social: generateSocial(item, branding),
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(captions[key]);
    setCopiedKey(key);
    toast.success("Copied");
    setTimeout(() => setCopiedKey(""), 2000);
  };

  return (
    <StandardDrawerShell
      open={!!item}
      onClose={onClose}
      title={item.name}
      subtitle={item.category || item.type}
      testId="sales-preview-drawer"
    >
          {/* Large Image */}
          <div className="rounded-xl overflow-hidden bg-slate-100 mb-4">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full object-contain max-h-[340px]" />
            ) : (
              <div className="w-full h-52 flex items-center justify-center text-slate-300">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Download */}
          <button
            onClick={() => item.image_url ? downloadImage(item.image_url, `${item.name.replace(/\s+/g, "_")}.jpg`) : null}
            className="w-full flex items-center justify-center gap-2 bg-[#20364D] text-white rounded-lg py-3.5 text-sm font-semibold hover:bg-[#1a2d40] active:scale-[0.98] transition-all mb-4"
            data-testid="drawer-download-sales"
          >
            <Download className="w-4 h-4" /> Download Image
          </button>

          {/* Price */}
          {item.final_price > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Price</span>
                <span className="text-base font-bold text-[#20364D]">
                  {money(item.final_price)}
                  {item.discount_amount > 0 && (
                    <span className="text-emerald-600 text-xs ml-2">Save {money(item.discount_amount)}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Captions */}
          <div className="space-y-3 mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready Captions</div>

            {[
              { key: "whatsapp", label: "WhatsApp / Sales", icon: Send, primary: true },
              { key: "short", label: "Short Caption", icon: MessageSquare },
              { key: "social", label: "Social Post", icon: MessageSquare },
            ].map(({ key, label, icon: Icon, primary }) => (
              <div key={key} className={`rounded-lg border p-3 ${primary ? "border-[#20364D]/20 bg-[#20364D]/5" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                    {primary && <span className="text-[9px] bg-[#D4A843] text-white px-1.5 py-0.5 rounded font-bold ml-1">DEFAULT</span>}
                  </div>
                  <button
                    onClick={() => handleCopy(key)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors active:scale-95 ${
                      copiedKey === key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    data-testid={`copy-sales-caption-${key}`}
                  >
                    {copiedKey === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === key ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{captions[key]}</p>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          {item.promo_code && (
            <div className="rounded-xl border border-[#20364D]/10 bg-[#20364D]/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Promo Code</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(item.promo_code); setCopiedKey("promo"); toast.success("Copied"); setTimeout(() => setCopiedKey(""), 2000); }}
                  className="font-mono text-sm font-bold text-[#20364D] hover:text-[#D4A843] inline-flex items-center gap-1.5"
                  data-testid="copy-sales-promo"
                >
                  {copiedKey === "promo" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {item.promo_code}
                </button>
              </div>
            </div>
          )}
    </StandardDrawerShell>
  );
}
