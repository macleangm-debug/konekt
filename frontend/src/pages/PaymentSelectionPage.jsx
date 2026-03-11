import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Smartphone, Building2, CreditCard, Shield } from "lucide-react";
import { paymentApi } from "../lib/paymentApi";

export default function PaymentSelectionPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const targetType = params.get("target_type") || "order";
  const targetId = params.get("target_id") || "";
  const email = params.get("email") || "";
  const amount = params.get("amount") || "";
  const customerName = location.state?.customerName || "";
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleKwikPay = async () => {
    if (!phoneNumber) {
      alert("Please enter your phone number");
      return;
    }
    
    try {
      setLoading(true);
      const res = await paymentApi.createKwikPayIntent({
        target_type: targetType,
        target_id: targetId,
        phone_number: phoneNumber,
        customer_name: customerName || "Customer",
        customer_email: email,
      });

      alert("Mobile money payment request created. Complete payment on your phone.");
      navigate("/payment/pending", {
        state: {
          provider: "kwikpay",
          payment: res.data,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to start mobile money payment");
    } finally {
      setLoading(false);
    }
  };

  const handleBankTransfer = async () => {
    try {
      setLoading(true);
      const res = await paymentApi.createBankTransferIntent({
        target_type: targetType,
        target_id: targetId,
        customer_name: customerName || "Customer",
        customer_email: email,
      });

      navigate("/payment/bank-transfer", {
        state: res.data,
      });
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to start bank transfer flow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="payment-selection-page">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Choose Payment Method</h1>
          <p className="mt-2 text-slate-600">
            Pay using mobile money or bank transfer.
          </p>
          {amount && (
            <div className="mt-4 text-2xl font-bold text-[#2D3E50]">
              Amount: TZS {Number(amount).toLocaleString()}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mobile Money */}
          <div className="rounded-3xl border bg-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4A843] flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Mobile Money</h2>
            </div>
            
            <p className="text-slate-600">
              Pay using M-Pesa, Tigo Pesa, Airtel Money, or Halotel through KwikPay.
            </p>

            <input
              className="w-full border rounded-xl px-4 py-3 mt-5"
              placeholder="Phone number (e.g., +255712345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="phone-input"
            />

            <button
              type="button"
              onClick={handleKwikPay}
              disabled={loading || !phoneNumber}
              className="mt-5 w-full rounded-xl bg-[#D4A843] text-slate-900 px-5 py-3 font-semibold disabled:opacity-50"
              data-testid="pay-mobile-money-btn"
            >
              {loading ? "Processing..." : "Pay with Mobile Money"}
            </button>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              Secure payment via KwikPay
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="rounded-3xl border bg-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#2D3E50] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Bank Transfer</h2>
            </div>
            
            <p className="text-slate-600">
              Best for company and bulk orders. We'll provide bank details and a unique reference.
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 border p-4">
              <div className="text-sm text-slate-500">How it works:</div>
              <ul className="mt-2 text-sm space-y-1">
                <li>1. Get bank details & reference</li>
                <li>2. Make transfer from your bank</li>
                <li>3. Confirm transfer on our site</li>
                <li>4. We verify and process your order</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleBankTransfer}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold disabled:opacity-50"
              data-testid="pay-bank-transfer-btn"
            >
              {loading ? "Processing..." : "Pay via Bank Transfer"}
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 rounded-3xl border bg-white p-8 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-500">Card Payment</h2>
              <p className="text-sm text-slate-400">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
