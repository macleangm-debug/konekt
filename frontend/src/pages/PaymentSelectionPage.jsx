import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Smartphone, Building2, CreditCard, Shield } from "lucide-react";
import { paymentApi } from "../lib/paymentApi";
import GuestCheckoutActivationBanner from "../components/requests/GuestCheckoutActivationBanner";

export default function PaymentSelectionPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const targetType = params.get("target_type") || "order";
  const targetId = params.get("target_id") || "";
  const email = params.get("email") || "";
  const amount = params.get("amount") || "";
  const customerName = location.state?.customerName || "";
  const accountInvite = location.state?.accountInvite || null;
  
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
            Pay using bank transfer. Other payment options coming soon.
          </p>
          {amount && (
            <div className="mt-4 text-2xl font-bold text-[#2D3E50]">
              Amount: TZS {Number(amount).toLocaleString()}
            </div>
          )}
        </div>

        {/* Account Activation Banner (shown for guest checkout) */}
        {accountInvite && (
          <div className="mb-6">
            <GuestCheckoutActivationBanner accountInvite={accountInvite} customerName={customerName} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bank Transfer - Primary Active Method */}
          <div className="rounded-3xl border-2 border-[#20364D] bg-white p-8 relative">
            <div className="absolute -top-3 left-6 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Active
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#2D3E50] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Bank Transfer</h2>
            </div>
            
            <p className="text-slate-600">
              Best for company and bulk orders. We'll provide bank details and a unique reference.
            </p>

            <div className="mt-5 rounded-xl bg-[#F4E7BF] border border-[#D4A843]/30 p-4">
              <div className="text-sm font-semibold text-[#8B6A10]">Bank Details (Tanzania):</div>
              <div className="mt-2 text-sm space-y-1 text-slate-700">
                <div><strong>Account Name:</strong> KONEKT LIMITED</div>
                <div><strong>Account Number:</strong> 015C8841347002</div>
                <div><strong>Bank:</strong> CRDB BANK</div>
                <div><strong>SWIFT:</strong> CORUTZTZ</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBankTransfer}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold disabled:opacity-50 hover:bg-[#1a2b3c] transition"
              data-testid="pay-bank-transfer-btn"
            >
              {loading ? "Processing..." : "Continue with Bank Transfer"}
            </button>
          </div>

          {/* Mobile Money - Coming Soon */}
          <div className="rounded-3xl border bg-white p-8 opacity-60 relative">
            <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Coming Soon
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-300 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-500">Mobile Money</h2>
            </div>
            
            <p className="text-slate-500">
              Pay using M-Pesa, Tigo Pesa, Airtel Money, or Halotel through KwikPay.
            </p>

            <input
              className="w-full border rounded-xl px-4 py-3 mt-5 bg-slate-50"
              placeholder="Phone number (e.g., +255712345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled
              data-testid="phone-input"
            />

            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-xl bg-slate-300 text-slate-500 px-5 py-3 font-semibold cursor-not-allowed"
              data-testid="pay-mobile-money-btn"
            >
              Not Available Yet
            </button>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Shield className="w-4 h-4" />
              Integration pending - launching soon
            </div>
          </div>
        </div>

        {/* Card Payment - Coming Soon */}
        <div className="mt-6 rounded-3xl border bg-white p-8 opacity-60 relative">
          <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Coming Soon
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-500">Card Payment</h2>
              <p className="text-sm text-slate-400">Visa, Mastercard - Coming soon</p>
            </div>
          </div>
        </div>

        {/* KwikPay Notice */}
        <div className="mt-6 rounded-3xl border bg-slate-100 p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-500" />
            <div>
              <div className="font-semibold text-slate-700">KwikPay Integration</div>
              <p className="text-sm text-slate-500">
                Mobile money payments via KwikPay are not yet available. We're working on enabling this payment method for your convenience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
