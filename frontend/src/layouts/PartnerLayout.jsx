import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Upload, Truck, Receipt, Menu, X, ListPlus, PlusCircle, TrendingUp, Award, DollarSign, Wallet, User, BarChart3, Briefcase, HelpCircle } from "lucide-react";
import partnerApi from "../lib/partnerApi";
import NotificationBell from "../components/shared/NotificationBell";
import PartnerAccountTopbar from "../components/layout/PartnerAccountTopbar";
import BrandLogo from "../components/branding/BrandLogo";

export default function PartnerLayout() {
  const [partner, setPartner] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("partner_token");
    if (!token) {
      navigate("/partner-login");
      return;
    }
    
    partnerApi.get("/api/partner-portal/dashboard")
      .then(res => setPartner(res.data?.partner))
      .catch(() => {
        localStorage.removeItem("partner_token");
        navigate("/partner-login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("partner_token");
    navigate("/partner-login");
  };

  // Determine partner type from partner data
  const isAffiliate = partner?.type === "affiliate" || partner?.role === "affiliate";
  const isVendor = partner?.type === "vendor" || partner?.role === "vendor";

  // Base nav items for product partners
  const productPartnerItems = [
    { path: "/partner", label: "Dashboard", icon: LayoutDashboard },
    { path: "/partner/catalog", label: "My Catalog", icon: Package },
    { path: "/partner/catalog/new", label: "Create Listing", icon: PlusCircle },
    { path: "/partner/stock", label: "Stock Table", icon: ListPlus },
    { path: "/partner/bulk-upload", label: "Bulk Upload", icon: Upload },
    { path: "/partner/fulfillment", label: "My Orders", icon: Truck },
    { path: "/partner/settlements", label: "Settlements", icon: Receipt },
  ];

  // Affiliate-specific nav items
  const affiliateItems = [
    { path: "/partner/affiliate-dashboard", label: "Affiliate Dashboard", icon: LayoutDashboard },
    { path: "/partner/affiliate-promotions", label: "Promotions", icon: TrendingUp },
    { path: "/partner/affiliate-sales", label: "Sales", icon: Award },
    { path: "/partner/affiliate-earnings", label: "Earnings", icon: DollarSign },
    { path: "/partner/affiliate-payouts", label: "Payouts", icon: Wallet },
    { path: "/partner/affiliate-performance", label: "Performance", icon: BarChart3 },
    { path: "/partner/affiliate-profile", label: "Profile", icon: User },
    { path: "/partner/affiliate-help", label: "Help", icon: HelpCircle },
  ];

  // Vendor-specific nav items
  const vendorItems = [
    { path: "/partner/vendor-dashboard", label: "Vendor Dashboard", icon: Briefcase },
    { path: "/partner/vendor-help", label: "Help", icon: HelpCircle },
  ];

  // Combine items based on partner type, defaulting to product partner view
  let navItems = [...productPartnerItems];
  
  // Add affiliate section only for affiliate partners
  if (isAffiliate) {
    navItems = [...navItems, { divider: true, label: "Affiliate" }, ...affiliateItems];
  }
  
  // Add vendor section if applicable
  if (isVendor || !isAffiliate) {
    navItems = [...navItems, { divider: true, label: "Vendor" }, ...vendorItems];
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="partner-layout">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        data-testid="partner-mobile-menu-btn"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[280px] min-h-screen bg-white border-r px-5 py-6 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="partner-sidebar"
      >
        <div className="flex items-center gap-3 px-3 mb-8">
          <BrandLogo size="md" />
          <div className="flex-1">
            <div className="text-xs text-slate-500">{partner?.name || "Loading..."}</div>
          </div>
          <NotificationBell tokenKey="partner_token" defaultRedirect="/partner" />
        </div>

        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={`divider-${idx}`} className="pt-4 pb-2 px-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</div>
                </div>
              );
            }
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-[#20364D] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                data-testid={`partner-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <PartnerAccountTopbar onLogout={logout} />
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
