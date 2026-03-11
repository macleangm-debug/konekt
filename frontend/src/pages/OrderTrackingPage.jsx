import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, MapPin, Phone, Mail } from "lucide-react";
import OrderTimeline from "../components/OrderTimeline";
import api from "../lib/api";

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/orders/track/${orderId}`);
        setOrder(res.data);
      } catch (error) {
        console.error("Failed to load order", error);
        setError("Order not found or you don't have access to view it.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-64" />
            <div className="h-32 bg-slate-200 rounded-3xl" />
            <div className="h-96 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto" />
          <h1 className="text-2xl font-bold mt-4">{error || "Order not found"}</h1>
          <Link
            to="/dashboard"
            className="inline-block mt-6 rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="order-tracking-page">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold">Track Order</h1>
          <p className="mt-2 text-slate-600">
            Follow your order from confirmation to delivery.
          </p>
        </div>

        {/* Order summary card */}
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-sm text-slate-500">Order Number</div>
              <div className="text-2xl font-bold mt-1">{order.order_number}</div>
              <div className="text-sm text-slate-500 mt-2">
                Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-500">Order Total</div>
              <div className="text-2xl font-bold mt-1">
                {order.currency || "TZS"} {Number(order.total || 0).toLocaleString()}
              </div>
              <div
                className={`inline-block mt-2 rounded-full px-4 py-1.5 text-sm font-medium ${
                  order.status === "delivered"
                    ? "bg-emerald-100 text-emerald-700"
                    : order.status === "in_production"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {order.status?.replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          {/* Timeline */}
          <OrderTimeline
            currentStatus={order.status}
            history={order.status_history || []}
          />

          {/* Order details sidebar */}
          <div className="space-y-6">
            {/* Delivery info */}
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="text-lg font-semibold mb-4">Delivery Information</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <div className="font-medium">{order.customer_name}</div>
                    {order.delivery_address && (
                      <div className="text-slate-500 mt-1">{order.delivery_address}</div>
                    )}
                    {order.city && (
                      <div className="text-slate-500">{order.city}, {order.country || "Tanzania"}</div>
                    )}
                  </div>
                </div>

                {order.customer_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <span>{order.customer_phone}</span>
                  </div>
                )}

                {order.customer_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span>{order.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order items */}
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="text-lg font-semibold mb-4">Order Items</h3>
              <div className="space-y-3">
                {(order.line_items || []).map((item, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-50 p-4">
                    <div className="font-medium">{item.description}</div>
                    <div className="flex justify-between text-sm text-slate-500 mt-2">
                      <span>Qty: {item.quantity}</span>
                      <span>
                        {order.currency || "TZS"} {Number(item.total || 0).toLocaleString()}
                      </span>
                    </div>
                    {item.customization_summary && (
                      <div className="text-xs text-slate-400 mt-2">
                        {item.customization_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    {order.currency || "TZS"} {Number(order.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="rounded-3xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-3">Order Notes</h3>
                <p className="text-sm text-slate-600">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
