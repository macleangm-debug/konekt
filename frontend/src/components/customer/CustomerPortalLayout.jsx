import React, { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileText,
  Palette,
  Receipt,
  Gift,
  Coins,
  MapPin,
  Wrench,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  PenTool,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import BrandLogo from "../branding/BrandLogo";

const navItems = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard, exact: true },
  { type: "divider", label: "Orders & Sales" },
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Quotes", href: "/account/quotes", icon: FileText },
  { label: "Invoices", href: "/account/invoices", icon: Receipt },
  { type: "divider", label: "Services" },
  { label: "Designs", href: "/account/designs", icon: Palette },
  { label: "Service Requests", href: "/account/service-requests", icon: ClipboardList },
  { label: "Maintenance", href: "/account/maintenance", icon: Wrench },
  { type: "divider", label: "Account" },
  { label: "Statement", href: "/account/statement", icon: FileBarChart2 },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { type: "divider", label: "Rewards" },
  { label: "Referrals", href: "/account/referrals", icon: Gift },
  { label: "Points", href: "/account/points", icon: Coins },
];

export default function CustomerPortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="customer-portal-layout">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-white border-r transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-gray-100">
            <Link to="/">
              <BrandLogo size="md" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) =>
              item.type === "divider" ? (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              ) : (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#2D3E50] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            )}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#D4A843] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {user?.full_name || user?.email || "User"}
                </p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              data-testid="customer-logout-btn"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
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
      <div className="flex-1 lg:ml-[270px] min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="mobile-menu-toggle"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <BrandLogo size="sm" className="hidden md:flex" />
            </div>

            <div className="flex items-center gap-3">
              <Link to="/products">
                <Button variant="outline" size="sm" className="hidden sm:flex" data-testid="shop-now-btn">
                  <ShoppingBag size={16} className="mr-2" />
                  Shop Now
                </Button>
              </Link>
              <Link to="/creative-services">
                <Button size="sm" className="bg-[#D4A843] hover:bg-[#c49a3d]" data-testid="start-project-btn">
                  <PenTool size={16} className="mr-2" />
                  Start Project
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
