import {
  LayoutDashboard, ShoppingCart, FileText, CreditCard, Receipt,
  Columns3, CheckSquare, Contact, Target,
  Network, Megaphone, Wallet,
  Route, Inbox, BarChart3, ClipboardList, Package,
  Settings, Users, BadgePercent, PieChart,
  Trophy, ShieldAlert, DollarSign,
  Activity, Star, Gauge, CalendarDays, Bell, Palette, Shield, Wrench, MapPin,
  MessageCircle, Truck, Banknote, ShieldCheck, UserCog,
} from "lucide-react";

/**
 * Canonical Admin Sidebar — organized by business flow.
 * CRM → Quotes → Invoices → Payments → Orders → Fulfillment
 */

const ALL_MGMT = ["admin", "sales", "sales_manager", "finance_manager", "marketing", "production", "vendor_ops", "staff"];

export const adminNavigation = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    exact: true,
    roles: ALL_MGMT,
  },
  {
    key: "crm_sales",
    label: "CRM & Sales Pipeline",
    roles: ["admin", "sales", "sales_manager", "finance_manager"],
    children: [
      { label: "CRM", href: "/admin/crm", icon: Target },
      { label: "Requests Inbox", href: "/admin/requests-inbox", icon: Inbox, badgeKey: "requests_inbox" },
      { label: "Quotes", href: "/admin/quotes", icon: FileText },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, badgeKey: "orders" },
      { label: "Delivery Notes", href: "/admin/delivery-notes", icon: ClipboardList },
      { label: "Walk-in Sale", href: "/admin/walk-in-sale", icon: CreditCard, roles: ["admin", "sales_manager"] },
    ],
  },
  {
    key: "payments",
    label: "Payments & Finance",
    roles: ["admin", "finance_manager", "sales_manager"],
    children: [
      { label: "Payment Review", href: "/admin/payments", icon: CreditCard, badgeKey: "payments_queue" },
      { label: "Commission Engine", href: "/admin/commission-engine", icon: DollarSign },
      { label: "Affiliate Commissions", href: "/admin/affiliate-commissions", icon: DollarSign },
      { label: "Affiliate Payouts", href: "/admin/affiliate-payouts", icon: Wallet },
      { label: "Vendor Payables", href: "/admin/vendor-payables", icon: Banknote },
      { label: "Discount Requests", href: "/admin/discount-requests", icon: BadgePercent, badgeKey: "discount_requests" },
    ],
  },
  {
    key: "catalog",
    label: "Catalog & Supply",
    roles: ["admin", "marketing", "vendor_ops"],
    children: [
      { label: "Catalog", href: "/admin/catalog", icon: Columns3 },
      { label: "Vendors", href: "/admin/vendors", icon: Truck },
      { label: "Vendor Agreements", href: "/admin/vendor-agreements", icon: ShieldCheck },
      { label: "Vendor Assignments", href: "/admin/vendor-assignments", icon: Network, roles: ["admin", "vendor_ops"] },
      { label: "Partner Ecosystem", href: "/admin/partner-ecosystem", icon: Network },
      { label: "Product Approvals", href: "/admin/product-approvals", icon: CheckSquare },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    roles: ["admin", "sales", "sales_manager"],
    children: [
      { label: "Customers", href: "/admin/customers", icon: Contact },
    ],
  },
  {
    key: "growth",
    label: "Campaigns & Growth",
    roles: ["admin", "marketing", "sales_manager"],
    children: [
      { label: "Group Deals", href: "/admin/group-deals", icon: Users },
      { label: "Affiliates", href: "/admin/partnerships/affiliates", icon: Megaphone },
      { label: "Applications", href: "/admin/affiliate-applications", icon: ClipboardList },
      { label: "Promotions", href: "/admin/promotions-manager", icon: BadgePercent },
      { label: "Content Studio", href: "/admin/content-studio", icon: Palette },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    roles: ["admin", "production", "vendor_ops"],
    children: [
      { label: "Orders & Fulfillment", href: "/admin/vendor-ops", icon: Wrench, roles: ["admin", "vendor_ops"] },
      { label: "Site Visits", href: "/admin/site-visits", icon: MapPin, roles: ["admin", "vendor_ops"] },
      { label: "Deliveries", href: "/admin/deliveries", icon: Route, badgeKey: "deliveries" },
      { label: "Purchase Orders", href: "/admin/procurement/purchase-orders", icon: Package },
      { label: "Supply Review", href: "/admin/vendor-supply-review", icon: CheckSquare, roles: ["admin", "vendor_ops"] },
      { label: "Vendor Assignments", href: "/admin/vendor-assignments", icon: Truck, roles: ["admin", "vendor_ops"] },
    ],
  },
  {
    key: "team",
    label: "Team & Performance",
    roles: ["admin", "sales_manager"],
    children: [
      { label: "Team Overview", href: "/admin/team/overview", icon: Users },
      { label: "Leaderboard", href: "/admin/team/leaderboard", icon: Trophy },
      { label: "Customer Ratings", href: "/admin/sales-ratings", icon: Star },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    roles: ["admin", "sales_manager", "finance_manager"],
    children: [
      { label: "Business Health", href: "/admin/reports/business-health", icon: Activity },
      { label: "Financial", href: "/admin/reports/financial", icon: DollarSign, roles: ["admin", "finance_manager"] },
      { label: "Sales", href: "/admin/reports/sales", icon: BarChart3, roles: ["admin", "sales_manager"] },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Product Insights", href: "/admin/product-insights", icon: Gauge, roles: ["admin"] },
      { label: "Weekly Digest", href: "/admin/weekly-digest", icon: CalendarDays, roles: ["admin"] },
      { label: "Data Integrity", href: "/admin/data-integrity", icon: Shield, roles: ["admin"] },
      { label: "Country Reports", href: "/admin/country-reports", icon: PieChart, roles: ["admin"] },
      { label: "Feedback Inbox", href: "/admin/feedback-inbox", icon: MessageCircle, roles: ["admin"], badgeKey: "feedback_new" },
    ],
  },
  {
    key: "settings",
    label: "People & Control",
    roles: ["admin"],
    children: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Partner Ecosystem", href: "/admin/partner-ecosystem", icon: Network },
      { label: "Impersonation Log", href: "/admin/impersonation-log", icon: UserCog, roles: ["admin"] },
      { label: "Settings Hub", href: "/admin/settings-hub", icon: Settings },
    ],
  },
];
