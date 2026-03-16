import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle2, Truck, Eye, RotateCcw, Loader2 } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [repeatingOrderId, setRepeatingOrderId] = useState(null);

  const loadOrders = async () => {
    try {
      const res = await api.get("/api/orders/me");
      setOrders(res.data || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRepeatOrder = async (orderId) => {
    setRepeatingOrderId(orderId);
    try {
      await api.post(`/api/reorders/order/${orderId}`);
      toast.success("Order duplicated successfully! Check your new order.");
      loadOrders();
    } catch (error) {
      toast.error("Failed to repeat order. Please try again.");
    } finally {
      setRepeatingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "confirmed":
        return "bg-emerald-100 text-emerald-700";
      case "in_production":
        return "bg-blue-100 text-blue-700";
      case "quality_check":
        return "bg-purple-100 text-purple-700";
      case "shipped":
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-700";
      case "delivered":
      case "completed":
        return "bg-slate-100 text-slate-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "delivered":
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "shipped":
      case "out_for_delivery":
        return <Truck className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === "all") return true;
    if (filter === "active") return !["delivered", "completed", "cancelled"].includes(o.status);
    if (filter === "completed") return o.status === "delivered" || o.status === "completed";
    return o.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-slate-200 h-24 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customer-orders-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
        <p className="mt-1 text-slate-600">Track and manage your orders.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "bg-[#2D3E50]" : ""}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div
              key={order.id || order.order_number}
              className="rounded-2xl border bg-white p-5 hover:shadow-md transition"
              data-testid={`order-card-${order.order_number}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-[#2D3E50]" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{order.order_number}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                    {order.items_count > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.items_count} {order.items_count === 1 ? "item" : "items"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {order.currency || "TZS"} {Number(order.total || 0).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status?.replace(/_/g, " ")}</span>
                      </span>
                      <PaymentStatusBadge status={order.payment_status || "unpaid"} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* Repeat Order Button - show for completed/delivered orders */}
                    {["completed", "delivered"].includes(order.status) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRepeatOrder(order.id)}
                        disabled={repeatingOrderId === order.id}
                        data-testid={`repeat-order-${order.id}`}
                      >
                        {repeatingOrderId === order.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-2" />
                        )}
                        Repeat Order
                      </Button>
                    )}
                    <Link to={`/orders/${order.id}/tracking`}>
                      <Button variant="outline" data-testid={`track-order-${order.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Track Order
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Items preview */}
              {order.items && order.items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {item.name || item.product_name || `Item ${idx + 1}`}
                        {item.quantity > 1 && ` x${item.quantity}`}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          icon={Package}
          title="No orders found"
          description={
            filter === "all"
              ? "You haven't placed any orders yet. Browse our products to get started."
              : `No ${filter} orders found.`
          }
          actionLabel="Browse Products"
          actionHref="/products"
          testId="empty-orders"
        />
      )}
    </div>
  );
}
