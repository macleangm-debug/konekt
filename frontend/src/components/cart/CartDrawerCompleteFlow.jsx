import React, { useEffect, useState, useCallback } from "react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { X, Minus, Plus, ChevronRight, ChevronLeft, Upload, Check, Copy } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const BANK_DETAILS = {
  bank: "CRDB Bank PLC",
  account_name: "Konekt Ltd",
  account_number: "0150 2930 0000",
  branch: "Dar es Salaam Main",
  swift: "CORUTZTZ",
};

export default function CartDrawerCompleteFlow() {
  const { user } = useAuth();
  const customerId = user?.id || "guest";
  const { open, items, closeCart, setOpen, setItems } = useCartDrawer();
  const [step, setStep] = useState("cart");
  const [prefixes, setPrefixes] = useState(["+255"]);
  const [sameAsContact, setSameAsContact] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState("");

  const [form, setForm] = useState({
    client_name: "", client_phone_prefix: "+255", client_phone: "", client_email: "",
    recipient_name: "", recipient_phone_prefix: "+255", recipient_phone: "",
    address_line: "", city: "", region: "",
    invoice_client_name: "", invoice_client_phone_prefix: "+255",
    invoice_client_phone: "", invoice_client_email: "", invoice_client_tin: "",
  });
  const [proof, setProof] = useState({ payer_name: "", reference_number: "", amount_paid: "" });

  const loadPrefill = useCallback(async () => {
    if (!open) return;
    try {
      const res = await api.get(`/api/customer-account/prefill?customer_id=${customerId}`);
      const p = res.data || {};
      setPrefixes(p.phone_prefix_options || ["+255"]);
      const defaultAddr = (p.delivery_addresses || []).find((a) => a.is_default) || (p.delivery_addresses || [])[0] || {};
      setForm({
        client_name: p.contact_name || "", client_phone_prefix: p.phone_prefix || "+255",
        client_phone: p.phone || "", client_email: p.email || "",
        recipient_name: defaultAddr.recipient_name || "",
        recipient_phone_prefix: defaultAddr.phone_prefix || "+255",
        recipient_phone: defaultAddr.phone || "",
        address_line: defaultAddr.address_line || "", city: defaultAddr.city || "", region: defaultAddr.region || "",
        invoice_client_name: p.quote_client_name || p.business_name || p.contact_name || "",
        invoice_client_phone_prefix: p.quote_client_phone_prefix || "+255",
        invoice_client_phone: p.quote_client_phone || p.phone || "",
        invoice_client_email: p.quote_client_email || p.email || "",
        invoice_client_tin: p.quote_client_tin || p.tin || "",
      });
    } catch {}
  }, [open, customerId]);

  useEffect(() => { loadPrefill(); }, [loadPrefill]);

  useEffect(() => {
    if (!open) { setStep("cart"); setOrderResult(null); setProofSubmitted(false); }
  }, [open]);

  useEffect(() => {
    if (sameAsContact) {
      setForm((prev) => ({
        ...prev,
        recipient_name: prev.client_name,
        recipient_phone_prefix: prev.client_phone_prefix,
        recipient_phone: prev.client_phone,
      }));
    }
  }, [sameAsContact]);

  // Dispatch event to hide AI assistant when cart is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("konekt-cart-state", { detail: { open } }));
  }, [open]);

  if (!open) return null;

  const updateQty = (index, qty) => {
    const finalQty = Math.max(1, Number(qty || 1));
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, quantity: finalQty } : item));
  };

  const subtotal = (items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const vat = subtotal * 0.18;
  const total = subtotal + vat;

  const saveProfileIfMissing = async () => {
    try {
      const res = await api.get(`/api/customer-account/prefill?customer_id=${customerId}`);
      const existing = res.data || {};
      const updates = {};
      if (!existing.contact_name && form.client_name) updates.contact_name = form.client_name;
      if (!existing.phone && form.client_phone) updates.phone = form.client_phone;
      if (!existing.email && form.client_email) updates.email = form.client_email;
      if (!existing.phone_prefix && form.client_phone_prefix) updates.phone_prefix = form.client_phone_prefix;
      if (!existing.quote_client_name && form.invoice_client_name) updates.quote_client_name = form.invoice_client_name;
      if (!existing.quote_client_phone && form.invoice_client_phone) updates.quote_client_phone = form.invoice_client_phone;
      if (!existing.quote_client_email && form.invoice_client_email) updates.quote_client_email = form.invoice_client_email;
      if (!existing.quote_client_tin && form.invoice_client_tin) updates.quote_client_tin = form.invoice_client_tin;
      const addrs = existing.delivery_addresses || [];
      if (addrs.length === 0 && form.address_line) {
        updates.delivery_addresses = [{
          id: crypto.randomUUID(), label: "Default", recipient_name: form.recipient_name,
          phone_prefix: form.recipient_phone_prefix, phone: form.recipient_phone,
          address_line: form.address_line, city: form.city, region: form.region, is_default: true,
        }];
      }
      if (Object.keys(updates).length > 0) {
        await api.put("/api/customer-account/profile", { ...existing, ...updates, customer_id: customerId });
      }
    } catch {}
  };

  const checkout = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/api/commercial-flow/create-product-checkout", {
        customer_id: customerId, items,
        vat_percent: 18,
        delivery: {
          recipient_name: form.recipient_name, phone_prefix: form.recipient_phone_prefix,
          phone: form.recipient_phone, address_line: form.address_line,
          city: form.city, region: form.region,
        },
        quote_details: {
          client_name: form.invoice_client_name, client_phone: form.invoice_client_phone,
          client_email: form.invoice_client_email, client_tin: form.invoice_client_tin,
        },
      });
      setOrderResult(res.data);
      setProof((p) => ({ ...p, amount_paid: total.toString() }));
      setStep("payment");
      await saveProfileIfMissing();
    } catch (err) {
      alert("Checkout failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  const submitProof = async () => {
    if (!orderResult?.invoice?.id) return;
    setSubmitting(true);
    try {
      await api.post("/api/commercial-flow/payment-proof", {
        invoice_id: orderResult.invoice.id,
        customer_id: customerId,
        payer_name: proof.payer_name,
        reference_number: proof.reference_number,
        amount_paid: Number(proof.amount_paid || total),
      });
      setProofSubmitted(true);
      setStep("done");
    } catch (err) {
      alert("Proof upload failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  const finishAndClose = () => {
    setItems([]);
    closeCart();
  };

  const PrefixSelect = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="border border-slate-200 rounded-xl px-2 py-3 bg-white text-[#20364D] font-medium w-[85px] shrink-0 text-sm">
      {prefixes.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/40" onClick={closeCart} aria-label="Close cart overlay" />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden" data-testid="cart-drawer-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#20364D]">
              {step === "cart" ? "Your Cart" : step === "checkout" ? "Complete Order" : step === "payment" ? "Payment" : "Order Confirmed"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === "cart" ? `${(items || []).length} item${(items || []).length !== 1 ? "s" : ""}` :
               step === "checkout" ? "Review details and confirm" :
               step === "payment" ? "Transfer & upload proof" : "Thank you for your order"}
            </p>
          </div>
          <button data-testid="cart-continue-browsing-btn" onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#20364D] hover:bg-slate-50 transition-colors">
            Continue Browsing
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP: CART */}
          {step === "cart" && (
            <div className="space-y-4">
              {(items || []).map((item, idx) => {
                const qty = Number(item.quantity || 1);
                const line = Number(item.price || 0) * qty;
                return (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`cart-item-${idx}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#20364D] truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.group_name || item.category || ""}</p>
                        <p className="text-sm font-semibold text-[#20364D] mt-1">{money(item.price)} each</p>
                      </div>
                      <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-500 font-semibold hover:text-red-700 shrink-0">Remove</button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <button data-testid={`qty-minus-${idx}`} onClick={() => updateQty(idx, qty - 1)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-[#20364D] hover:bg-slate-50">
                          <Minus size={14} />
                        </button>
                        <input data-testid={`qty-input-${idx}`} value={qty} onChange={(e) => updateQty(idx, e.target.value)}
                          className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-semibold text-[#20364D] text-sm" />
                        <button data-testid={`qty-plus-${idx}`} onClick={() => updateQty(idx, qty + 1)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-[#20364D] hover:bg-slate-50">
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-bold text-[#20364D]">{money(line)}</p>
                    </div>
                  </div>
                );
              })}
              {!items?.length && <p className="text-center text-slate-400 py-8">Your cart is empty.</p>}
            </div>
          )}

          {/* STEP: CHECKOUT */}
          {step === "checkout" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-base font-bold text-[#20364D]">Contact Details</h3>
                <input data-testid="checkout-client-name" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Contact Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                <div className="flex gap-2">
                  <PrefixSelect value={form.client_phone_prefix} onChange={(v) => setForm({ ...form, client_phone_prefix: v })} />
                  <input data-testid="checkout-client-phone" className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Phone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
                </div>
                <input data-testid="checkout-client-email" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#20364D]">Delivery Details</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer" data-testid="same-as-contact-toggle">
                    <input type="checkbox" checked={sameAsContact} onChange={(e) => setSameAsContact(e.target.checked)}
                      className="rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]" />
                    Same as contact
                  </label>
                </div>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Recipient Name" value={form.recipient_name}
                  onChange={(e) => { setSameAsContact(false); setForm({ ...form, recipient_name: e.target.value }); }} />
                <div className="flex gap-2">
                  <PrefixSelect value={form.recipient_phone_prefix} onChange={(v) => { setSameAsContact(false); setForm({ ...form, recipient_phone_prefix: v }); }} />
                  <input className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Phone" value={form.recipient_phone}
                    onChange={(e) => { setSameAsContact(false); setForm({ ...form, recipient_phone: e.target.value }); }} />
                </div>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Address Line" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-base font-bold text-[#20364D]">Invoice Client Details</h3>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Client Name" value={form.invoice_client_name} onChange={(e) => setForm({ ...form, invoice_client_name: e.target.value })} />
                <div className="flex gap-2">
                  <PrefixSelect value={form.invoice_client_phone_prefix} onChange={(v) => setForm({ ...form, invoice_client_phone_prefix: v })} />
                  <input className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Phone" value={form.invoice_client_phone} onChange={(e) => setForm({ ...form, invoice_client_phone: e.target.value })} />
                </div>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Email" value={form.invoice_client_email} onChange={(e) => setForm({ ...form, invoice_client_email: e.target.value })} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="TIN" value={form.invoice_client_tin} onChange={(e) => setForm({ ...form, invoice_client_tin: e.target.value })} />
              </div>
            </div>
          )}

          {/* STEP: PAYMENT */}
          {step === "payment" && orderResult && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                <p className="font-semibold text-green-800">Order {orderResult.order?.order_number} created</p>
                <p className="text-sm text-green-700 mt-1">Invoice {orderResult.invoice?.invoice_number} is ready. Please complete bank transfer below.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3" data-testid="bank-details-section">
                <h3 className="text-base font-bold text-[#20364D]">Bank Transfer Details</h3>
                {Object.entries(BANK_DETAILS).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#20364D]">{val}</span>
                      <button onClick={() => copyToClipboard(val, key)} className="text-slate-400 hover:text-[#20364D] transition-colors">
                        {copied === key ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-sm font-bold text-[#20364D]">Amount Due</span>
                  <span className="text-lg font-bold text-[#20364D]">{money(total)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3" data-testid="proof-upload-section">
                <h3 className="text-base font-bold text-[#20364D]">Upload Payment Proof</h3>
                <p className="text-xs text-slate-500">Once you've transferred, provide proof below for finance review.</p>
                <input data-testid="proof-payer-name" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Payer Name" value={proof.payer_name} onChange={(e) => setProof({ ...proof, payer_name: e.target.value })} />
                <input data-testid="proof-reference" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Transaction Reference Number" value={proof.reference_number} onChange={(e) => setProof({ ...proof, reference_number: e.target.value })} />
                <input data-testid="proof-amount" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Amount Paid" type="number" value={proof.amount_paid} onChange={(e) => setProof({ ...proof, amount_paid: e.target.value })} />
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && (
            <div className="text-center py-10 space-y-4" data-testid="order-confirmation">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#20364D]">Payment Proof Submitted</h3>
              <p className="text-slate-600">Your payment is under review. You will be notified once approved by our finance team.</p>
              {orderResult && (
                <div className="rounded-2xl bg-slate-50 p-4 text-left space-y-1">
                  <p className="text-sm"><span className="text-slate-500">Order:</span> <span className="font-semibold text-[#20364D]">{orderResult.order?.order_number}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Invoice:</span> <span className="font-semibold text-[#20364D]">{orderResult.invoice?.invoice_number}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Total:</span> <span className="font-semibold text-[#20364D]">{money(total)}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Status:</span> <span className="font-semibold text-amber-600">Payment Under Review</span></p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
          {(step === "cart" || step === "checkout") && (
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-[#20364D]">{money(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">VAT (18%)</span><span className="font-semibold text-[#20364D]">{money(vat)}</span></div>
              <div className="flex justify-between text-base border-t border-slate-100 pt-2"><span className="font-bold text-[#20364D]">Total</span><span className="font-bold text-[#20364D]">{money(total)}</span></div>
            </div>
          )}

          {step === "cart" && items?.length > 0 && (
            <button data-testid="cart-proceed-to-payment-btn" onClick={() => setStep("checkout")}
              className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition-colors flex items-center justify-center gap-2">
              Proceed to Checkout <ChevronRight size={16} />
            </button>
          )}

          {step === "checkout" && (
            <div className="grid grid-cols-2 gap-3">
              <button data-testid="cart-back-btn" onClick={() => setStep("cart")}
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                <ChevronLeft size={16} /> Back
              </button>
              <button data-testid="cart-complete-payment-btn" onClick={checkout} disabled={submitting}
                className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-60">
                {submitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          )}

          {step === "payment" && (
            <button data-testid="submit-proof-btn" onClick={submitProof} disabled={submitting || !proof.reference_number}
              className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <Upload size={16} /> {submitting ? "Submitting..." : "Submit Payment Proof"}
            </button>
          )}

          {step === "done" && (
            <button data-testid="close-after-order-btn" onClick={finishAndClose}
              className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">
              Close & Continue Shopping
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
