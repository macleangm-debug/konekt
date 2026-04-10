import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Package, Wrench, Plus, Trash2, Search, Loader2,
  CheckCircle2, ArrowRight, ChevronDown, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import { comprehensiveServicesList } from "../../data/comprehensiveServiceData";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const INPUT = "w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20";
const LABEL = "block text-xs font-semibold text-slate-500 mb-1";

const DEFAULT_MARGIN_PCT = 30;

function getToken() {
  return localStorage.getItem("konekt_admin_token") || localStorage.getItem("konekt_staff_token") || localStorage.getItem("konekt_token") || localStorage.getItem("token");
}

export default function QuoteBuilderDrawer({ lead, onClose, onCreated }) {
  const [lineItems, setLineItems] = useState([]);
  const [addingType, setAddingType] = useState(null); // "product" | "service" | null
  const [submitting, setSubmitting] = useState(false);

  // Item Type Lock-in: once the first item is added, lock to that type
  const lockedType = lineItems.length > 0 ? lineItems[0].type : null;

  // Product search
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const searchTimeout = useRef(null);

  // Selected item being configured
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [negotiatedEnabled, setNegotiatedEnabled] = useState(false);
  const [negotiatedCost, setNegotiatedCost] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");

  // Product search handler
  const searchProducts = useCallback(async (q) => {
    if (!q || q.length < 2) { setProductResults([]); return; }
    setProductSearching(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(q)}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProductResults(Array.isArray(data) ? data : data.products || data.items || []);
      }
    } catch {} finally { setProductSearching(false); }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(productQuery), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [productQuery, searchProducts]);

  // Effective cost + selling price calculation
  const calcSellingPrice = (basePrice, negCost, neg) => {
    const effective = neg && negCost ? Number(negCost) : Number(basePrice);
    return Math.round(effective * (1 + DEFAULT_MARGIN_PCT / 100));
  };

  const addLineItem = () => {
    if (!selectedItem) return;
    const basePrice = Number(selectedItem.base_price || selectedItem.price || 0);
    const effectiveCost = negotiatedEnabled && negotiatedCost ? Number(negotiatedCost) : basePrice;
    const sellingPrice = calcSellingPrice(basePrice, negotiatedCost, negotiatedEnabled);
    const qty = Math.max(1, Number(quantity) || 1);

    const item = {
      type: addingType,
      name: selectedItem.name,
      product_id: selectedItem.id || null,
      service_slug: selectedItem.slug || null,
      description: addingType === "service" ? serviceDesc : (selectedItem.description || ""),
      quantity: qty,
      base_price: basePrice,
      negotiated_cost: negotiatedEnabled ? Number(negotiatedCost) : null,
      effective_cost: effectiveCost,
      unit_price: sellingPrice,
      total: sellingPrice * qty,
    };

    setLineItems((prev) => [...prev, item]);
    resetItemForm();
    toast.success(`Added: ${item.name}`);
  };

  const removeLineItem = (idx) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const resetItemForm = () => {
    setAddingType(null);
    setSelectedItem(null);
    setQuantity(1);
    setNegotiatedEnabled(false);
    setNegotiatedCost("");
    setServiceDesc("");
    setProductQuery("");
    setProductResults([]);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = 0;
  const total = subtotal + tax;

  const handleCreateQuote = async () => {
    if (lineItems.length === 0) return toast.error("Add at least one item");
    setSubmitting(true);
    try {
      const token = getToken();
      const leadId = lead.id || lead._id;
      const payload = {
        line_items: lineItems.map((item) => ({
          type: item.type,
          name: item.name,
          description: item.description,
          product_id: item.product_id,
          service_slug: item.service_slug,
          quantity: item.quantity,
          base_price: item.base_price,
          negotiated_cost: item.negotiated_cost,
          effective_cost: item.effective_cost,
          unit_price: item.unit_price,
          total: item.total,
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        currency: "TZS",
        source_lead_id: leadId,
        created_from_crm: true,
      };

      const res = await fetch(`${API_URL}/api/admin/crm-relationships/leads/${leadId}/create-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create quote");
      const data = await res.json();
      toast.success(`Quote ${data.quote_number} created`);
      if (onCreated) onCreated(data);
    } catch (err) {
      toast.error(err.message || "Failed to create quote");
    } finally { setSubmitting(false); }
  };

  // Services list from static data
  const servicesList = comprehensiveServicesList || [];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex" data-testid="quote-builder-drawer">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto w-full max-w-lg bg-white h-full overflow-y-auto relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg text-[#20364D]">Create Quote</h2>
            <p className="text-xs text-slate-500">for {lead?.company_name || lead?.contact_name || "Lead"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" data-testid="quote-builder-close"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Line Items */}
          {lineItems.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items ({lineItems.length})</p>
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border p-3 flex items-start justify-between" data-testid={`line-item-${idx}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.type === "product" ? <Package className="w-3.5 h-3.5 text-blue-500" /> : <Wrench className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="text-sm font-semibold text-[#20364D]">{item.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.quantity} x TZS {item.unit_price.toLocaleString()} = <span className="font-semibold text-[#20364D]">TZS {item.total.toLocaleString()}</span>
                      </div>
                      {item.negotiated_cost && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">Negotiated</span>
                      )}
                    </div>
                    <button onClick={() => removeLineItem(idx)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`remove-item-${idx}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Item Section */}
          {!addingType ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-5">
              <p className="text-sm font-semibold text-[#20364D] mb-3">Add Item</p>
              {lockedType && (
                <p className="text-xs text-slate-400 mb-2">
                  Locked to <span className="font-semibold capitalize">{lockedType}s</span> — all items must be the same type.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAddingType("product")}
                  disabled={lockedType === "service"}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    lockedType === "service"
                      ? "border-slate-100 opacity-40 cursor-not-allowed bg-slate-50"
                      : "border-slate-200 hover:border-[#20364D] hover:bg-[#20364D]/5"
                  }`}
                  data-testid="add-product-btn"
                >
                  <Package className="w-5 h-5 text-blue-500 mb-2" />
                  <p className="text-sm font-semibold text-[#20364D]">Product</p>
                  <p className="text-xs text-slate-500">From catalog</p>
                </button>
                <button
                  onClick={() => setAddingType("service")}
                  disabled={lockedType === "product"}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    lockedType === "product"
                      ? "border-slate-100 opacity-40 cursor-not-allowed bg-slate-50"
                      : "border-slate-200 hover:border-[#20364D] hover:bg-[#20364D]/5"
                  }`}
                  data-testid="add-service-btn"
                >
                  <Wrench className="w-5 h-5 text-amber-500 mb-2" />
                  <p className="text-sm font-semibold text-[#20364D]">Service</p>
                  <p className="text-xs text-slate-500">Custom pricing</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-[#20364D]/20 p-4 space-y-4" data-testid="item-form">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {addingType === "product" ? <Package className="w-4 h-4 text-blue-500" /> : <Wrench className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-bold text-[#20364D]">{addingType === "product" ? "Add Product" : "Add Service"}</span>
                </div>
                <button onClick={resetItemForm} className="text-xs text-slate-400 hover:text-red-500">Cancel</button>
              </div>

              {/* PRODUCT FLOW */}
              {addingType === "product" && (
                <>
                  {!selectedItem ? (
                    <div>
                      <label className={LABEL}>Search Product Catalog</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={productQuery}
                          onChange={(e) => setProductQuery(e.target.value)}
                          placeholder="Search products..."
                          className={`${INPUT} pl-9`}
                          autoFocus
                          data-testid="product-search-input"
                        />
                        {productSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                      </div>
                      {productResults.length > 0 && (
                        <div className="border rounded-xl mt-2 max-h-48 overflow-y-auto">
                          {productResults.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedItem(p); setProductQuery(""); setProductResults([]); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                              data-testid={`product-option-${p.id}`}
                            >
                              <div>
                                <p className="text-sm font-medium text-[#20364D]">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.category}</p>
                              </div>
                              <span className="text-sm font-semibold text-[#D4A843]">TZS {Number(p.base_price || 0).toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {productQuery.length >= 2 && productResults.length === 0 && !productSearching && (
                        <p className="text-xs text-slate-400 mt-2 text-center">No products found. Products must exist in the catalog.</p>
                      )}
                    </div>
                  ) : (
                    <SelectedItemConfig
                      item={selectedItem}
                      type="product"
                      quantity={quantity}
                      setQuantity={setQuantity}
                      negotiatedEnabled={negotiatedEnabled}
                      setNegotiatedEnabled={setNegotiatedEnabled}
                      negotiatedCost={negotiatedCost}
                      setNegotiatedCost={setNegotiatedCost}
                      calcSellingPrice={calcSellingPrice}
                      onClear={() => setSelectedItem(null)}
                      onAdd={addLineItem}
                    />
                  )}
                </>
              )}

              {/* SERVICE FLOW */}
              {addingType === "service" && (
                <>
                  {!selectedItem ? (
                    <div>
                      <label className={LABEL}>Select Service Type</label>
                      <div className="border rounded-xl max-h-56 overflow-y-auto">
                        {servicesList.map((s) => (
                          <button
                            key={s.slug}
                            onClick={() => setSelectedItem({ id: s.slug, slug: s.slug, name: s.name, base_price: 0, category: s.group, description: s.description })}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b last:border-b-0"
                            data-testid={`service-option-${s.slug}`}
                          >
                            <p className="text-sm font-medium text-[#20364D]">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.group}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className={LABEL}>Service Description</label>
                        <textarea
                          value={serviceDesc}
                          onChange={(e) => setServiceDesc(e.target.value)}
                          className={`${INPUT} min-h-[60px] resize-none`}
                          placeholder="Describe the scope of work..."
                          data-testid="service-description"
                        />
                      </div>
                      <SelectedItemConfig
                        item={selectedItem}
                        type="service"
                        quantity={quantity}
                        setQuantity={setQuantity}
                        negotiatedEnabled={negotiatedEnabled}
                        setNegotiatedEnabled={setNegotiatedEnabled}
                        negotiatedCost={negotiatedCost}
                        setNegotiatedCost={setNegotiatedCost}
                        calcSellingPrice={calcSellingPrice}
                        onClear={() => setSelectedItem(null)}
                        onAdd={addLineItem}
                        showBaseInput
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer: Quote Summary + Create */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Items</span>
            <span className="font-medium">{lineItems.length}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold text-[#20364D]">
            <span>Total</span>
            <span>TZS {total.toLocaleString()}</span>
          </div>
          <button
            onClick={handleCreateQuote}
            disabled={lineItems.length === 0 || submitting}
            className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-40 flex items-center justify-center gap-2"
            data-testid="create-quote-submit"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><CheckCircle2 className="w-4 h-4" />Create Quote</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SelectedItemConfig({
  item, type, quantity, setQuantity, negotiatedEnabled, setNegotiatedEnabled,
  negotiatedCost, setNegotiatedCost, calcSellingPrice, onClear, onAdd, showBaseInput,
}) {
  const [baseOverride, setBaseOverride] = useState(item.base_price || 0);
  const basePrice = showBaseInput ? Number(baseOverride) || 0 : Number(item.base_price || 0);
  const selling = calcSellingPrice(basePrice, negotiatedCost, negotiatedEnabled);
  const qty = Math.max(1, Number(quantity) || 1);
  const lineTotal = selling * qty;

  // Sync base_price on item for services where we allow override
  useEffect(() => {
    if (showBaseInput) item.base_price = baseOverride;
  }, [baseOverride, item, showBaseInput]);

  return (
    <div className="space-y-3">
      {/* Selected item header */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
        <div>
          <p className="text-sm font-semibold text-[#20364D]">{item.name}</p>
          {item.category && <p className="text-xs text-slate-400">{item.category}</p>}
        </div>
        <button onClick={onClear} className="text-xs text-slate-400 hover:text-red-500">Change</button>
      </div>

      {/* Base price (for services — editable) */}
      {showBaseInput && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Vendor Base Price (TZS)</label>
          <input
            type="number"
            value={baseOverride}
            onChange={(e) => setBaseOverride(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
            placeholder="Enter vendor base price"
            data-testid="service-base-price"
          />
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          data-testid="item-quantity"
        />
      </div>

      {/* Negotiated cost toggle */}
      <div>
        <button
          type="button"
          onClick={() => setNegotiatedEnabled(!negotiatedEnabled)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#20364D]"
          data-testid="negotiated-toggle"
        >
          {negotiatedEnabled ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
          <span className="font-medium">Negotiated better price?</span>
        </button>
        {negotiatedEnabled && (
          <input
            type="number"
            value={negotiatedCost}
            onChange={(e) => setNegotiatedCost(e.target.value)}
            className="mt-2 w-full border border-emerald-300 rounded-xl px-3 py-2.5 text-sm bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Negotiated vendor cost (TZS)"
            data-testid="negotiated-cost-input"
          />
        )}
      </div>

      {/* Price calculation display */}
      <div className="rounded-xl bg-[#20364D]/5 p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Base price</span>
          <span className="text-slate-600">TZS {basePrice.toLocaleString()}</span>
        </div>
        {negotiatedEnabled && negotiatedCost && (
          <div className="flex justify-between">
            <span className="text-emerald-600">Negotiated cost</span>
            <span className="font-medium text-emerald-700">TZS {Number(negotiatedCost).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Selling price ({`+${30}%`})</span>
          <span className="font-semibold text-[#20364D]">TZS {selling.toLocaleString()}</span>
        </div>
        <div className="border-t pt-1.5 flex justify-between font-bold text-[#20364D]">
          <span>Line total ({qty} x {selling.toLocaleString()})</span>
          <span>TZS {lineTotal.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={onAdd}
        disabled={basePrice <= 0}
        className="w-full rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#17283c] transition flex items-center justify-center gap-2 disabled:opacity-40"
        data-testid="add-item-confirm"
      >
        <Plus className="w-4 h-4" />Add to Quote
      </button>
    </div>
  );
}
