import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, ShoppingBag, FileText, Receipt, 
  Wrench, Gift, CreditCard, LogOut, Menu, X, User, ChevronDown, RefreshCcw, Users, Building2
} from "lucide-react";

const nav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Quotes", href: "/dashboard/quotes", icon: FileText },
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { label: "Service Requests", href: "/dashboard/service-requests", icon: Wrench },
  { label: "Recurring Plans", href: "/dashboard/recurring-plans", icon: RefreshCcw },
  { label: "Referrals & Rewards", href: "/dashboard/referrals", icon: Users, highlight: true },
  { label: "My Statement", href: "/dashboard/statement", icon: CreditCard },
];

export default function CustomerPortalLayoutV2() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customer");
    navigate("/");
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
    <div className="min-h-screen bg-slate-50 flex" data-testid="customer-portal-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] min-h-screen bg-white border-r">
        <div className="px-6 py-5 border-b">
          <Link to="/" className="text-2xl font-bold text-[#20364D]">Konekt</Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                  active
                    ? "bg-[#20364D] text-white"
                    : item.highlight
                    ? "text-[#D4A843] bg-amber-50 hover:bg-amber-100"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {item.highlight && !active && (
                  <span className="ml-auto text-[10px] bg-[#D4A843] text-white px-2 py-0.5 rounded-full">EARN</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Business Pricing CTA */}
        <div className="px-4 py-4 border-t">
          <Link
            to="/dashboard/business-pricing"
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 bg-gradient-to-r from-[#20364D] to-[#2a4a66] text-white font-medium hover:opacity-90 transition"
            data-testid="business-pricing-cta"
          >
            <Building2 className="w-5 h-5" />
            <span>Request Business Pricing</span>
          </Link>
        </div>

        <div className="px-4 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 transition font-medium"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="hidden lg:block">
            <div className="font-semibold text-[#20364D]">Customer Portal</div>
            <div className="text-sm text-slate-500">
              Manage orders, services, invoices, and rewards
            </div>
          </div>

          <Link to="/" className="lg:hidden text-xl font-bold text-[#20364D]">
            Konekt
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {customerName}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b p-4 space-y-1" data-testid="mobile-nav">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.href ||
                (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                    active
                      ? "bg-[#20364D] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-red-600 hover:bg-red-50 transition font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
