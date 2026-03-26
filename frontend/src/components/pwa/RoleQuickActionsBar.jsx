import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ShoppingBag, Wrench, User, Briefcase, DollarSign, 
  LayoutDashboard, AlertCircle, Users, Target, Clipboard
} from "lucide-react";

/**
 * Get role-specific quick actions for bottom nav bar
 */
function getActions(role) {
  switch (role) {
    case "sales":
      return [
        { label: "Queue", href: "/staff/opportunities", icon: Target },
        { label: "Follow-ups", href: "/staff/alerts", icon: AlertCircle },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "operations":
      return [
        { label: "Tasks", href: "/staff/operations-tasks", icon: Clipboard },
        { label: "Deliveries", href: "/admin/delivery-notes", icon: ShoppingBag },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "supervisor":
      return [
        { label: "Team", href: "/admin/staff-performance", icon: Users },
        { label: "Alerts", href: "/admin/sla-alerts", icon: AlertCircle },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "partner":
    case "delivery_partner":
      return [
        { label: "My Orders", href: "/partner/orders", icon: Briefcase },
        { label: "Settlements", href: "/partner/settlements", icon: DollarSign },
        { label: "Profile", href: "/partner/profile", icon: User },
      ];
    case "affiliate":
      return [
        { label: "Dashboard", href: "/partner/affiliate-dashboard", icon: LayoutDashboard },
        { label: "Earnings", href: "/partner/affiliate-dashboard", icon: DollarSign },
        { label: "Profile", href: "/partner/profile", icon: User },
      ];
    case "admin":
    case "super_admin":
      return [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Approvals", href: "/admin/payment-proofs", icon: Clipboard },
        { label: "Config", href: "/admin/configuration", icon: User },
      ];
    default:
      // Customer
      return [
        { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
        { label: "Services", href: "/dashboard/services", icon: Wrench },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
  }
}

/**
 * RoleQuickActionsBar - Mobile bottom navigation with role-specific shortcuts
 * Only visible on mobile (< lg breakpoint)
 * 
 * Props:
 * - user: { role: string } - current user object
 */
export default function RoleQuickActionsBar({ user }) {
  const location = useLocation();
  const actions = getActions(user?.role || "customer");

  return (
    <div 
      className="fixed bottom-0 inset-x-0 z-[80] bg-white border-t lg:hidden safe-area-bottom"
      data-testid="role-quick-actions-bar"
    >
      <div className="grid grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href + item.label}
              to={item.href}
              className={`py-3 flex flex-col items-center gap-1 text-center transition ${
                isActive 
                  ? "text-[#D4A843] bg-amber-50" 
                  : "text-slate-600 hover:text-[#20364D] hover:bg-slate-50"
              }`}
              data-testid={`quick-action-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
