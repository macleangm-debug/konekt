import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import ClientBannerCarousel from "../../components/ClientBannerCarousel";
import ReferralPointsBanner from "../../components/customer/ReferralPointsBanner";
import {
  Palette,
  Wrench,
  Receipt,
  Package,
  FileText,
  Gift,
  ArrowRight,
} from "lucide-react";

function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-3xl border bg-white p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-bold mt-2 text-[#2D3E50]">{value}</div>
      {subtext && <div className="text-sm text-slate-500 mt-2">{subtext}</div>}
    </div>
  );
}

function ActionCard({ title, text, href, icon: Icon, cta, testId }) {
  return (
    <Link
      to={href}
      className="rounded-3xl border bg-white p-6 hover:shadow-sm transition block"
      data-testid={testId}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon size={22} className="text-[#2D3E50]" />
      </div>
      <h3 className="text-xl font-bold mt-5 text-[#2D3E50]">{title}</h3>
      <p className="text-slate-600 mt-2 text-sm">{text}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-[#D4A843] font-semibold text-sm">
        <span>{cta}</span>
        <ArrowRight size={16} />
      </div>
    </Link>
  );
}

export default function CustomerDashboardHome() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    openQuotes: 0,
    pendingInvoices: 0,
    points: 0,
    referralCode: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, quotesRes, invoicesRes, referralRes] = await Promise.all([
          api.get("/api/customer/orders").catch(() => ({ data: [] })),
          api.get("/api/customer/quotes").catch(() => ({ data: [] })),
          api.get("/api/customer/invoices").catch(() => ({ data: [] })),
          api.get("/api/customer/referrals/overview").catch(() => ({
            data: { points_balance: 0, referral_code: "" },
          })),
        ]);

        const orders = ordersRes.data || [];
        const quotes = quotesRes.data || [];
        const invoices = invoicesRes.data || [];

        const activeOrders = orders.filter(
          (o) => !["delivered", "cancelled", "completed"].includes(o.status)
        ).length;

        const openQuotes = quotes.filter(
          (q) => !["converted", "rejected", "expired"].includes(q.status)
        ).length;

        const pendingInvoices = invoices.filter(
          (i) => ["draft", "sent", "partially_paid"].includes(i.status) &&
            Number(i.balance_due || i.total || 0) > 0
        ).length;

        setStats({
          activeOrders,
          openQuotes,
          pendingInvoices,
          points: referralRes.data?.points_balance || referralRes.data?.wallet?.points_balance || 0,
          referralCode: referralRes.data?.referral_code || "",
        });
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-slate-200 rounded"></div>
        </div>
        <div className="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="customer-dashboard-home">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-left">
          <h1 className="text-4xl font-bold text-[#2D3E50]">Welcome back</h1>
          <p className="text-slate-600 mt-2">
            Order products, request design work, manage invoices, book maintenance, and earn rewards.
          </p>
        </div>

        <ClientBannerCarousel />
      </div>

      {/* Referral & Points Banner */}
      <ReferralPointsBanner
        points={stats.points}
        referralCode={stats.referralCode}
      />

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          label="Active Orders" 
          value={stats.activeOrders} 
          subtext="Track production and delivery" 
        />
        <StatCard 
          label="Open Quotes" 
          value={stats.openQuotes} 
          subtext="Approve and convert to invoice" 
        />
        <StatCard 
          label="Pending Invoices" 
          value={stats.pendingInvoices} 
          subtext="Complete payment faster" 
        />
        <StatCard 
          label="Points Balance" 
          value={stats.points.toLocaleString()} 
          subtext="Use points for discounts" 
        />
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ActionCard
          title="Start Design Project"
          text="Need a logo, flyer, brochure, company profile, or banner? Submit a full brief and continue to payment or quote."
          href="/creative-services"
          icon={Palette}
          cta="Order creative services"
          testId="action-design-project"
        />
        <ActionCard
          title="Book Maintenance Service"
          text="Request service and support for office machines and equipment from anywhere."
          href="/dashboard/maintenance"
          icon={Wrench}
          cta="Book service"
          testId="action-maintenance"
        />
        <ActionCard
          title="Pay Outstanding Invoice"
          text="Complete pending payments securely and keep your work moving without delays."
          href="/dashboard/invoices"
          icon={Receipt}
          cta="View invoices"
          testId="action-invoices"
        />
        <ActionCard
          title="Track My Orders"
          text="View your active, completed, and in-progress orders and stay updated."
          href="/dashboard/orders"
          icon={Package}
          cta="Open orders"
          testId="action-orders"
        />
        <ActionCard
          title="Review My Quotes"
          text="Preview, approve, and convert quotes into invoices from your portal."
          href="/dashboard/quotes"
          icon={FileText}
          cta="Open quotes"
          testId="action-quotes"
        />
        <ActionCard
          title="Refer & Earn Points"
          text="Invite clients and partners, earn points, and use them on future purchases and services."
          href="/dashboard/referrals"
          icon={Gift}
          cta="Open referrals"
          testId="action-referrals"
        />
      </div>
    </div>
  );
}
