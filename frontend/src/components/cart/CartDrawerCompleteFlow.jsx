import React, { useEffect, useState } from "react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function CartDrawerCompleteFlow() {
  const { user } = useAuth();
  const customerId = user?.id || "guest";
  const { open, items, closeCart, setOpen, setItems } = useCartDrawer();
  const [step, setStep] = useState("cart");
  const [form, setForm] = useState({
    client_name: "", client_phone: "", client_email: "",
    recipient_name: "", recipient_phone: "", address_line: "", city: "", region: "",
    invoice_client_name: "", invoice_client_phone: "", invoice_client_email: "", invoice_client_tin: "",
  });

  useEffect(() => {
    if (!open) return;
    api.get(`/api/customer-account/prefill?customer_id=${customerId}`).then((res) => {
      const p = res.data || {};
      setForm({
        client_name: p.contact_name || "", client_phone: p.phone || "", client_email: p.email || "",
        recipient_name: p.delivery_recipient_name || "", recipient_phone: p.delivery_phone || "",
        address_line: p.delivery_address_line || "", city: p.delivery_city || "", region: p.delivery_region || "",
        invoice_client_name: p.invoice_client_name || p.business_name || p.contact_name || "",
        invoice_client_phone: p.invoice_client_phone || p.phone || "",
        invoice_client_email: p.invoice_client_email || p.email || "",
        invoice_client_tin: p.invoice_client_tin || p.tin || "",
      });
    });
  }, [open, customerId]);

  if (!open) return null;

  const updateQty = (index, qty) => {
    const finalQty = Math.max(1, Number(qty || 1));
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, quantity: finalQty } : item));
  };

  const subtotal = (items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const vat = subtotal * 0.18;
  const total = subtotal + vat;

  const payNow = async () => {
    const res = await api.post("/api/customer-payment/checkout-fixed-price", {
      customer_id: customerId,
      items,
      vat_percent: 18,
      payment_method: "manual",
      billing: {
        invoice_client_name: form.invoice_client_name,
        invoice_client_phone: form.invoice_client_phone,
        invoice_client_email: form.invoice_client_email,
        invoice_client_tin: form.invoice_client_tin,
      },
      delivery: {
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        address_line: form.address_line,
        city: form.city,
        region: form.region,
      },
    });
    alert(`Payment flow completed. Order ${res.data?.order?.order_number || ""} created.`);
    closeCart();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/40" onClick={closeCart} aria-label="Close cart overlay" />
      <div className="relative w-full max-w-[480px] h-full bg-white shadow-2xl p-6 flex flex-col overflow-y-auto" data-testid="cart-drawer-panel">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#20364D]">{step === "cart" ? "Your Cart" : "Complete Order"}</div>
            <div className="text-sm text-slate-500 mt-1">{step === "cart" ? "You can continue browsing while this cart stays ready." : "This flow goes all the way to payment, order, and invoice creation."}</div>
          </div>
          <button onClick={() => setOpen(false)} data-testid="cart-continue-browsing-btn" className="rounded-xl border px-3 py-2 text-sm font-semibold text-[#20364D]">Continue Browsing</button>
        </div>

        {step === "cart" ? (
          <>
            <div className="space-y-4 mt-6">
              {(items || []).map((item, idx) => {
                const qty = Number(item.quantity || 1);
                const line = Number(item.price || 0) * qty;
                return (
                  <div key={idx} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-[#20364D]">{item.name}</div>
                        <div className="text-sm text-slate-500 mt-1">{item.group_name || item.category || ""}</div>
                        <div className="text-sm font-semibold text-[#20364D] mt-2">{money(item.price || 0)} each</div>
                      </div>
                      <button onClick={() => setItems((prev) => prev.filter((_, i) => i != idx))} className="text-sm text-red-600 font-semibold">Remove</button>
                    </div>

                    <div className="flex items-center justify-between mt-4 gap-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(idx, qty - 1)} className="w-9 h-9 rounded-lg border font-bold text-[#20364D]">-</button>
                        <input value={qty} onChange={(e) => updateQty(idx, e.target.value)} className="w-16 border rounded-lg px-2 py-2 text-center font-semibold text-[#20364D]" />
                        <button onClick={() => updateQty(idx, qty + 1)} className="w-9 h-9 rounded-lg border font-bold text-[#20364D]">+</button>
                      </div>
                      <div className="font-bold text-[#20364D]">{money(line)}</div>
                    </div>
                  </div>
                );
              })}
              {!items?.length ? <div className="text-slate-500">Your cart is empty.</div> : null}
            </div>

            <div className="border-t pt-5 mt-6 space-y-2">
              <div className="flex items-center justify-between"><div className="text-slate-500">Subtotal</div><div className="font-semibold text-[#20364D]">{money(subtotal)}</div></div>
              <div className="flex items-center justify-between"><div className="text-slate-500">VAT (18%)</div><div className="font-semibold text-[#20364D]">{money(vat)}</div></div>
              <div className="flex items-center justify-between text-lg"><div className="font-bold text-[#20364D]">Total</div><div className="font-bold text-[#20364D]">{money(total)}</div></div>
              <button onClick={() => setStep("checkout")} data-testid="cart-proceed-to-payment-btn" className="w-full mt-4 rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">Proceed to Payment</button>
            </div>
          </>
        ) : (
          <div className="space-y-5 mt-6">
            <div className="rounded-2xl border p-4">
              <div className="text-lg font-bold text-[#20364D]">Contact Details</div>
              <div className="grid gap-3 mt-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Contact Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Phone Number" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Email Address" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-lg font-bold text-[#20364D]">Delivery Details</div>
              <div className="text-xs text-slate-500 mt-1">Prefilled from My Account when available.</div>
              <div className="grid gap-3 mt-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Recipient Name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Recipient Phone" value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Address Line" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-xl px-4 py-3" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <input className="border rounded-xl px-4 py-3" placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-lg font-bold text-[#20364D]">Invoice Client Details</div>
              <div className="grid gap-3 mt-4">
                <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Name" value={form.invoice_client_name} onChange={(e) => setForm({ ...form, invoice_client_name: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Phone" value={form.invoice_client_phone} onChange={(e) => setForm({ ...form, invoice_client_phone: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Email" value={form.invoice_client_email} onChange={(e) => setForm({ ...form, invoice_client_email: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client TIN" value={form.invoice_client_tin} onChange={(e) => setForm({ ...form, invoice_client_tin: e.target.value })} />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between"><div className="text-slate-500">Subtotal</div><div className="font-semibold text-[#20364D]">{money(subtotal)}</div></div>
              <div className="flex items-center justify-between"><div className="text-slate-500">VAT (18%)</div><div className="font-semibold text-[#20364D]">{money(vat)}</div></div>
              <div className="flex items-center justify-between text-lg"><div className="font-bold text-[#20364D]">Grand Total</div><div className="font-bold text-[#20364D]">{money(total)}</div></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep("cart")} data-testid="cart-back-btn" className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Back</button>
              <button onClick={payNow} data-testid="cart-complete-payment-btn" className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">Complete Payment</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
