import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";

const TANZANIA_REGIONS = [
  "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Morogoro", "Tanga", 
  "Zanzibar", "Kilimanjaro", "Iringa", "Kagera", "Mara", "Shinyanga", "Tabora", 
  "Pwani", "Rukwa", "Singida", "Lindi", "Mtwara", "Ruvuma", "Kigoma", "Geita",
  "Katavi", "Njombe", "Simiyu", "Songwe"
];

export default function AccountCheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vatPercent, setVatPercent] = useState(18);
  
  // Address fields (multi-field progressive input)
  const [address, setAddress] = useState({
    street: "",
    city: "",
    region: "Dar es Salaam",
    postal_code: "",
    country: "Tanzania",
    landmark: "",
  });
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  // Load cart and settings
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cart from localStorage
        const storedCart = localStorage.getItem("konekt_cart");
        const parsedCart = storedCart ? JSON.parse(storedCart) : [];
        setCart(parsedCart);
        
        // Load VAT from canonical source
        try {
          const paymentInfoRes = await api.get("/api/public/payment-info");
          const vat = paymentInfoRes.data?.vat_percent || 18;
          setVatPercent(vat);
        } catch (e) {
          // Use default VAT
        }
        
        // Load saved address if available
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes.data?.phone) setContactPhone(meRes.data.phone);
          
          const addrRes = await api.get("/api/customer/addresses");
          const defaultAddr = (addrRes.data || []).find((a) => a.is_default) || addrRes.data?.[0];
          if (defaultAddr) {
            setAddress({
              street: defaultAddr.street || "",
              city: defaultAddr.city || "",
              region: defaultAddr.region || "Dar es Salaam",
              postal_code: defaultAddr.postal_code || "",
              country: defaultAddr.country || "Tanzania",
              landmark: defaultAddr.landmark || "",
            });
          }
        } catch (e) {
          // No saved address
        }
      } catch (err) {
        console.error("Failed to load checkout data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const vatAmount = Math.round(subtotal * (vatPercent / 100));
  const total = subtotal + vatAmount;

  const handleCheckout = async () => {
    // Validate required fields
    if (!address.street.trim()) {
      toast.error("Please enter your street address");
      return;
    }
    if (!address.city.trim()) {
      toast.error("Please enter your city");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("Please enter your contact phone number");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      // Save address if requested
      if (saveAddress) {
        try {
          await api.post("/api/customer/addresses", {
            ...address,
            is_default: true,
          });
        } catch (e) {
          // Continue even if address save fails
        }
      }

      // Create Quote (not Invoice) with VAT
      const quotePayload = {
        items: cart.map((item) => ({
          name: item.name,
          sku: item.sku || item.id,
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          subtotal: (item.price || 0) * (item.quantity || 1),
        })),
        subtotal: subtotal,
        vat_percent: vatPercent,
        vat_amount: vatAmount,
        total: total,
        delivery_address: {
          ...address,
          contact_phone: contactPhone,
        },
        delivery_notes: deliveryNotes,
        source: "in_account_checkout",
      };

      const res = await api.post("/api/customer/checkout-quote", quotePayload);
      
      // Clear cart
      localStorage.removeItem("konekt_cart");
      
      toast.success("Quote created successfully!");
      
      // Navigate to quote detail page
      navigate(`/dashboard/quotes/${res.data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create quote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20364D]"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Checkout</div>
          <div className="text-slate-600 mt-2">Complete your order without leaving your account shell.</div>
        </div>
        <div className="rounded-[2rem] border bg-white p-8 text-center">
          <div className="text-slate-500 mb-4">Your cart is empty</div>
          <Link to="/account/marketplace" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold inline-block">
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Checkout</div>
        <div className="text-slate-600 mt-2">Complete your order without leaving your account shell.</div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Delivery Address Section */}
        <div className="rounded-[2rem] border bg-white p-8 space-y-5">
          <div className="text-2xl font-bold text-[#20364D]">Delivery Address</div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <div className="text-sm text-slate-500 mb-2">Street Address *</div>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="123 Main Street, Building Name"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                data-testid="street-input"
              />
            </label>
            
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">City *</div>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Dar es Salaam"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                data-testid="city-input"
              />
            </label>
            
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Region *</div>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={address.region}
                onChange={(e) => setAddress({ ...address, region: e.target.value })}
                data-testid="region-select"
              >
                {TANZANIA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Postal Code</div>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Optional"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                data-testid="postal-code-input"
              />
            </label>
            
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Contact Phone *</div>
              <input
                type="tel"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="+255 7XX XXX XXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                data-testid="phone-input"
              />
            </label>
            
            <label className="block md:col-span-2">
              <div className="text-sm text-slate-500 mb-2">Landmark / Additional Info</div>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Near XYZ, opposite ABC"
                value={address.landmark}
                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                data-testid="landmark-input"
              />
            </label>
            
            <label className="block md:col-span-2">
              <div className="text-sm text-slate-500 mb-2">Delivery Notes</div>
              <textarea
                className="w-full min-h-[80px] border rounded-xl px-4 py-3"
                placeholder="Special delivery instructions..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                data-testid="notes-textarea"
              />
            </label>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="w-4 h-4 rounded"
              data-testid="save-address-checkbox"
            />
            <span className="text-sm text-slate-600">Save this address for future orders</span>
          </label>
        </div>

        {/* Order Summary Section */}
        <div className="rounded-[2rem] border bg-white p-8 space-y-5">
          <div className="text-2xl font-bold text-[#20364D]">Order Summary</div>
          
          {/* Cart Items */}
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-slate-500">Qty: {item.quantity || 1}</div>
                </div>
                <div className="font-medium">TZS {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
              </div>
            ))}
          </div>
          
          <hr />
          
          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>TZS {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT ({vatPercent}%)</span>
              <span>TZS {vatAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-[#20364D]">
              <span>Total</span>
              <span>TZS {total.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Delivery Cost Disclaimer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-800">
                <strong>Delivery Note:</strong> This cost does not include delivery. On delivery, you will be contacted to arrange shipping details and costs.
              </div>
            </div>
          </div>
          
          {/* Quote Creation Info */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-sm text-blue-800">
                Clicking below will create a <strong>Quote</strong> for your review. You can then proceed to pay and convert it to an invoice.
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="w-full rounded-xl bg-[#20364D] text-white px-5 py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="checkout-btn"
          >
            {submitting ? "Creating Quote..." : "Proceed to Checkout"}
          </button>
          
          <Link to="/account/cart" className="block text-center text-sm text-slate-500 hover:text-slate-700">
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
