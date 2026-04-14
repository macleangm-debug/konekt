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
  const [walletData, setWalletData] = useState({ balance: 0, max_pct: 30 });
  const [walletApplyAmount, setWalletApplyAmount] = useState(0);
  const [walletApplied, setWalletApplied] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("bank_transfer");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer details form
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
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
                first_name: (userRes.data.full_name || "").split(" ")[0] || "",
                last_name: (userRes.data.full_name || "").split(" ").slice(1).join(" ") || "",
                email: userRes.data.email || "",
                phone: userRes.data.phone || "",
                company_name: userRes.data.company_name || "",
              }));
            }
          } catch (err) {
            console.log("Failed to load user data");
          }

          // Load wallet data
          try {
            const walletRes = await api.get("/api/customer/referrals/wallet-usage-rules");
            if (walletRes.data) {
              setWalletData({
                balance: walletRes.data.wallet_balance || 0,
                max_pct: walletRes.data.max_wallet_usage_pct || 30,
              });
            }
          } catch {
            // Wallet not available
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

  const tzSettings = useMemo(
    () => (paymentSettings || []).find((x) => x.country_code === "TZ") || {
      account_name: "KONEKT LIMITED",
      account_number: "015C8841347002",
      bank_name: "CRDB BANK",
      swift: "CORUTZTZ",
    },
    [paymentSettings]
  );

  useEffect(() => {
    // no-op: wallet loaded separately
  }, [cartItems, subtotal]);

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
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
      const { phone_prefix, first_name, last_name, ...orderForm } = form;
      const orderRes = await api.post("/api/orders", {
        ...orderForm,
        customer_name: [first_name, last_name].filter(Boolean).join(" "),
        first_name,
        last_name,
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
        total: Math.max(0, subtotal - (walletApplied ? walletApplyAmount : 0)),
        wallet_applied: walletApplied ? walletApplyAmount : 0,
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
        subtitle="Review your order, apply wallet credits, and continue with payment."
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
                  placeholder="First name *"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                  data-testid="checkout-v2-firstname"
                />
                <input
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Last name *"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                  data-testid="checkout-v2-lastname"
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

            {/* Wallet & Totals */}
            <SurfaceCard>
              <div className="text-2xl font-bold text-[#20364D]">Wallet & Totals</div>

              <div className="mt-5 space-y-4">
                {/* Wallet Usage Block */}
                {walletData.balance > 0 && (
                  <div className="rounded-2xl border bg-gradient-to-br from-[#20364D]/5 to-[#D4A843]/5 p-4 space-y-3" data-testid="wallet-usage-block">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#20364D]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      Use Wallet Balance
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Wallet Balance</span>
                        <div className="font-bold text-[#2D3E50]" data-testid="checkout-wallet-balance">
                          TZS {Number(walletData.balance).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Max usable ({walletData.max_pct}%)</span>
                        <div className="font-bold text-[#2D3E50]" data-testid="checkout-wallet-max">
                          TZS {Number(Math.min(walletData.balance, Math.floor(subtotal * walletData.max_pct / 100))).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!walletApplied ? (
                      <button
                        type="button"
                        onClick={() => {
                          const maxUsable = Math.min(walletData.balance, Math.floor(subtotal * walletData.max_pct / 100));
                          setWalletApplyAmount(maxUsable);
                          setWalletApplied(true);
                          toast.success(`TZS ${maxUsable.toLocaleString()} will be applied from wallet`);
                        }}
                        className="rounded-xl bg-[#D4A843] px-4 py-2.5 text-sm font-semibold text-[#20364D] hover:bg-[#c49a3d] transition w-full"
                        data-testid="apply-wallet-btn"
                      >
                        Apply Wallet Balance
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                          <span className="text-sm text-emerald-800 font-medium">
                            Applied: TZS {Number(walletApplyAmount).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setWalletApplyAmount(0);
                              setWalletApplied(false);
                              toast.info("Wallet credit removed");
                            }}
                            className="text-xs text-red-600 underline"
                            data-testid="remove-wallet-btn"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-400">
                      You can use up to {walletData.max_pct}% of this fee from your wallet.
                      {walletData.balance > Math.floor(subtotal * walletData.max_pct / 100) && (
                        <span> You have enough balance, but only up to {walletData.max_pct}% can be applied.</span>
                      )}
                    </p>
                  </div>
                )}

                {walletData.balance <= 0 && (
                  <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500" data-testid="wallet-empty-state">
                    Your wallet is currently empty. Earn rewards by referring others!
                  </div>
                )}

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex justify-between py-1">
                    <span>Subtotal</span>
                    <span>TZS {Number(subtotal || 0).toLocaleString()}</span>
                  </div>
                  {walletApplied && walletApplyAmount > 0 && (
                    <div className="flex justify-between py-1 text-emerald-600">
                      <span>Wallet Applied</span>
                      <span data-testid="checkout-wallet-applied">
                        -TZS {Number(walletApplyAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 font-bold text-[#20364D] border-t mt-2 pt-2">
                    <span>Final Total</span>
                    <span data-testid="checkout-final-total">
                      TZS {Number(Math.max(0, (subtotal || 0) - (walletApplied ? walletApplyAmount : 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
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
                        TZS {Number(Math.max(0, (subtotal || 0) - (walletApplied ? walletApplyAmount : 0))).toLocaleString()}
                      </span>
                    </div>
                    {walletApplied && walletApplyAmount > 0 && (
                      <div className="flex justify-between py-1 text-xs text-emerald-600">
                        <span>Wallet applied</span>
                        <span>-TZS {Number(walletApplyAmount).toLocaleString()}</span>
                      </div>
                    )}
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
