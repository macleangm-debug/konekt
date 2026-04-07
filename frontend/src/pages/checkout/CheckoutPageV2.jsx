import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import PaymentMethodOption from "../../components/payments/PaymentMethodOption";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CheckoutPageV2() {
  const navigate = useNavigate();
  const { items: cartContextItems, total: cartTotal, clearCart } = useCart();
  const [cartItems, setCartItems] = useState([]);
  const [requestedPointsAmount, setRequestedPointsAmount] = useState(0);
  const [validation, setValidation] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("bank_transfer");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer details form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
    delivery_address: "",
    city: "",
    country: "Tanzania",
    notes: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try to get payment settings
        try {
          const settingsRes = await api.get("/api/admin/payment-settings");
          setPaymentSettings(settingsRes.data || []);
        } catch (err) {
          console.log("Payment settings not available, using defaults");
        }

        // Use cart context items if available, otherwise check localStorage
        if (cartContextItems && cartContextItems.length > 0) {
          setCartItems(cartContextItems);
        } else {
          const guestCart = JSON.parse(localStorage.getItem("guest_cart_v1") || "[]");
          const mapped = guestCart.map((item) => ({
            ...item,
            qty: Number(item.quantity || item.qty || 1),
            partner_cost: Number(item.partner_cost || 0),
          }));
          setCartItems(mapped);
        }

        // Load user data if logged in
        const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
        if (token) {
          try {
            const userRes = await api.get("/api/auth/me");
            if (userRes.data) {
              setForm(prev => ({
                ...prev,
                full_name: userRes.data.full_name || "",
                email: userRes.data.email || "",
                phone: userRes.data.phone || "",
                company_name: userRes.data.company_name || "",
              }));
            }
          } catch (err) {
            console.log("Failed to load user data");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cartContextItems]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, x) => sum + Number(x.price || x.unit_price || 0) * Number(x.qty || x.quantity || 0), 0) || cartTotal,
    [cartItems, cartTotal]
  );

  const partnerCostTotal = useMemo(
    () => cartItems.reduce((sum, x) => sum + Number(x.partner_cost || 0) * Number(x.qty || x.quantity || 0), 0),
    [cartItems]
  );

  const tzSettings = useMemo(
    () => (paymentSettings || []).find((x) => x.country_code === "TZ") || {
      account_name: "KONEKT LIMITED",
      account_number: "015C8841347002",
      bank_name: "CRDB BANK",
      swift: "CORUTZTZ",
    },
    [paymentSettings]
  );

  const validatePoints = async () => {
    if (subtotal <= 0) return;
    try {
      const res = await api.post("/api/checkout-points/validate", {
        subtotal,
        partner_cost_total: partnerCostTotal,
        requested_points_amount: Number(requestedPointsAmount || 0),
        protected_margin_percent: 40,
        points_cap_percent_of_distributable_margin: 10,
      });
      setValidation(res.data);
    } catch (err) {
      console.log("Points validation not available");
    }
  };

  useEffect(() => {
    if (cartItems.length) validatePoints();
  }, [cartItems, subtotal]);

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!paymentConfirmed) {
      toast.error("Please confirm payment acknowledgment before proceeding");
      return;
    }

    setSubmitting(true);
    try {
      // Create order
      const { phone_prefix, ...orderForm } = form;
      const orderRes = await api.post("/api/orders", {
        ...orderForm,
        phone: combinePhone(phone_prefix, form.phone),
        items: cartItems.map(item => ({
          product_id: item.product_id || item.id,
          sku: item.sku,
          name: item.name || item.title,
          quantity: item.qty || item.quantity,
          unit_price: item.price || item.unit_price,
          partner_cost: item.partner_cost || 0,
        })),
        subtotal,
        total: validation?.checkout?.final_total || subtotal,
        points_used: validation?.checkout?.approved_points_amount || 0,
        payment_method: "bank_transfer",
      });

      toast.success("Order submitted! Proceed to bank transfer.");
      clearCart();
      navigate(`/payment/bank-transfer`, {
        state: {
          payment: orderRes.data,
          bank_details: tzSettings,
        }
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="checkout-loading">
        <div className="w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="space-y-8" data-testid="checkout-empty">
        <PageHeader title="Checkout" subtitle="Your cart is empty" />
        <SurfaceCard className="text-center py-12">
          <p className="text-slate-600 mb-6">Add items to your cart to proceed with checkout.</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            Browse Products
          </button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="checkout-page-v2">
      <PageHeader
        title="Checkout"
        subtitle="Review your order, apply points safely, and continue using bank transfer."
      />

      <form onSubmit={handleSubmit}>
        <div className="grid xl:grid-cols-[1fr_0.95fr] gap-6">
          {/* Left Column - Order & Customer Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <SurfaceCard>
              <div className="text-2xl font-bold text-[#20364D]">Order Summary</div>
              <div className="space-y-4 mt-6">
                {cartItems.map((item, idx) => (
                  <div key={`${item.sku || item.id}-${idx}`} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="font-semibold text-[#20364D]">{item.name || item.title}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.sku}</div>
                    <div className="text-sm mt-3">
                      {item.qty || item.quantity} × TZS {Number(item.price || item.unit_price || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {/* Customer Details */}
            <SurfaceCard>
              <div className="text-2xl font-bold text-[#20364D]">Customer Details</div>
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Full name *"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  data-testid="checkout-fullname"
                />
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  data-testid="checkout-email"
                />
                <PhoneNumberField
                  label=""
                  prefix={form.phone_prefix}
                  number={form.phone}
                  onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
                  onNumberChange={(v) => setForm({ ...form, phone: v })}
                  required
                  testIdPrefix="checkout-phone"
                />
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Company name (optional)"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  data-testid="checkout-company"
                />
                <input
                  className="border rounded-xl px-4 py-3 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Delivery address"
                  value={form.delivery_address}
                  onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                  data-testid="checkout-address"
                />
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  data-testid="checkout-city"
                />
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  data-testid="checkout-country"
                />
              </div>
              <textarea
                className="w-full border rounded-xl px-4 py-3 mt-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Order notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="checkout-notes"
              />
            </SurfaceCard>

            {/* Points & Totals */}
            <SurfaceCard>
              <div className="text-2xl font-bold text-[#20364D]">Rewards & Totals</div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-2">Points to use</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    value={requestedPointsAmount}
                    onChange={(e) => setRequestedPointsAmount(e.target.value)}
                    data-testid="points-input"
                  />
                </div>

                <button
                  type="button"
                  onClick={validatePoints}
                  className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-50"
                  data-testid="validate-points-btn"
                >
                  Validate Points
                </button>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex justify-between py-1">
                    <span>Subtotal</span>
                    <span>TZS {Number(subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Approved Points</span>
                    <span className="text-emerald-600">
                      -TZS {Number(validation?.checkout?.approved_points_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-[#20364D] border-t mt-2 pt-2">
                    <span>Final Total</span>
                    <span data-testid="checkout-final-total">
                      TZS {Number(validation?.checkout?.final_total || subtotal).toLocaleString()}
                    </span>
                  </div>
                </div>

                {validation?.message && (
                  <div className="rounded-2xl border bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                    {validation.message}
                  </div>
                )}
              </div>
            </SurfaceCard>
          </div>

          {/* Right Column - Payment Method + Payment Confirmation (2-col desktop, stacked mobile) */}
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Payment Method */}
              <SurfaceCard className="md:col-span-1">
                <div className="text-lg font-bold text-[#20364D]">Payment Method</div>
                <div className="space-y-3 mt-4">
                  <PaymentMethodOption
                    label="Bank Transfer"
                    description="Pay using the displayed bank details, then upload payment proof."
                    active
                    selected={selectedMethod === "bank_transfer"}
                    onClick={() => setSelectedMethod("bank_transfer")}
                    data-testid="payment-bank-transfer"
                  />
                  <PaymentMethodOption
                    label="Mobile Money"
                    description="M-Pesa, Tigo Pesa, Airtel Money integration pending."
                    disabled
                    data-testid="payment-mobile-money"
                  />
                  <PaymentMethodOption
                    label="Card Payment"
                    description="Visa, Mastercard integration pending."
                    disabled
                    data-testid="payment-card"
                  />
                  <PaymentMethodOption
                    label="KwikPay"
                    description="Online gateway integration pending."
                    disabled
                    data-testid="payment-kwikpay"
                  />
                </div>
              </SurfaceCard>

              {/* Payment Confirmation */}
              <SurfaceCard className="md:col-span-1">
                <div className="text-lg font-bold text-[#20364D]">Payment Confirmation</div>

                {selectedMethod === "bank_transfer" && (
                  <div className="rounded-2xl border bg-[#F4E7BF] p-4 mt-4 text-sm text-[#8B6A10]">
                    <div className="font-semibold mb-2">Bank Details (Tanzania)</div>
                    <div><strong>Account Name:</strong> {tzSettings.account_name}</div>
                    <div className="mt-1"><strong>Account Number:</strong> {tzSettings.account_number}</div>
                    <div className="mt-1"><strong>Bank:</strong> {tzSettings.bank_name}</div>
                    <div className="mt-1"><strong>SWIFT:</strong> {tzSettings.swift}</div>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex justify-between py-1 font-bold text-[#20364D]">
                      <span>Amount Due</span>
                      <span data-testid="confirmation-amount-due">
                        TZS {Number(validation?.checkout?.final_total || subtotal).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border hover:bg-slate-50 transition" data-testid="payment-confirmation-label">
                    <input
                      type="checkbox"
                      checked={paymentConfirmed}
                      onChange={(e) => setPaymentConfirmed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]"
                      data-testid="payment-confirmation-checkbox"
                    />
                    <span className="text-sm text-slate-600">
                      I confirm I will make this payment via the selected method. I understand that the order will only be processed after payment proof is submitted and approved.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting || !paymentConfirmed}
                    className="w-full rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C] hover:bg-[#c49a3d] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="checkout-submit-btn"
                  >
                    {submitting ? "Processing..." : "Continue with Bank Transfer"}
                  </button>

                  {!paymentConfirmed && (
                    <p className="text-xs text-slate-400 text-center">
                      Please confirm payment acknowledgment to proceed
                    </p>
                  )}
                </div>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
