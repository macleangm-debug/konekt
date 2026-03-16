import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function TrackOrderPageContent() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await axios.get(`${API_URL}/api/orders/${orderId.trim()}/tracking`);
      setOrder(res.data);
    } catch (err) {
      setError("Order not found. Please check the order ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "shipped":
      case "in_transit":
        return <Truck className="w-5 h-5 text-blue-600" />;
      case "processing":
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <Package className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700";
      case "shipped":
      case "in_transit":
        return "bg-blue-100 text-blue-700";
      case "processing":
        return "bg-amber-100 text-amber-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" data-testid="track-order-page">
      <PageHeader 
        title="Track Your Order"
        subtitle="Enter your order ID to check the current status and delivery information."
      />

      {/* Search Form */}
      <SurfaceCard className="mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Order ID
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your order ID (e.g., ORD-12345)"
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
                data-testid="order-id-input"
              />
            </div>
          </div>
          <BrandButton type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Searching..." : "Track Order"}
          </BrandButton>
        </form>
      </SurfaceCard>

      {/* Error State */}
      {error && (
        <SurfaceCard className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </SurfaceCard>
      )}

      {/* Order Details */}
      {order && (
        <div className="space-y-6" data-testid="order-details">
          <SurfaceCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#20364D]">Order #{order.order_id || order.id}</h2>
                <p className="text-slate-500 text-sm">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {(order.status || "pending").replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            {/* Status Timeline */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold mb-4">Order Progress</h3>
              <div className="space-y-4">
                {(order.timeline || [
                  { status: "confirmed", label: "Order Confirmed", date: order.created_at },
                  { status: "processing", label: "Processing", date: order.processing_at },
                  { status: "shipped", label: "Shipped", date: order.shipped_at },
                  { status: "delivered", label: "Delivered", date: order.delivered_at },
                ]).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.date ? "bg-[#20364D]" : "bg-slate-200"
                    }`}>
                      {step.date ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${step.date ? "text-[#20364D]" : "text-slate-400"}`}>
                        {step.label}
                      </div>
                      {step.date && (
                        <div className="text-sm text-slate-500">
                          {new Date(step.date).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>

          {/* Delivery Info */}
          {order.delivery_address && (
            <SurfaceCard>
              <h3 className="font-semibold mb-3">Delivery Address</h3>
              <p className="text-slate-600">{order.delivery_address}</p>
            </SurfaceCard>
          )}
        </div>
      )}

      {/* Help Section */}
      <SurfaceCard className="mt-8 bg-slate-50">
        <h3 className="font-semibold mb-2">Need help?</h3>
        <p className="text-slate-600 text-sm mb-4">
          If you have questions about your order, please contact our support team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <BrandButton href="/dashboard" variant="ghost">
            View My Orders
          </BrandButton>
          <BrandButton href="mailto:info@konekt.co.tz" variant="ghost">
            Contact Support
          </BrandButton>
        </div>
      </SurfaceCard>
    </div>
  );
}
