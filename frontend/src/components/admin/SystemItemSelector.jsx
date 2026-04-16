import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Loader2, AlertTriangle, Package, Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

/**
 * SystemItemSelector — Source-of-truth line item editor for quotes.
 * 
 * RULES:
 * - Items MUST come from system catalog. No free-text.
 * - Sales CANNOT edit prices. Prices come from pricing engine only.
 * - Sales can ONLY change quantity.
 * - If item has no price → "Request Price" sends to Vendor Ops.
 * - Quote cannot be sent until all items are priced.
 */
export default function SystemItemSelector({ items, setItems, currency = "TZS" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [requestingPrice, setRequestingPrice] = useState(null);
  const searchRef = useRef(null);
  const timerRef = useRef(null);

  const searchProducts = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/api/public-marketplace/products?q=${encodeURIComponent(q)}&limit=15`);
      const products = Array.isArray(res.data) ? res.data : res.data?.products || [];
      setResults(products);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, searchProducts]);

  const addItem = (product) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems(items.map((i) =>
        i.product_id === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price } : i
      ));
    } else {
      const sellPrice = Number(product.selling_price || product.price || 0);
      const hasPricing = sellPrice > 0;
      setItems([...items, {
        product_id: product.id,
        name: product.name || "",
        description: product.description || product.name || "",
        sku: product.sku || "",
        category: product.category || product.category_name || "",
        unit_of_measurement: product.unit_of_measurement || "Piece",
        quantity: 1,
        unit_price: sellPrice,
        total: sellPrice,
        has_pricing: hasPricing,
        pricing_status: hasPricing ? "priced" : "waiting_for_pricing",
        vendor_cost: Number(product.vendor_cost || product.base_price || 0),
      }]);
    }
    setQuery("");
    setResults([]);
    setShowSearch(false);
  };

  const updateQty = (idx, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setItems(items.map((item, i) =>
      i === idx ? { ...item, quantity: q, total: q * item.unit_price } : item
    ));
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const requestPrice = async (idx) => {
    const item = items[idx];
    setRequestingPrice(idx);
    try {
      await api.post("/api/vendor-ops/price-requests", {
        product_id: item.product_id,
        product_name: item.name,
        category: item.category,
        unit_of_measurement: item.unit_of_measurement,
        quantity_needed: item.quantity,
        request_type: "quote_pricing",
        notes: `Price needed for quote. Product: ${item.name}, Qty: ${item.quantity} ${item.unit_of_measurement}`,
      });
      setItems(items.map((it, i) =>
        i === idx ? { ...it, pricing_status: "requested_from_vendor_ops" } : it
      ));
      toast.success(`Price request sent to Vendor Ops for "${item.name}"`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send price request");
    }
    setRequestingPrice(null);
  };

  const waitingCount = items.filter((i) => i.pricing_status !== "priced").length;

  return (
    <div className="rounded-2xl border bg-white p-5" data-testid="system-item-selector">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#2D3E50]" />
          <h3 className="text-lg font-semibold">Line Items</h3>
          {items.length > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">{items.length}</Badge>}
        </div>
        <button
          type="button"
          onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          data-testid="add-system-item-btn"
        >
          <Plus className="w-4 h-4" /> Add Item from Catalog
        </button>
      </div>

      {/* Pricing Warning */}
      {waitingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4" data-testid="pricing-warning">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>{waitingCount} item{waitingCount > 1 ? "s" : ""}</strong> need pricing. Send price requests to Vendor Ops or wait for pricing to complete. Quote cannot be sent until all items are priced.
          </div>
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className="mb-4 rounded-xl border border-[#D4A843]/30 bg-[#D4A843]/5 p-4" data-testid="item-search-panel">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products by name, SKU, or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#D4A843]/30 focus:border-[#D4A843] outline-none"
              data-testid="item-search-input"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-[240px] overflow-y-auto space-y-1" data-testid="item-search-results">
              {results.map((p) => {
                const price = Number(p.selling_price || p.price || 0);
                const alreadyAdded = items.some((i) => i.product_id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !alreadyAdded && addItem(p)}
                    disabled={alreadyAdded}
                    className={`w-full text-left p-3 rounded-lg border transition ${alreadyAdded ? "bg-green-50 border-green-200" : "hover:bg-slate-50 border-slate-100"}`}
                    data-testid={`search-result-${p.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#20364D] truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.category_name && <span className="ml-2">{p.category_name}</span>}
                          {p.unit_of_measurement && <span className="ml-2">/ {p.unit_of_measurement}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {price > 0 ? (
                          <span className="text-sm font-semibold text-emerald-600">{money(price)}</span>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 text-[9px]">Needs Pricing</Badge>
                        )}
                        {alreadyAdded && <Check className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="mt-2 text-center py-4 text-sm text-slate-400">
              No products found for "{query}".
              <span className="block text-xs mt-1">If the item doesn't exist, Vendor Ops needs to add it to the catalog first.</span>
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }} className="text-xs text-slate-500 hover:text-slate-700">Close search</button>
          </div>
        </div>
      )}

      {/* Line Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400" data-testid="empty-items">
          <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No items added. Click "Add Item from Catalog" to search products.</p>
          <p className="text-xs text-slate-300 mt-1">All items and prices come from the system. Sales only sets quantity.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="line-items-list">
          {items.map((item, idx) => {
            const needsPrice = item.pricing_status !== "priced";
            const requested = item.pricing_status === "requested_from_vendor_ops";
            return (
              <div
                key={item.product_id || idx}
                className={`rounded-xl border p-4 ${needsPrice ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50"}`}
                data-testid={`quote-line-item-${idx}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#20364D]">{item.name}</span>
                      {item.sku && <span className="text-[10px] text-slate-400">SKU: {item.sku}</span>}
                      {item.pricing_status === "priced" && <Badge className="bg-emerald-100 text-emerald-700 text-[8px]">Priced</Badge>}
                      {item.pricing_status === "waiting_for_pricing" && <Badge className="bg-amber-100 text-amber-700 text-[8px]">Needs Pricing</Badge>}
                      {requested && <Badge className="bg-blue-100 text-blue-700 text-[8px]">Sent to Vendor Ops</Badge>}
                    </div>
                    {item.category && <div className="text-[10px] text-slate-400 mt-0.5">{item.category} / {item.unit_of_measurement || "Piece"}</div>}
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition" data-testid={`remove-item-${idx}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(idx, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-center bg-white"
                      data-testid={`item-qty-${idx}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Unit Price ({currency})</label>
                    <div className={`border rounded-lg px-3 py-2 text-sm text-right font-medium ${needsPrice ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-100 text-[#20364D]"}`} data-testid={`item-price-${idx}`}>
                      {needsPrice ? "Pending" : money(item.unit_price)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Total</label>
                    <div className="border rounded-lg px-3 py-2 text-sm text-right font-medium bg-slate-100">
                      {needsPrice ? "\u2014" : money(item.total)}
                    </div>
                  </div>
                </div>

                {/* Request Price button — only for items needing pricing */}
                {item.pricing_status === "waiting_for_pricing" && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => requestPrice(idx)}
                      disabled={requestingPrice === idx}
                      className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                      data-testid={`request-price-${idx}`}
                    >
                      {requestingPrice === idx ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                      Request Price from Vendor Ops
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
