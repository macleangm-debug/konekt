import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import PaymentMethodOption from "../../components/payments/PaymentMethodOption";

export default function CheckoutPageV2() {
  const [cartItems, setCartItems] = useState([]);
  const [requestedPointsAmount, setRequestedPointsAmount] = useState(0);
  const [validation, setValidation] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("bank_transfer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [settingsRes] = await Promise.all([
          api.get("/api/admin/payment-settings"),
        ]);

        setPaymentSettings(settingsRes.data || []);

        const guestCart = JSON.parse(localStorage.getItem("guest_cart_v1") || "[]");
        const mapped = guestCart.map((item) => ({
          ...item,
          qty: Number(item.quantity || item.qty || 1),
          partner_cost: Number(item.partner_cost || 0),
        }));
        setCartItems(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.qty || 0), 0),
    [cartItems]
  );

  const partnerCostTotal = useMemo(
    () => cartItems.reduce((sum, x) => sum + Number(x.partner_cost || 0) * Number(x.qty || 0), 0),
    [cartItems]
  );

  const tzSettings = useMemo(
    () => (paymentSettings || []).find((x) => x.country_code === "TZ") || null,
    [paymentSettings]
  );

  const validatePoints = async () => {
    const res = await api.post("/api/checkout-points/validate", {
      subtotal,
      partner_cost_total: partnerCostTotal,
      requested_points_amount: Number(requestedPointsAmount || 0),
      protected_margin_percent: 40,
      points_cap_percent_of_distributable_margin: 10,
    });
    setValidation(res.data);
  };

  useEffect(() => {
    if (cartItems.length) validatePoints();
  }, [cartItems]);

  if (loading) return <div className="p-10">Loading checkout...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checkout"
        subtitle="Review your order, apply points safely, and continue using the available payment method."
      />

      <div className="grid xl:grid-cols-[1fr_0.95fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Order Summary</div>
          <div className="space-y-4 mt-6">
            {cartItems.length ? cartItems.map((item) => (
              <div key={`${item.sku}-${item.name}`} className="rounded-2xl border bg-slate-50 p-4">
                <div className="font-semibold text-[#20364D]">{item.name}</div>
                <div className="text-sm text-slate-500 mt-1">{item.sku}</div>
                <div className="text-sm mt-3">{item.qty} × {Number(item.price || 0).toLocaleString()}</div>
              </div>
            )) : (
              <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600">
                Your cart is empty.
              </div>
            )}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <div className="text-2xl font-bold text-[#20364D]">Rewards & Totals</div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-2">Points to use</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-4 py-3"
                  value={requestedPointsAmount}
                  onChange={(e) => setRequestedPointsAmount(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={validatePoints}
                className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
              >
                Validate Points
              </button>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex justify-between py-1">
                  <span>Subtotal</span>
                  <span>{Number(subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Approved Points</span>
                  <span>{Number(validation?.checkout?.approved_points_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-[#20364D] border-t mt-2 pt-2">
                  <span>Final Total</span>
                  <span>{Number(validation?.checkout?.final_total || subtotal).toLocaleString()}</span>
                </div>
              </div>

              {validation?.message ? (
                <div className="rounded-2xl border bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                  {validation.message}
                </div>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="text-2xl font-bold text-[#20364D]">Payment Method</div>
            <div className="space-y-3 mt-5">
              <PaymentMethodOption
                label="Bank Transfer"
                description="Pay using the displayed bank details, then upload payment proof."
                active
                selected={selectedMethod === "bank_transfer"}
                onClick={() => setSelectedMethod("bank_transfer")}
              />

              <PaymentMethodOption
                label="KwikPay"
                description="Online gateway integration is not available yet."
                disabled
              />

              <PaymentMethodOption
                label="Card"
                description="Card payment is not available yet."
                disabled
              />

              <PaymentMethodOption
                label="Mobile Money"
                description="Mobile money payment is not available yet."
                disabled
              />
            </div>

            {selectedMethod === "bank_transfer" && tzSettings ? (
              <div className="rounded-2xl border bg-slate-50 p-4 mt-6 text-sm text-slate-700">
                <div><strong>Account Name:</strong> {tzSettings.account_name || "KONEKT LIMITED"}</div>
                <div className="mt-1"><strong>Account Number:</strong> {tzSettings.account_number || "015C8841347002"}</div>
                <div className="mt-1"><strong>Bank:</strong> {tzSettings.bank_name || "CRDB BANK"}</div>
                <div className="mt-1"><strong>SWIFT:</strong> {tzSettings.swift || "CORUTZTZ"}</div>
              </div>
            ) : null}

            <button
              type="button"
              className="w-full mt-6 rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C]"
            >
              Continue with Bank Transfer
            </button>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
