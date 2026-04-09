import {
  LayoutDashboard, ShoppingCart, FileText, CreditCard, Receipt,
  Columns3, Truck, CheckSquare, Contact, Target,
  Network, Megaphone, Wallet, Percent,
  Route, Inbox, BarChart3, ClipboardList, Package,
  Settings, Users, TrendingUp, MessageSquare, BadgePercent, PieChart,
  Trophy, ShieldAlert, DollarSign, Landmark,
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
  },
  {
    key: "commerce",
    label: "Commerce",
    roles: ["admin", "sales", "sales_manager", "finance_manager"],
    children: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, badgeKey: "orders" },
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
      { label: "Affiliate Payouts", href: "/admin/affiliate-payouts", icon: Wallet },
      { label: "Margin & Distribution", href: "/admin/distribution-margin", icon: Percent },
      { label: "Promotions", href: "/admin/promotion-engine", icon: TrendingUp },
      { label: "Content Center", href: "/admin/content-center", icon: MessageSquare },
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
      { label: "Product Insights", href: "/admin/product-insights", icon: BarChart3 },
      { label: "Sales Ratings", href: "/admin/sales-ratings", icon: PieChart },
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
