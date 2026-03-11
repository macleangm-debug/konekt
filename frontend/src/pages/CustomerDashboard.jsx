import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  FileText,
  Palette,
  Receipt,
  ArrowRight,
  ShoppingBag,
  PenTool,
  TrendingUp,
} from "lucide-react";
import api from "../lib/api";

const quickCards = [
  {
    title: "My Orders",
    description: "Track active and completed orders",
    icon: Package,
    href: "/dashboard/orders",
  },
  {
    title: "My Quotes",
    description: "Review quote requests and approvals",
    icon: FileText,
    href: "/dashboard/quotes",
  },
  {
    title: "My Designs",
    description: "Saved design drafts and creative jobs",
    icon: Palette,
    href: "/dashboard/designs",
  },
  {
    title: "Invoices",
    description: "View invoices and payment history",
    icon: Receipt,
    href: "/dashboard/invoices",
  },
];

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, quotesRes] = await Promise.all([
          api.get("/api/orders/me").catch(() => ({ data: [] })),
          api.get("/api/quotes/me").catch(() => ({ data: [] })),
        ]);
        setOrders(ordersRes.data || []);
        setQuotes(quotesRes.data || []);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "confirmed":
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "in_production":
      case "in_review":
        return "bg-blue-100 text-blue-700";
      case "delivered":
      case "completed":
        return "bg-slate-100 text-slate-700";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="customer-dashboard">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-4xl font-bold">Customer Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Manage your orders, quotes, designs, and invoices in one place.
          </p>
        </div>

        {/* Quick access cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.href}
                className="rounded-3xl border bg-white p-6 shadow-sm hover:shadow-md transition"
                data-testid={`dashboard-card-${card.title.toLowerCase().replace(' ', '-')}`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#2D3E50]" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D4A843]">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <section className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Orders</h2>
              <Link to="/dashboard/orders" className="text-sm font-medium text-[#2D3E50]">
                View all
              </Link>
            </div>

            <div className="space-y-4 mt-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl bg-slate-100 h-20" />
                  ))}
                </div>
              ) : orders.length > 0 ? (
                orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id || order.order_number}
                    to={`/orders/${order.id}/tracking`}
                    className="block rounded-2xl border bg-slate-50 p-4 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{order.order_number}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {order.currency || "TZS"} {Number(order.total || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500 mt-3">No orders yet</p>
                  <Link
                    to="/products"
                    className="inline-block mt-4 text-sm font-medium text-[#D4A843]"
                  >
                    Browse products
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Open Quotes */}
          <section className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Open Quotes</h2>
              <Link to="/dashboard/quotes" className="text-sm font-medium text-[#2D3E50]">
                View all
              </Link>
            </div>

            <div className="space-y-4 mt-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl bg-slate-100 h-20" />
                  ))}
                </div>
              ) : quotes.length > 0 ? (
                quotes.slice(0, 5).map((quote) => (
                  <div key={quote.id || quote.quote_number} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{quote.quote_number}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(quote.status)}`}>
                        {quote.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500 mt-3">No quotes yet</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Quick Actions */}
        <section className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <Link
              to="/products"
              className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2D3E50] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold">Order Products</div>
                <div className="text-sm text-slate-500 mt-1">
                  Browse and order branded merchandise
                </div>
              </div>
            </Link>

            <Link
              to="/creative-services"
              className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#D4A843] flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold">Start Design Project</div>
                <div className="text-sm text-slate-500 mt-1">
                  Submit a creative service brief
                </div>
              </div>
            </Link>

            <Link
              to="/dashboard/orders"
              className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold">Track Orders</div>
                <div className="text-sm text-slate-500 mt-1">
                  Follow live status of active jobs
                </div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
