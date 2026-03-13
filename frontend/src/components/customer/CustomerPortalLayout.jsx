import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileText,
  Receipt,
  MapPin,
  Gift,
  Coins,
  Palette,
  Wrench,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User,
  Settings,
  CreditCard,
} from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_konekt-promo/artifacts/ul37fyug_Konekt%20Logo-04.jpg";

const customerNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { type: "divider", label: "Orders & Quotes" },
  { path: "/dashboard/orders", label: "My Orders", icon: Package },
  { path: "/dashboard/quotes", label: "My Quotes", icon: FileText },
  { path: "/dashboard/invoices", label: "My Invoices", icon: Receipt },
  { type: "divider", label: "Services" },
  { path: "/dashboard/designs", label: "Design Projects", icon: Palette },
  { path: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
  { type: "divider", label: "Account" },
  { path: "/dashboard/addresses", label: "Address Book", icon: MapPin },
  { path: "/dashboard/statement", label: "My Statement", icon: CreditCard },
  { type: "divider", label: "Rewards" },
  { path: "/dashboard/referrals", label: "Referrals", icon: Gift },
  { path: "/dashboard/points", label: "My Points", icon: Coins },
];

export default function CustomerPortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && path !== "/dashboard";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="customer-portal-layout">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2D3E50] transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link to="/">
              <img src={LOGO_URL} alt="Konekt" className="h-10 brightness-0 invert" />
            </Link>
            <p className="text-white/50 text-xs mt-2">Client Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {customerNavItems.map((item, index) =>
              item.type === "divider" ? (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path, item.exact)
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#D4A843] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user?.full_name || user?.email || "User"}
                </p>
                <p className="text-white/50 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
              data-testid="customer-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="mobile-menu-toggle"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                {location.pathname !== "/dashboard" && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {location.pathname.split("/").pop().replace(/-/g, " ")}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/products">
                <Button variant="outline" size="sm" data-testid="shop-now-btn">
                  Shop Now
                </Button>
              </Link>
              <Link to="/creative-services">
                <Button size="sm" className="bg-[#D4A843] hover:bg-[#c49a3d]" data-testid="start-project-btn">
                  Start Project
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
