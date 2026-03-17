import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Eye, Clock, Package } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import AccountBlankState from "../../components/ui/AccountBlankState";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function OrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOrders(res.data || []))
      .catch(err => console.error("Failed to load orders:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchValue || 
      (order.order_number || "").toLowerCase().includes(searchValue.toLowerCase()) ||
      (order.id || "").toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      delivered: "bg-green-100 text-green-700",
      shipped: "bg-blue-100 text-blue-700",
      processing: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
      pending: "bg-slate-100 text-slate-700",
    };
    return styles[status] || styles.pending;
  };

  return (
    <div data-testid="orders-page">
      <PageHeader 
        title="My Orders"
        subtitle="View and track all your orders."
        actions={
          <BrandButton href="/marketplace" variant="primary">
            <ShoppingBag className="w-5 h-5 mr-2" />
            New Order
          </BrandButton>
        }
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search orders..."
        filters={[
          {
            name: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All Statuses",
            options: [
              { value: "pending", label: "Pending" },
              { value: "processing", label: "Processing" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <SurfaceCard key={order.id || order._id} className="hover:shadow-md transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#20364D]">
                      Order #{order.order_number || order.id?.slice(-8)}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    {order.items && (
                      <div className="text-sm text-slate-500 mt-1">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#20364D]">
                      TZS {Number(order.total || 0).toLocaleString()}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(order.status)}`}>
                      {(order.status || "pending").replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <Link
                    to={`/dashboard/orders/${order.id || order._id}`}
                    className="p-3 rounded-xl border hover:bg-slate-50 transition"
                  >
                    <Eye className="w-5 h-5 text-slate-500" />
                  </Link>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : (
        <AccountBlankState
          icon="orders"
          title="No orders yet"
          description="Your order history will appear here once you make your first purchase. Browse our marketplace to find what you need."
          primaryLabel="Browse Marketplace"
          primaryAction="/marketplace"
          secondaryLabel="Request Quote"
          secondaryAction="/services"
          benefits={[
            { title: "Track Everything", description: "Monitor order status from purchase to delivery in real-time." },
            { title: "Easy Reorders", description: "Quickly repeat previous orders with a single click." },
            { title: "Download Documents", description: "Access invoices and receipts for all completed orders." },
          ]}
        />
      )}
    </div>
  );
}
