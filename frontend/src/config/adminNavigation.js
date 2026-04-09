import {
  LayoutDashboard, ShoppingCart, FileText, CreditCard, Receipt,
  Columns3, Truck, CheckSquare, Contact, Target,
  Network, Megaphone, Wallet, Percent,
  Route, Inbox, BarChart3, ClipboardList, Package,
  Settings, Users, TrendingUp, MessageSquare, BadgePercent, PieChart,
} from "lucide-react";

/**
 * Canonical Admin Sidebar Navigation — single source of truth.
 * AdminLayout.js renders directly from this config.
 *
 * Structure: grouped sections with children.
 * Each child: { label, href, icon, badgeKey? }
 */
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
    children: [
      { label: "Catalog", href: "/admin/catalog", icon: Columns3 },
      { label: "Vendors", href: "/admin/vendors", icon: Truck },
      { label: "Supply Review", href: "/admin/vendor-supply-review", icon: CheckSquare },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    children: [
      { label: "Customers", href: "/admin/customers", icon: Contact },
      { label: "CRM", href: "/admin/crm", icon: Target },
    ],
  },
  {
    key: "partners",
    label: "Partners",
    children: [
      { label: "Partner Ecosystem", href: "/admin/partner-ecosystem", icon: Network },
    ],
  },
  {
    key: "growth",
    label: "Growth & Affiliates",
    children: [
      { label: "Affiliates", href: "/admin/partnerships/affiliates", icon: Megaphone },
      { label: "Affiliate Payouts", href: "/admin/affiliate-payouts", icon: Wallet },
      { label: "Margin & Distribution", href: "/admin/distribution-margin", icon: Percent },
      { label: "Promotions", href: "/admin/promotion-engine", icon: TrendingUp },
      { label: "Content Center", href: "/admin/content-center", icon: MessageSquare },
    ],
  },
  {
    key: "operations",
    label: "Operations",
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
    children: [
      { label: "Product Insights", href: "/admin/product-insights", icon: BarChart3 },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    children: [
      { label: "Settings Hub", href: "/admin/settings-hub", icon: Settings },
      { label: "Users", href: "/admin/users", icon: Users },
    ],
  },
];
