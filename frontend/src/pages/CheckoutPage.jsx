import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { ShieldCheck, Truck, CreditCard } from "lucide-react";
import api from "../lib/api";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    delivery_address: "",
    city: "",
    country: "Tanzania",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const deliveryFee = 0;
  const grandTotal = total + deliveryFee;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.full_name || !form.email || !form.phone) {
      setError("Please fill in all required fields");
      return;
    }

    if (!items.length) {
      setError("Your cart is empty");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer_name: form.full_name,
        customer_email: form.email,
        customer_phone: form.phone,
        customer_company: form.company_name,
        delivery_address: form.delivery_address,
        city: form.city,
        country: form.country,
        notes: form.notes,
        line_items: items.map((item) => ({
          description: item.title || item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.subtotal || item.quantity * item.unit_price,
          customization_summary: item.customization_summary || 
            (item.customization ? `${item.color || ''} ${item.size || ''} ${item.print_method || ''}`.trim() : ''),
        })),
        subtotal: total,
        tax: 0,
        discount: 0,
        total: grandTotal,
        status: "pending",
      };

      const res = await api.post("/api/guest/orders", payload);
      clearCart();
      navigate(`/order-confirmation/${res.data.order_number || res.data.id || "success"}`);
    } catch (error) {
      console.error("Checkout failed", error);
      setError("Failed to submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if cart is empty
  if (!items.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Your cart is empty</h1>
          <p className="text-slate-500 mt-2">Add products before checking out</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Checkout</h1>
          <p className="mt-2 text-slate-600">
            Confirm your order details and submit your request.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_420px] gap-8">
          <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#2D3E50]" />
                Customer Details
              </h2>
              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Full name *"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  required
                  data-testid="checkout-fullname"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Email address *"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  data-testid="checkout-email"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Phone number *"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  data-testid="checkout-phone"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Company name (optional)"
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  data-testid="checkout-company"
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Truck className="w-6 h-6 text-[#2D3E50]" />
                Delivery Details
              </h2>
              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <input
                  className="border rounded-xl px-4 py-3 md:col-span-2"
                  placeholder="Delivery address"
                  value={form.delivery_address}
                  onChange={(e) => updateField("delivery_address", e.target.value)}
                  data-testid="checkout-address"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  data-testid="checkout-city"
                />
                <input
                  className="border rounded-xl px-4 py-3"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  data-testid="checkout-country"
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-[#2D3E50]" />
                Order Notes
              </h2>
              <textarea
                className="border rounded-xl px-4 py-3 w-full min-h-[140px] mt-5"
                placeholder="Any special instructions, branding notes, or delivery details"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                data-testid="checkout-notes"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#2D3E50] text-white py-4 font-semibold text-lg disabled:opacity-50 transition"
              data-testid="checkout-submit"
            >
              {submitting ? "Submitting Order..." : "Submit Order"}
            </button>
          </form>

          <aside className="rounded-3xl border bg-white p-8 h-fit sticky top-24">
            <h2 className="text-2xl font-bold">Order Summary</h2>

            <div className="space-y-4 mt-6">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="font-semibold">{item.title || item.name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Qty: {item.quantity}
                    {item.color && ` • ${item.color}`}
                    {item.size && ` • ${item.size}`}
                  </div>
                  {item.print_method && (
                    <div className="text-sm text-slate-500">
                      {item.print_method}
                    </div>
                  )}
                  <div className="text-sm font-medium mt-2">
                    TZS {(item.subtotal || item.quantity * item.unit_price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>TZS {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery</span>
                <span>{deliveryFee === 0 ? "Calculated later" : `TZS ${deliveryFee.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total</span>
                <span>TZS {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <ShieldCheck className="w-5 h-5" />
                Secure Checkout
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                Your order details are protected and secure.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
