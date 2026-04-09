import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, ShoppingBag, FileText, Receipt, 
  LogOut, Menu, X, RefreshCcw, Users, Building2, HelpCircle, Store, UserCircle, Wrench, ClipboardList
} from "lucide-react";
import NotificationBell from "../components/shared/NotificationBell";
import PartnerProfileDropdown from "../components/partners/PartnerProfileDropdown";
import BrandLogo from "../components/branding/BrandLogo";
import CartTopbarButton from "../components/topbar/CartTopbarButton";

const nav = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "Marketplace", href: "/account/marketplace", icon: Store },
  { label: "Services", href: "/account/services", icon: Wrench },
  { label: "My Orders", href: "/account/orders", icon: ShoppingBag },
  { label: "Quotes", href: "/account/quotes", icon: FileText },
  { label: "Invoices", href: "/account/invoices", icon: Receipt },
  { label: "Recurring Plans", href: "/account/recurring-plans", icon: RefreshCcw },
  { label: "Referrals & Rewards", href: "/account/referrals", icon: Users },
  { label: "My Statement", href: "/account/statement", icon: ClipboardList },
  { label: "My Account", href: "/account/my-account", icon: UserCircle },
  { label: "Help", href: "/help/customer", icon: HelpCircle },
];

import { clearAllAuth } from "../lib/authHelpers";

export default function CustomerPortalLayoutV2() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAllAuth();
    navigate("/login");
  };

  const customerName = (() => {
    try {
      const customer = JSON.parse(localStorage.getItem("customer") || "{}");
      return customer?.name || customer?.email?.split("@")[0] || "Customer";
    } catch {
      return "Customer";
    }
  })();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex" data-testid="customer-portal-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-100">
          <Link to="/" className="flex items-center" data-testid="sidebar-logo-link">
            <BrandLogo size="md" />
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/account" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#1f3a5f] text-white shadow-sm"
                    : item.highlight
                    ? "text-[#D4A843] hover:bg-amber-50"
                    : "text-slate-600 hover:bg-gray-100 hover:text-slate-900"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
                {item.highlight && !active && (
                  <span className="ml-auto text-[10px] bg-[#D4A843] text-white px-2 py-0.5 rounded-full font-semibold">EARN</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Business Pricing CTA */}
        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            to="/account/business-pricing"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 bg-[#1f3a5f] text-white text-sm font-medium hover:bg-[#162c47] transition-colors"
            data-testid="business-pricing-cta"
          >
            <Building2 className="w-[18px] h-[18px]" />
            Request Business Pricing
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden lg:block">
            <div className="text-sm font-semibold text-[#0f172a]">Customer Portal</div>
            <div className="text-xs text-[#64748b]">
              Manage orders, services, invoices, and rewards
            </div>
          </div>

          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden">
            <BrandLogo size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            <CartTopbarButton />
            <NotificationBell tokenKey="token" defaultRedirect="/account" />
            <PartnerProfileDropdown
              name={customerName}
              onLogout={handleLogout}
              menu={[
                { label: "Orders", href: "/account/orders" },
                { label: "Invoices", href: "/account/invoices" },
                { label: "Help", href: "/help/customer" },
              ]}
            />
          </div>
        </header>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 p-3 space-y-1" data-testid="mobile-nav">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.href ||
                (item.href !== "/account" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#1f3a5f] text-white"
                      : "text-slate-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div key={location.pathname} className="k-page-fade-in">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
