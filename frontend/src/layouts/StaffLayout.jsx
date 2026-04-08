import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Users, Megaphone, DollarSign,
  Menu, X, ChevronRight, LogOut, Settings,
} from "lucide-react";
import { useStaffAuth } from "../contexts/StaffAuthContext";
import NotificationBell from "../components/shared/NotificationBell";
import BrandLogo from "../components/branding/BrandLogo";

const staffNavItems = [
  { path: "/staff", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/staff/orders", label: "Orders", icon: ShoppingCart },
  { path: "/staff/portfolio", label: "Customers", icon: Users },
  { path: "/staff/promotions", label: "Promotions", icon: Megaphone },
  { path: "/staff/commission-dashboard", label: "Earnings", icon: DollarSign },
];

export default function StaffLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { staff, logout } = useStaffAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path || location.pathname === "/staff/home";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/staff-login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="staff-layout">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="staff-sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-gray-100">
            <BrandLogo size="md" />
            <p className="text-slate-400 text-xs mt-2 tracking-wide">Sales Workspace</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" data-testid="staff-nav">
            {staffNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-[#1f3a5f] text-white shadow-sm"
                      : "text-slate-600 hover:bg-gray-100 hover:text-slate-900"
                  }`}
                  data-testid={`staff-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-bold">
                  {staff?.full_name?.charAt(0) || "S"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#20364D] font-medium truncate text-sm">
                  {staff?.full_name || "Staff"}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-blue-100 text-blue-700">
                  {staff?.role || "sales"}
                </span>
              </div>
            </div>
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
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="staff-mobile-menu-btn"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sales</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {location.pathname === "/staff" || location.pathname === "/staff/home"
                    ? "Dashboard"
                    : location.pathname.split("/").pop()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              {/* Profile quick menu */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                data-testid="staff-logout-btn"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
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
