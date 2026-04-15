import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Plus, Minus, ShoppingCart, FileText, Loader2, ArrowLeft, Package, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

export default function ListQuoteCatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryName = searchParams.get("category") || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState(null);
  const [customerNote, setCustomerNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/api/public/products${categoryName ? `?category=${encodeURIComponent(categoryName)}` : ""}`).catch(() => ({ data: { products: [] } })),
        api.get("/api/vendor-ops/catalog-config").catch(() => ({ data: {} })),
      ]);
      setItems(pRes.data?.products || []);
      setConfig(cRes.data || {});
    } catch {}
    setLoading(false);
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((p) =>
    !search || [p.name, p.brand, p.sku, p.description].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (item) => {
    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      setCart(cart.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.name} added`);
  };

  const updateQty = (itemId, delta) => {
    setCart(cart.map((c) => {
      if (c.id === itemId) {
        const newQty = Math.max(0, c.quantity + delta);
        return newQty === 0 ? null : { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const submitQuoteRequest = async () => {
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.id,
          name: c.name,
          quantity: c.quantity,
          unit_of_measurement: c.unit_of_measurement || "Piece",
          category: c.category || categoryName,
        })),
        category: categoryName,
        customer_note: customerNote,
        source: "list_quote_catalog",
      };
      await api.post("/api/public/quote-requests", payload);
      toast.success("Quote request submitted! We'll get back to you soon.");
      setCart([]);
      setCustomerNote("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="list-quote-catalog">
      {/* Header */}
      <div className="bg-[#0E1A2B] text-white py-8">
        <div className="max-w-5xl mx-auto px-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold" data-testid="catalog-title">{categoryName || "Request a Quote"}</h1>
          <p className="text-slate-300 mt-1 text-sm">Search items, select quantities, and submit your quote request.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Search + Items List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder={`Search ${categoryName || "items"}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 text-base bg-white border-slate-200 rounded-xl"
                data-testid="search-items"
              />
            </div>

            {/* Items */}
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">{search ? "No items match your search" : "No items in this category"}</p>
                <p className="text-xs text-slate-400 mt-1">Try a different search term or contact us for custom requests</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="items-list">
                {filtered.map((item) => {
                  const inCart = cart.find((c) => c.id === item.id);
                  return (
                    <div key={item.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition ${inCart ? "border-[#D4A843] bg-[#D4A843]/5" : "border-slate-200"}`} data-testid={`item-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#20364D]">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.unit_of_measurement && <span>Per {item.unit_of_measurement}</span>}
                          {item.sku && <span className="ml-2 text-slate-400">SKU: {item.sku}</span>}
                          {item.brand && <span className="ml-2">{item.brand}</span>}
                        </div>
                        {item.selling_price > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">Indicative: {money(item.selling_price)}</div>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition" data-testid={`qty-minus-${item.id}`}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-8 text-center" data-testid={`qty-${item.id}`}>{inCart.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-lg bg-[#20364D] text-white flex items-center justify-center hover:bg-[#1a2d40] transition" data-testid={`qty-plus-${item.id}`}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-slate-400 ml-1">{item.unit_of_measurement || "pcs"}</span>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => addToCart(item)} className="flex-shrink-0" data-testid={`add-${item.id}`}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quote Cart (sticky sidebar) */}
          <div className="lg:sticky lg:top-6 self-start" data-testid="quote-cart">
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4A843]" />
                <h3 className="text-sm font-bold text-[#20364D]">Quote Request</h3>
                {cart.length > 0 && <Badge className="bg-[#D4A843] text-[#17283C] text-[10px] ml-auto">{cart.length} item{cart.length !== 1 ? "s" : ""}</Badge>}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-6">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Select items from the list to build your quote request</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {cart.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2" data-testid={`cart-item-${c.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#20364D] truncate">{c.name}</div>
                          <div className="text-[10px] text-slate-400">{c.quantity} {c.unit_of_measurement || "pcs"}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => updateQty(c.id, -1)} className="w-6 h-6 rounded bg-white border flex items-center justify-center hover:bg-slate-50"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-bold w-6 text-center">{c.quantity}</span>
                          <button onClick={() => updateQty(c.id, 1)} className="w-6 h-6 rounded bg-white border flex items-center justify-center hover:bg-slate-50"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Notes (optional)</label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Any special requirements..."
                      className="w-full border rounded-lg px-3 py-2 text-xs min-h-[60px] resize-none"
                      data-testid="quote-notes"
                    />
                  </div>
                  <Button
                    className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-bold"
                    onClick={submitQuoteRequest}
                    disabled={submitting}
                    data-testid="submit-quote-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Request Quote ({cart.length} item{cart.length !== 1 ? "s" : ""})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
