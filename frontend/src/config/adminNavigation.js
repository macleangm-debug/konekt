import {
  LayoutDashboard, ShoppingCart, FileText, CreditCard, Receipt,
  Columns3, Truck, CheckSquare, Contact, Target,
  Network, Megaphone, Wallet, Percent,
  Route, Inbox, BarChart3, ClipboardList, Package,
  Settings, Users, BadgePercent, PieChart,
  Trophy, ShieldAlert, DollarSign, Landmark,
  Activity, Star, Gauge, CalendarDays, Bell, Palette, Shield,
} from "lucide-react";

/**
 * Canonical Admin Sidebar Navigation — single source of truth.
 * AdminLayout.js renders directly from this config.
 *
 * Structure: grouped sections with children.
 * Each child: { label, href, icon, badgeKey? }
 * Each section may have `roles` — if set, only those roles see it.
 * Admin always sees everything.
 */

const ALL_MGMT = ["admin", "sales", "sales_manager", "finance_manager", "marketing", "production"];

export const adminNavigation = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    exact: true,
    roles: ["admin", "sales_manager", "finance_manager", "sales", "marketing", "production"],
  },
  {
    key: "commerce",
    label: "Commerce",
    roles: ["admin", "sales", "sales_manager", "finance_manager"],
    children: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, badgeKey: "orders" },
      { label: "Walk-in Sale", href: "/admin/walk-in-sale", icon: CreditCard, roles: ["admin", "sales_manager", "sales_rep"] },
      { label: "Group Deals", href: "/admin/group-deals", icon: Users, roles: ["admin", "sales_manager"] },
      { label: "Quotes", href: "/admin/quotes", icon: FileText },
      { label: "Payments", href: "/admin/payments", icon: CreditCard, badgeKey: "payments_queue" },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
      { label: "Discount Requests", href: "/admin/discount-requests", icon: BadgePercent, badgeKey: "discount_requests" },
      { label: "Discount Analytics", href: "/admin/discount-analytics", icon: PieChart },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    roles: ["admin", "marketing"],
    children: [
      { label: "Catalog", href: "/admin/catalog", icon: Columns3 },
      { label: "Product Approvals", href: "/admin/product-approvals", icon: CheckSquare },
      { label: "Vendors", href: "/admin/vendors", icon: Truck },
      { label: "Supply Review", href: "/admin/vendor-supply-review", icon: CheckSquare },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    roles: ["admin", "sales", "sales_manager"],
    children: [
      { label: "Customers", href: "/admin/customers", icon: Contact },
      { label: "CRM", href: "/admin/crm", icon: Target },
    ],
  },
  {
    key: "partners",
    label: "Partners",
    roles: ["admin"],
    children: [
      { label: "Partner Ecosystem", href: "/admin/partner-ecosystem", icon: Network },
    ],
  },
  {
    key: "growth",
    label: "Growth & Affiliates",
    roles: ["admin", "marketing"],
    children: [
      { label: "Affiliates", href: "/admin/partnerships/affiliates", icon: Megaphone },
      { label: "Applications", href: "/admin/affiliate-applications", icon: ClipboardList },
      { label: "Affiliate Payouts", href: "/admin/affiliate-payouts", icon: Wallet },
      { label: "Promotions Manager", href: "/admin/promotions-manager", icon: BadgePercent },
      { label: "Content Studio", href: "/admin/content-studio", icon: Palette },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    roles: ["admin", "finance_manager"],
    children: [
      { label: "Cash Flow", href: "/admin/finance/cash-flow", icon: Landmark },
      { label: "Commissions", href: "/admin/finance/commissions", icon: DollarSign },
    ],
  },
  {
    key: "team",
    label: "Team / Performance",
    roles: ["admin", "sales_manager"],
    children: [
      { label: "Team Overview", href: "/admin/team/overview", icon: Users },
      { label: "Leaderboard", href: "/admin/team/leaderboard", icon: Trophy },
      { label: "Alerts", href: "/admin/team/alerts", icon: ShieldAlert },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    roles: ["admin", "production"],
    children: [
      { label: "Deliveries", href: "/admin/deliveries", icon: Route, badgeKey: "deliveries" },
      { label: "Delivery Notes", href: "/admin/delivery-notes", icon: ClipboardList },
      { label: "Purchase Orders", href: "/admin/procurement/purchase-orders", icon: Package },
      { label: "Requests", href: "/admin/requests-inbox", icon: Inbox, badgeKey: "requests_inbox" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    roles: ["admin", "sales_manager", "finance_manager"],
    children: [
      { label: "Business Health", href: "/admin/reports/business-health", icon: Activity, roles: ["admin", "sales_manager", "finance_manager"] },
      { label: "Financial Reports", href: "/admin/reports/financial", icon: DollarSign, roles: ["admin", "finance_manager"] },
      { label: "Sales Reports", href: "/admin/reports/sales", icon: BarChart3, roles: ["admin", "sales_manager"] },
      { label: "Customer Experience", href: "/admin/sales-ratings", icon: Star, roles: ["admin", "sales_manager"] },
      { label: "Risk & Governance", href: "/admin/discount-analytics", icon: ShieldAlert, roles: ["admin", "finance_manager"] },
      { label: "Product Insights", href: "/admin/product-insights", icon: Gauge, roles: ["admin"] },
      { label: "Inventory Intelligence", href: "/admin/reports/inventory", icon: Package, roles: ["admin", "sales_manager", "finance_manager"] },
      { label: "Weekly Performance", href: "/admin/reports/weekly-performance", icon: CalendarDays, roles: ["admin", "sales_manager", "finance_manager"] },
      { label: "Weekly Digest", href: "/admin/weekly-digest", icon: FileText, roles: ["admin"] },
      { label: "Data Integrity", href: "/admin/data-integrity", icon: Shield, roles: ["admin"] },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["admin", "finance_manager"] },
      { label: "Action Center", href: "/admin/reports/alerts", icon: Bell, roles: ["admin", "sales_manager", "finance_manager"] },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    roles: ["admin"],
    children: [
      { label: "Settings Hub", href: "/admin/settings-hub", icon: Settings },
      { label: "Users", href: "/admin/users", icon: Users },
    ],
  },
];
