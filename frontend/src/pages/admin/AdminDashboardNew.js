import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingCart, Users, ClipboardList, Package, FileText, 
  AlertTriangle, TrendingUp, Briefcase, ArrowRight, Clock, BarChart3
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";

export default function AdminDashboardNew() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getDashboardSummary();
        setSummary(res.data);
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Total Orders", value: summary?.orders ?? "-", icon: ShoppingCart, color: "bg-blue-500", link: "/admin/orders" },
    { label: "Service Orders", value: summary?.service_orders ?? "-", icon: Briefcase, color: "bg-purple-500", link: "/admin/service-orders" },
    { label: "CRM Leads", value: summary?.leads ?? "-", icon: Users, color: "bg-green-500", link: "/admin/crm" },
    { label: "Open Tasks", value: summary?.open_tasks ?? "-", icon: ClipboardList, color: "bg-orange-500", link: "/admin/tasks" },
    { label: "Invoices", value: summary?.invoices ?? "-", icon: FileText, color: "bg-cyan-500", link: "/admin/invoices" },
    { label: "Low Stock", value: summary?.low_stock_items ?? "-", icon: AlertTriangle, color: summary?.low_stock_items > 0 ? "bg-red-500" : "bg-slate-400", link: "/admin/inventory" },
  ];

  const quickLinks = [
    { title: "Manage Orders", desc: "View and update order statuses", href: "/admin/orders", icon: ShoppingCart },
    { title: "CRM Pipeline", desc: "Track leads and conversions", href: "/admin/crm", icon: Users },
    { title: "Inventory", desc: "Stock levels and movements", href: "/admin/inventory", icon: Package },
    { title: "Invoices", desc: "Create and track invoices", href: "/admin/invoices", icon: FileText },
    { title: "Tasks", desc: "Team task management", href: "/admin/tasks", icon: ClipboardList },
    { title: "Quotes", desc: "Quotations and proposals", href: "/admin/quotes", icon: FileText },
    { title: "Discount Analytics", desc: "Track discount impact and margin risk", href: "/admin/discount-analytics", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse mb-8" />
          <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-8 bg-slate-200 rounded w-16 mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-slate-600">Daily operations overview for the team</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.link}
              className="group rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-[#D4A843]/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-3xl font-bold mt-1 text-slate-900">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center text-white`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-slate-500 group-hover:text-[#D4A843] transition-colors">
                View details <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Revenue Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-[#2D3E50] to-[#1A2430] p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-[#D4A843]" />
              <h3 className="text-lg font-semibold">Total Revenue (Paid Invoices)</h3>
            </div>
            <p className="text-4xl font-bold">TZS {(summary?.total_revenue || 0).toLocaleString()}</p>
            <p className="text-slate-300 mt-2 text-sm">From {summary?.invoices || 0} total invoices</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">New Leads Today</h3>
            </div>
            <p className="text-4xl font-bold text-slate-900">{summary?.new_leads_today || 0}</p>
            <p className="text-slate-500 mt-2 text-sm">Total leads in pipeline: {summary?.leads || 0}</p>
          </div>
        </div>

        {/* Quick Links */}
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              to={link.href}
              className="group flex items-start gap-4 rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-lg hover:border-[#D4A843]/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#D4A843]/10 group-hover:text-[#D4A843] transition-all">
                <link.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-[#2D3E50]">{link.title}</h3>
                <p className="text-sm text-slate-500">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Pending Actions Alert */}
        {(summary?.pending_orders > 0 || summary?.low_stock_items > 0) && (
          <div className="mt-8 rounded-2xl bg-amber-50 border border-amber-200 p-6">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Action Required
            </h3>
            <div className="mt-3 space-y-2">
              {summary?.pending_orders > 0 && (
                <p className="text-amber-700">
                  • {summary.pending_orders} order(s) pending confirmation
                </p>
              )}
              {summary?.low_stock_items > 0 && (
                <p className="text-amber-700">
                  • {summary.low_stock_items} item(s) with low stock
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
