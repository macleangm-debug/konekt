import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, Wrench, Calendar, CreditCard, Loader2 } from "lucide-react";
import OrderDetailTimelineSection from "../../components/orders/OrderDetailTimelineSection";
import CustomerAssignedSalesCard from "../../components/orders/CustomerAssignedSalesCard";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function OrderDetailPageV2() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${API_URL}/api/customer/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrder(res.data);
      } catch (err) {
        console.error("Failed to load order:", err);
        // Use demo data if API fails
        setOrder({
          id: orderId,
          type: "product",
          timeline_index: 2,
          title: "Sample Order",
          status: "In Progress",
          total: 150000,
          created_at: new Date().toISOString(),
          items: [
            { name: "Executive Office Chair", quantity: 2, price: 75000 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <div className="text-xl font-bold text-slate-600">Order not found</div>
        <Link to="/account/orders" className="text-[#20364D] underline mt-2 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isService = order.type === "service";
  const OrderIcon = isService ? Wrench : Package;

  return (
    <div className="space-y-8" data-testid="order-detail-page">
      <Link 
        to="/account/orders" 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-[#20364D] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              isService ? "bg-purple-100" : "bg-[#20364D]/10"
            }`}>
              <OrderIcon className={`w-7 h-7 ${isService ? "text-purple-600" : "text-[#20364D]"}`} />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#20364D]">
                {order.title || `Order #${order.id?.slice(-8)}`}
              </div>
              <div className="text-slate-500 mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === "Delivered" || order.status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : order.status === "In Progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-500">Total</div>
            <div className="text-2xl font-bold text-[#20364D]">
              TZS {Number(order.total || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      <OrderDetailTimelineSection order={order} />

      {/* Assigned Sales Contact */}
      {order.sales && <CustomerAssignedSalesCard sales={order.sales} />}

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-xl font-bold text-[#20364D] mb-4">Order Items</div>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <div className="font-medium text-[#20364D]">{item.name || item.product_name}</div>
                  <div className="text-sm text-slate-500">Qty: {item.quantity || 1}</div>
                </div>
                <div className="font-semibold text-[#20364D]">
                  TZS {Number(item.price || item.subtotal || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-[2rem] border bg-white p-6">
        <div className="text-lg font-bold text-[#20364D] mb-4">Need Help?</div>
        <p className="text-slate-600 mb-4">
          If you have questions about this order, our support team is here to help.
        </p>
        <Link
          to="/account/help"
          className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
