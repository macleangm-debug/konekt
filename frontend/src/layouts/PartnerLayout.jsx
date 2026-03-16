import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Upload, Truck, Receipt, LogOut, Menu, X, ListPlus } from "lucide-react";
import partnerApi from "../lib/partnerApi";

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

  const navItems = [
    { path: "/partner", label: "Dashboard", icon: LayoutDashboard },
    { path: "/partner/catalog", label: "My Catalog", icon: Package },
    { path: "/partner/stock", label: "Stock Table", icon: ListPlus },
    { path: "/partner/bulk-upload", label: "Bulk Upload", icon: Upload },
    { path: "/partner/fulfillment", label: "Fulfillment Queue", icon: Truck },
    { path: "/partner/settlements", label: "Settlements", icon: Receipt },
  ];

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
          <div className="w-10 h-10 rounded-xl bg-[#20364D] flex items-center justify-center text-white font-bold">
            K
          </div>
          <div>
            <div className="text-xl font-bold text-[#20364D]">Partner Portal</div>
            <div className="text-xs text-slate-500">{partner?.name || "Loading..."}</div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
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

        <div className="absolute bottom-6 left-5 right-5">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
            data-testid="partner-logout-btn"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
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
        <Outlet />
      </main>
    </div>
  );
}
