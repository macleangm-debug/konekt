import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  FileText,
  Receipt,
  Palette,
  ArrowRight,
  ShoppingBag,
  PenTool,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import api from "../../lib/api";
import ReferralPointsBanner from "../../components/customer/ReferralPointsBanner";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import { Button } from "../../components/ui/button";

export default function CustomerDashboardHome() {
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, quotesRes, invoicesRes, projectsRes] = await Promise.all([
          api.get("/api/orders/me").catch(() => ({ data: [] })),
          api.get("/api/customer/quotes").catch(() => ({ data: [] })),
          api.get("/api/customer/invoices").catch(() => ({ data: [] })),
          api.get("/api/creative-projects/my").catch(() => ({ data: [] })),
        ]);
        setOrders(ordersRes.data || []);
        setQuotes(quotesRes.data || []);
        setInvoices(invoicesRes.data || []);
        setProjects(projectsRes.data || []);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
      case "draft":
        return "bg-amber-100 text-amber-700";
      case "sent":
      case "confirmed":
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "in_production":
      case "in_progress":
      case "in_review":
        return "bg-blue-100 text-blue-700";
      case "delivered":
      case "completed":
      case "paid":
        return "bg-slate-100 text-slate-700";
      case "cancelled":
      case "rejected":
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Calculate summary stats
  const pendingQuotes = quotes.filter(q => q.status === "sent" || q.status === "pending").length;
  const unpaidInvoices = invoices.filter(i => i.status !== "paid" && i.balance_due > 0).length;
  const activeOrders = orders.filter(o => !["delivered", "cancelled", "completed"].includes(o.status)).length;
  const activeProjects = projects.filter(p => !["completed", "cancelled"].includes(p.status)).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-slate-200 rounded"></div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-3xl bg-slate-200 h-28 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="customer-dashboard-home">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back!</h1>
        <p className="mt-1 text-slate-600">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Referral & Points Banner */}
      <ReferralPointsBanner />

      {/* Action Required Cards */}
      {(pendingQuotes > 0 || unpaidInvoices > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {pendingQuotes > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Quotes Awaiting Approval</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have {pendingQuotes} {pendingQuotes === 1 ? "quote" : "quotes"} pending your review.
                </p>
                <Link to="/dashboard/quotes">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    data-testid="review-quotes-btn"
                  >
                    Review Quotes
                  </Button>
                </Link>
              </div>
            </div>
          )}
          
          {unpaidInvoices > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Invoices Due</h3>
                <p className="text-sm text-red-700 mt-1">
                  You have {unpaidInvoices} unpaid {unpaidInvoices === 1 ? "invoice" : "invoices"}.
                </p>
                <Link to="/dashboard/invoices">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    data-testid="view-invoices-btn"
                  >
                    View Invoices
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link
          to="/dashboard/orders"
          className="rounded-2xl border bg-white p-5 hover:shadow-md transition group"
          data-testid="stat-active-orders"
        >
          <div className="flex items-center justify-between">
            <Package className="w-8 h-8 text-[#2D3E50]" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4A843] transition" />
          </div>
          <p className="text-3xl font-bold mt-4">{activeOrders}</p>
          <p className="text-sm text-slate-500 mt-1">Active Orders</p>
        </Link>

        <Link
          to="/dashboard/quotes"
          className="rounded-2xl border bg-white p-5 hover:shadow-md transition group"
          data-testid="stat-pending-quotes"
        >
          <div className="flex items-center justify-between">
            <FileText className="w-8 h-8 text-[#D4A843]" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4A843] transition" />
          </div>
          <p className="text-3xl font-bold mt-4">{pendingQuotes}</p>
          <p className="text-sm text-slate-500 mt-1">Pending Quotes</p>
        </Link>

        <Link
          to="/dashboard/invoices"
          className="rounded-2xl border bg-white p-5 hover:shadow-md transition group"
          data-testid="stat-unpaid-invoices"
        >
          <div className="flex items-center justify-between">
            <Receipt className="w-8 h-8 text-emerald-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4A843] transition" />
          </div>
          <p className="text-3xl font-bold mt-4">{unpaidInvoices}</p>
          <p className="text-sm text-slate-500 mt-1">Unpaid Invoices</p>
        </Link>

        <Link
          to="/dashboard/designs"
          className="rounded-2xl border bg-white p-5 hover:shadow-md transition group"
          data-testid="stat-active-projects"
        >
          <div className="flex items-center justify-between">
            <Palette className="w-8 h-8 text-purple-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4A843] transition" />
          </div>
          <p className="text-3xl font-bold mt-4">{activeProjects}</p>
          <p className="text-sm text-slate-500 mt-1">Active Projects</p>
        </Link>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Link to="/dashboard/orders" className="text-sm font-medium text-[#D4A843] hover:underline">
              View all
            </Link>
          </div>
          {orders.length > 0 ? (
            <div className="divide-y">
              {orders.slice(0, 4).map(order => (
                <Link
                  key={order.id || order.order_number}
                  to={`/orders/${order.id}/tracking`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                  data-testid={`order-row-${order.order_number}`}
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-slate-500">
                      {order.currency || "TZS"} {Number(order.total || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status?.replace(/_/g, " ")}
                    </span>
                    <PaymentStatusBadge status={order.payment_status || "unpaid"} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8">
              <EmptyStateCard
                icon={Package}
                title="No orders yet"
                description="Browse our products and place your first order."
                actionLabel="Browse Products"
                actionHref="/products"
                testId="empty-orders"
              />
            </div>
          )}
        </div>

        {/* Pending Quotes */}
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-lg font-semibold">Quotes</h2>
            <Link to="/dashboard/quotes" className="text-sm font-medium text-[#D4A843] hover:underline">
              View all
            </Link>
          </div>
          {quotes.length > 0 ? (
            <div className="divide-y">
              {quotes.slice(0, 4).map(quote => (
                <Link
                  key={quote.id || quote.quote_number}
                  to={`/dashboard/quotes/${quote.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                  data-testid={`quote-row-${quote.quote_number}`}
                >
                  <div>
                    <p className="font-medium">{quote.quote_number}</p>
                    <p className="text-sm text-slate-500">
                      {quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8">
              <EmptyStateCard
                icon={FileText}
                title="No quotes yet"
                description="Request a quote for your next project."
                actionLabel="Request Quote"
                actionHref="/creative-services"
                testId="empty-quotes"
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/products"
            className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            data-testid="quick-action-products"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2D3E50] flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Order Products</p>
              <p className="text-sm text-slate-500 mt-1">Browse and order branded merchandise</p>
            </div>
          </Link>

          <Link
            to="/creative-services"
            className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            data-testid="quick-action-creative"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D4A843] flex items-center justify-center flex-shrink-0">
              <PenTool className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Start Design Project</p>
              <p className="text-sm text-slate-500 mt-1">Submit a creative service brief</p>
            </div>
          </Link>

          <Link
            to="/dashboard/statement"
            className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition flex items-start gap-4"
            data-testid="quick-action-statement"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">View Statement</p>
              <p className="text-sm text-slate-500 mt-1">Check your account balance and history</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
