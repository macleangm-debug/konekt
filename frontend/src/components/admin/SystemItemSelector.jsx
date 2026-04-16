import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Loader2, AlertTriangle, Package, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

/**
 * SystemItemSelector — Source-of-truth line item editor for quotes.
 * Items MUST come from system catalog. No free-text entry.
 * Respects category config for pricing visibility.
 */
export default function SystemItemSelector({ items, setItems, currency = "TZS" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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
      const price = Number(product.selling_price || product.price || 0);
      const hasPricing = price > 0;
      setItems([...items, {
        product_id: product.id,
        name: product.name || "",
        description: product.description || product.name || "",
        sku: product.sku || "",
        category: product.category || product.category_name || "",
        unit_of_measurement: product.unit_of_measurement || "Piece",
        quantity: 1,
        unit_price: price,
        total: price,
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

  const updatePrice = (idx, price) => {
    const p = Number(price) || 0;
    setItems(items.map((item, i) =>
      i === idx ? { ...item, unit_price: p, total: item.quantity * p, has_pricing: p > 0, pricing_status: p > 0 ? "priced" : "waiting_for_pricing" } : item
    ));
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const waitingCount = items.filter((i) => i.pricing_status === "waiting_for_pricing").length;

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
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Pricing Warning */}
      {waitingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4" data-testid="pricing-warning">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>{waitingCount} item{waitingCount > 1 ? "s" : ""}</strong> waiting for pricing from Vendor Ops. Quote cannot be sent until all prices are set.
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
                          <Badge className="bg-amber-100 text-amber-700 text-[9px]">Quote</Badge>
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
            <div className="mt-2 text-center py-4 text-sm text-slate-400">No products found for "{query}"</div>
          )}
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }} className="text-xs text-slate-500 hover:text-slate-700">
              Close search
            </button>
          </div>
        </div>
      )}

      {/* Line Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400" data-testid="empty-items">
          <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No items added. Click "Add Item" to search from the catalog.</p>
          <p className="text-xs text-slate-300 mt-1">All items must come from the system catalog.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="line-items-list">
          {items.map((item, idx) => (
            <div
              key={item.product_id || idx}
              className={`rounded-xl border p-4 ${item.pricing_status === "waiting_for_pricing" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50"}`}
              data-testid={`quote-line-item-${idx}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#20364D]">{item.name}</span>
                    {item.sku && <span className="text-[10px] text-slate-400">SKU: {item.sku}</span>}
                    {item.pricing_status === "waiting_for_pricing" && (
                      <Badge className="bg-amber-100 text-amber-700 text-[8px]" data-testid={`waiting-badge-${idx}`}>Waiting for pricing</Badge>
                    )}
                  </div>
                  {item.category && <div className="text-[10px] text-slate-400 mt-0.5">{item.category} / {item.unit_of_measurement || "Piece"}</div>}
                </div>
                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition" data-testid={`remove-item-${idx}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Qty</label>
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
                  <input
                    type="number"
                    min={0}
                    value={item.unit_price}
                    onChange={(e) => updatePrice(idx, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-right ${item.pricing_status === "waiting_for_pricing" ? "border-amber-300 bg-amber-50" : "bg-white"}`}
                    data-testid={`item-price-${idx}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Total</label>
                  <div className="border rounded-lg px-3 py-2 text-sm text-right font-medium bg-slate-100">
                    {money(item.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
