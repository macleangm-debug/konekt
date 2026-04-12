import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, CreditCard, User } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
];

export default function WalkInSalePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    customer_phone: "",
    client_type: "individual",
    business_name: "",
    vrn: "",
    brn: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "cash",
    amount_received: "",
    payment_reference: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);

  // Load products
  useEffect(() => {
    api.get("/api/admin/catalog/products")
      .then((r) => setProducts(r.data || []))
      .catch(() => {});
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const hay = `${p.name || ""} ${p.sku || ""} ${p.title || ""}`.toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === (product.id || product.sku));
      if (existing) {
        return prev.map((c) =>
          c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        id: product.id || product.sku || Math.random().toString(),
        name: product.name || product.title || "Item",
        sku: product.sku || "",
        unit_price: product.selling_price || product.price || product.unit_price || 0,
        quantity: 1,
      }];
    });
  }, []);

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((c) => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
    );
  };

  const removeItem = (id) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unit_price, 0);
  const total = subtotal;
  const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;
  const change = Number(paymentForm.amount_received || 0) - total;

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    if (customerForm.client_type === "business") {
      if (!customerForm.business_name || !customerForm.vrn || !customerForm.brn) {
        toast.error("Business clients require Business Name, VRN, and BRN");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/admin/walk-in-sale", {
        items: cart.map((c) => ({
          name: c.name,
          description: c.name,
          sku: c.sku,
          quantity: c.quantity,
          unit_price: c.unit_price,
        })),
        customer_name: customerForm.customer_name || "Walk-in Customer",
        customer_phone: customerForm.customer_phone,
        client_type: customerForm.client_type,
        business_name: customerForm.business_name,
        vrn: customerForm.vrn,
        brn: customerForm.brn,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference,
        notes: "Walk-in purchase",
      });
      setCompleted(res.data);
      toast.success("Sale completed!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete sale");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (completed) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center" data-testid="walkin-success">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#20364D] mb-2">Sale Complete</h1>
        <div className="bg-white rounded-2xl border p-6 space-y-3 text-left mt-4">
          <div className="flex justify-between text-sm"><span className="text-slate-500">Order</span><span className="font-bold">{completed.order_number}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Invoice</span><span className="font-bold">{completed.invoice_number}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-bold text-green-600">{fmt(completed.total)}</span></div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => { setCompleted(null); setCart([]); setCustomerForm({ customer_name: "", customer_phone: "", client_type: "individual", business_name: "", vrn: "", brn: "" }); setPaymentForm({ payment_method: "cash", amount_received: "", payment_reference: "" }); }}
            className="flex-1 bg-[#20364D]" data-testid="new-sale-btn">
            New Sale
          </Button>
          <Button onClick={() => navigate("/admin/invoices")} variant="outline" className="flex-1" data-testid="view-invoices-btn">
            View Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="walkin-sale-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#20364D]">Walk-in Sale</h1>
            <p className="text-sm text-slate-500">Quick in-shop transaction</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/orders")} data-testid="back-to-orders">Back to Orders</Button>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* ═══ LEFT: Search + Cart (7/12) ═══ */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search products by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="product-search" />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="bg-white rounded-xl border max-h-48 overflow-y-auto" data-testid="product-results">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No products found</div>
                ) : (
                  filteredProducts.slice(0, 12).map((p) => (
                    <button key={p.id || p.sku} onClick={() => { addToCart(p); setSearchQuery(""); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b last:border-b-0 text-left" data-testid={`product-${p.id || p.sku}`}>
                      <div>
                        <div className="text-sm font-medium text-[#20364D]">{p.name || p.title}</div>
                        <div className="text-xs text-slate-400">{p.sku || ""}</div>
                      </div>
                      <div className="text-sm font-bold text-[#D4A843]">{fmt(p.selling_price || p.price || p.unit_price)}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Cart */}
            <div className="bg-white rounded-2xl border min-h-[280px]" data-testid="cart-section">
              <div className="px-5 py-3 border-b flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#20364D]" />
                <span className="font-bold text-sm text-[#20364D]">Cart</span>
                <span className="text-xs text-slate-400">({cart.length} items)</span>
              </div>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                  <span className="text-sm">Search and add products to begin</span>
                </div>
              ) : (
                <div>
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-5 py-2.5 border-b last:border-b-0">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="text-sm font-medium text-[#20364D] truncate">{item.name}</div>
                        <div className="text-xs text-slate-400">{fmt(item.unit_price)} each</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-slate-50" data-testid={`qty-minus-${item.id}`}><Minus className="w-3 h-3" /></button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-slate-50" data-testid={`qty-plus-${item.id}`}><Plus className="w-3 h-3" /></button>
                        <div className="w-20 text-right text-sm font-bold text-[#20364D] ml-2">{fmt(item.quantity * item.unit_price)}</div>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 ml-1" data-testid={`remove-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="px-5 py-3 bg-slate-50 flex justify-between items-center rounded-b-2xl">
                    <span className="font-bold text-sm text-[#20364D]">Subtotal</span>
                    <span className="text-lg font-extrabold text-[#20364D]">{fmt(subtotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT: Customer + Payment + Summary (5/12) ═══ */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {/* Customer */}
            <div className="bg-white rounded-2xl border p-4 space-y-3" data-testid="customer-section">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-[#20364D]" /><span className="font-bold text-sm text-[#20364D]">Customer</span></div>
              <div className="flex gap-1.5">
                {["individual", "business"].map((t) => (
                  <button key={t} onClick={() => setCustomerForm((p) => ({ ...p, client_type: t }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${customerForm.client_type === t ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600"}`}
                    data-testid={`client-type-${t}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div><Label className="text-[11px]">Name</Label><Input value={customerForm.customer_name} onChange={(e) => setCustomerForm((p) => ({ ...p, customer_name: e.target.value }))} placeholder="Customer name" className="h-9 text-sm" data-testid="input-customer-name" /></div>
              <div><Label className="text-[11px]">Phone</Label><Input value={customerForm.customer_phone} onChange={(e) => setCustomerForm((p) => ({ ...p, customer_phone: e.target.value }))} placeholder="+255..." className="h-9 text-sm" data-testid="input-customer-phone" /></div>
              {customerForm.client_type === "business" && (
                <>
                  <div><Label className="text-[11px]">Business Name *</Label><Input value={customerForm.business_name} onChange={(e) => setCustomerForm((p) => ({ ...p, business_name: e.target.value }))} className="h-9 text-sm" data-testid="input-business-name" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[11px]">VRN *</Label><Input value={customerForm.vrn} onChange={(e) => setCustomerForm((p) => ({ ...p, vrn: e.target.value }))} className="h-9 text-sm" data-testid="input-vrn" /></div>
                    <div><Label className="text-[11px]">BRN *</Label><Input value={customerForm.brn} onChange={(e) => setCustomerForm((p) => ({ ...p, brn: e.target.value }))} className="h-9 text-sm" data-testid="input-brn" /></div>
                  </div>
                </>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border p-4 space-y-3" data-testid="payment-section">
              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#20364D]" /><span className="font-bold text-sm text-[#20364D]">Payment</span></div>
              <div><Label className="text-[11px]">Method</Label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white h-9" value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))} data-testid="select-payment-method">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[11px]">Received</Label><Input type="number" value={paymentForm.amount_received} onChange={(e) => setPaymentForm((p) => ({ ...p, amount_received: e.target.value }))} placeholder={String(total)} className="h-9 text-sm" data-testid="input-amount-received" /></div>
                <div><Label className="text-[11px]">Reference</Label><Input value={paymentForm.payment_reference} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_reference: e.target.value }))} placeholder="Txn ID" className="h-9 text-sm" data-testid="input-payment-ref" /></div>
              </div>
              {change > 0 && <div className="p-2 bg-green-50 rounded-lg text-xs text-green-700 font-semibold">Change: {fmt(change)}</div>}
            </div>

            {/* Summary + Action */}
            <div className="bg-[#20364D] rounded-2xl p-4 text-white space-y-2" data-testid="summary-section">
              <div className="flex justify-between text-sm"><span className="text-white/60">Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-base font-extrabold border-t border-white/20 pt-2"><span>Total</span><span>{fmt(total)}</span></div>
              <Button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-2.5 text-sm mt-1" data-testid="complete-sale-btn">
                {submitting ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
