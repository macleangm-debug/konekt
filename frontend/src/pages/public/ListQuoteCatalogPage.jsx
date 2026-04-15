import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Plus, Minus, FileText, Loader2, ArrowLeft, Package, Send, X, PenLine, User, Building2, Phone, Mail } from "lucide-react";
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
  const [customItems, setCustomItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [catConfig, setCatConfig] = useState(null);
  const [customerNote, setCustomerNote] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState({ name: "", quantity: 1, unit: "Piece", description: "" });
  const [customer, setCustomer] = useState({ first_name: "", last_name: "", phone: "", email: "", company: "" });

  // Derive category config
  const showPrice = catConfig?.commercial_mode !== "request_quote";
  const allowCustomItems = catConfig?.allow_custom_items !== false;
  const requireDescription = catConfig?.require_description === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/api/public-marketplace/products${categoryName ? `?category=${encodeURIComponent(categoryName)}` : ""}`).catch(() => ({ data: [] })),
        api.get("/api/vendor-ops/catalog-config").catch(() => ({ data: {} })),
      ]);
      const products = Array.isArray(pRes.data) ? pRes.data : pRes.data?.products || [];
      setItems(products);
      // Try to find category config
      const cats = cRes.data?.categories || [];
      const match = cats.find(c => c.name?.toLowerCase() === categoryName?.toLowerCase());
      setCatConfig(match || { commercial_mode: "request_quote", allow_custom_items: true });
    } catch { /* ignore */ }
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
      setCart([...cart, { ...item, quantity: 1, notes: "" }]);
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

  const updateCartItemNotes = (itemId, notes) => {
    setCart(cart.map((c) => c.id === itemId ? { ...c, notes } : c));
  };

  const addCustomItem = () => {
    if (!customDraft.name.trim()) { toast.error("Item name is required"); return; }
    const id = `custom_${Date.now()}`;
    setCustomItems([...customItems, { ...customDraft, id, is_custom: true }]);
    setCustomDraft({ name: "", quantity: 1, unit: "Piece", description: "" });
    setShowCustomForm(false);
    toast.success("Custom item added");
  };

  const removeCustomItem = (id) => {
    setCustomItems(customItems.filter((c) => c.id !== id));
  };

  const totalItems = cart.length + customItems.length;

  const submitQuoteRequest = async () => {
    if (totalItems === 0) { toast.error("Add at least one item"); return; }
    if (!customer.first_name.trim() && !customer.last_name.trim()) { toast.error("Please enter your name"); return; }
    if (!customer.phone.trim()) { toast.error("Phone number is required"); return; }

    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.id,
          name: c.name,
          quantity: c.quantity,
          unit_of_measurement: c.unit_of_measurement || "Piece",
          category: c.category || c.category_name || categoryName,
          notes: c.notes || "",
        })),
        custom_items: customItems.map((ci) => ({
          name: ci.name,
          quantity: ci.quantity,
          unit_of_measurement: ci.unit || "Piece",
          description: ci.description || "",
        })),
        category: categoryName,
        customer_note: customerNote,
        customer: {
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          company: customer.company,
        },
        source: "list_quote_catalog",
      };
      await api.post("/api/public/quote-requests", payload);
      toast.success("Quote request submitted! We'll get back to you soon.");
      setCart([]);
      setCustomItems([]);
      setCustomerNote("");
      setCustomer({ first_name: "", last_name: "", phone: "", email: "", company: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="list-quote-catalog">
      {/* Header */}
      <div className="bg-[#0E1A2B] text-white py-8">
        <div className="max-w-6xl mx-auto px-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-3" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold" data-testid="catalog-title">{categoryName || "Request a Quote"}</h1>
          <p className="text-slate-300 mt-1 text-sm">Search items, enter quantities, and request a quote.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
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
            ) : filtered.length === 0 && !search ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No items in this category yet</p>
                <p className="text-xs text-slate-400 mt-1">Use "Add Custom Item" below to request specific items</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <p className="text-sm text-slate-500">No items match "{search}"</p>
                <p className="text-xs text-slate-400 mt-1">Try different keywords or add a custom item</p>
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
                        {showPrice && item.selling_price > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {catConfig?.commercial_mode === "hybrid" ? "Indicative: " : ""}{money(item.selling_price)}
                          </div>
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

            {/* Custom Item Section */}
            {allowCustomItems && (
              <div className="mt-4">
                {!showCustomForm ? (
                  <button
                    onClick={() => setShowCustomForm(true)}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500 hover:border-[#D4A843] hover:text-[#D4A843] transition flex items-center justify-center gap-2"
                    data-testid="add-custom-item-btn"
                  >
                    <PenLine className="w-4 h-4" />
                    Can't find what you need? Add a custom item
                  </button>
                ) : (
                  <div className="bg-white rounded-xl border border-[#D4A843]/30 p-4 space-y-3" data-testid="custom-item-form">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#20364D]">Add Custom Item</h4>
                      <button onClick={() => setShowCustomForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                    <Input
                      placeholder="Item name *"
                      value={customDraft.name}
                      onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
                      className="text-sm"
                      data-testid="custom-item-name"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Quantity</label>
                        <Input
                          type="number"
                          min={1}
                          value={customDraft.quantity}
                          onChange={(e) => setCustomDraft({ ...customDraft, quantity: parseInt(e.target.value) || 1 })}
                          className="text-sm"
                          data-testid="custom-item-qty"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Unit</label>
                        <Input
                          placeholder="e.g. Reams, Pieces, Kg"
                          value={customDraft.unit}
                          onChange={(e) => setCustomDraft({ ...customDraft, unit: e.target.value })}
                          className="text-sm"
                          data-testid="custom-item-unit"
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="Description / Specifications"
                      value={customDraft.description}
                      onChange={(e) => setCustomDraft({ ...customDraft, description: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] resize-none"
                      data-testid="custom-item-desc"
                    />
                    <Button size="sm" onClick={addCustomItem} className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C]" data-testid="custom-item-add-btn">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add to Request
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quote Cart + Customer Details (sticky sidebar) */}
          <div className="lg:sticky lg:top-6 self-start space-y-4" data-testid="quote-cart">
            {/* Request List */}
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4A843]" />
                <h3 className="text-sm font-bold text-[#20364D]">Quote Request</h3>
                {totalItems > 0 && <Badge className="bg-[#D4A843] text-[#17283C] text-[10px] ml-auto">{totalItems} item{totalItems !== 1 ? "s" : ""}</Badge>}
              </div>

              {totalItems === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Select items or add custom items to build your quote request</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2" data-testid={`cart-item-${c.id}`}>
                      <div className="flex items-center justify-between">
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
                      {requireDescription && (
                        <input
                          placeholder="Notes / Specs"
                          value={c.notes || ""}
                          onChange={(e) => updateCartItemNotes(c.id, e.target.value)}
                          className="mt-1 w-full text-[10px] border rounded px-2 py-1"
                        />
                      )}
                    </div>
                  ))}
                  {customItems.map((ci) => (
                    <div key={ci.id} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200" data-testid={`custom-cart-${ci.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#20364D] truncate">{ci.name} <Badge variant="outline" className="text-[8px] ml-1 py-0">Custom</Badge></div>
                          <div className="text-[10px] text-slate-400">{ci.quantity} {ci.unit}</div>
                          {ci.description && <div className="text-[10px] text-slate-500 italic mt-0.5 truncate">{ci.description}</div>}
                        </div>
                        <button onClick={() => removeCustomItem(ci.id)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details */}
            {totalItems > 0 && (
              <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="customer-details">
                <h4 className="text-sm font-bold text-[#20364D] flex items-center gap-2"><User className="w-4 h-4 text-[#D4A843]" /> Your Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">First Name *</label>
                    <div className="relative">
                      <Input
                        placeholder="First name"
                        value={customer.first_name}
                        onChange={(e) => setCustomer({ ...customer, first_name: e.target.value })}
                        className="text-xs h-9"
                        data-testid="customer-first-name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Last Name *</label>
                    <Input
                      placeholder="Last name"
                      value={customer.last_name}
                      onChange={(e) => setCustomer({ ...customer, last_name: e.target.value })}
                      className="text-xs h-9"
                      data-testid="customer-last-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5"><Phone className="w-3 h-3 inline mr-0.5" /> Phone *</label>
                  <Input
                    placeholder="+255 7XX XXX XXX"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="text-xs h-9"
                    data-testid="customer-phone"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5"><Mail className="w-3 h-3 inline mr-0.5" /> Email</label>
                  <Input
                    placeholder="email@company.com"
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="text-xs h-9"
                    data-testid="customer-email"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5"><Building2 className="w-3 h-3 inline mr-0.5" /> Company</label>
                  <Input
                    placeholder="Company name (optional)"
                    value={customer.company}
                    onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                    className="text-xs h-9"
                    data-testid="customer-company"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Additional Notes</label>
                  <textarea
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="Any special requirements..."
                    className="w-full border rounded-lg px-3 py-2 text-xs min-h-[50px] resize-none"
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
                  Request Quote ({totalItems} item{totalItems !== 1 ? "s" : ""})
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
