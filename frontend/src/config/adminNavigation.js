export const adminNavigation = [
  {
    key: "dashboard",
    label: "Dashboard",
    moduleKey: "dashboard",
    children: [
      { label: "Ecosystem Dashboard", href: "/admin/ecosystem-dashboard", moduleKey: "dashboard" },
      { label: "Supervisor Dashboard", href: "/admin/supervisor-dashboard", moduleKey: "dashboard" },
    ],
  },
  {
    key: "commerce",
    label: "Commerce",
    moduleKey: "sales",
    children: [
      { label: "Orders", href: "/admin/orders", moduleKey: "sales" },
      { label: "Quotes", href: "/admin/quotes", moduleKey: "sales" },
      { label: "Invoices", href: "/admin/invoices", moduleKey: "finance" },
      { label: "Payments", href: "/admin/payments", moduleKey: "finance" },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    moduleKey: "inventory",
    children: [
      { label: "Products", href: "/admin/products", moduleKey: "inventory" },
      { label: "Service Catalog", href: "/admin/service-builder", moduleKey: "services" },
      { label: "Blank Products", href: "/admin/blank-products", moduleKey: "services" },
      { label: "Warehouses", href: "/admin/warehouses", moduleKey: "inventory" },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    moduleKey: "contracts",
    children: [
      { label: "Contract Clients", href: "/admin/contract-clients", moduleKey: "contracts" },
      { label: "Negotiated Pricing", href: "/admin/negotiated-pricing", moduleKey: "contracts" },
      { label: "Key Account Monitoring", href: "/admin/key-account-monitoring", moduleKey: "contracts" },
    ],
  },
  {
    key: "partners",
    label: "Partners",
    moduleKey: "partners",
    children: [
      { label: "Partners", href: "/admin/partners", moduleKey: "partners" },
      { label: "Partner Applications", href: "/admin/country-partner-applications", moduleKey: "partners" },
      { label: "Partner Settlements", href: "/admin/partner-settlements", moduleKey: "finance" },
      { label: "Partner Performance", href: "/admin/partner-performance", moduleKey: "reports" },
    ],
  },
  {
    key: "growth",
    label: "Growth & Affiliates",
    moduleKey: "affiliates",
    children: [
      { label: "Affiliates", href: "/admin/affiliate-partners", moduleKey: "affiliates" },
      { label: "Margin & Distribution", href: "/admin/distribution-margin", moduleKey: "affiliates" },
      { label: "Promotions", href: "/admin/promotion-engine", moduleKey: "affiliates" },
    ],
  },
  {
    key: "team",
    label: "Team",
    moduleKey: "staff",
    children: [
      { label: "Staff Performance", href: "/admin/staff-performance", moduleKey: "staff" },
      { label: "SLA Alerts", href: "/admin/sla-alerts", moduleKey: "contracts" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    moduleKey: "reports",
    children: [
      { label: "Product Insights", href: "/admin/product-insights", moduleKey: "reports" },
      { label: "Service Insights", href: "/admin/service-insights", moduleKey: "reports" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    moduleKey: "settings",
    children: [
      { label: "Business Settings", href: "/admin/business-settings", moduleKey: "settings" },
      { label: "Payment Settings", href: "/admin/payment-settings", moduleKey: "settings" },
      { label: "Notification Settings", href: "/admin/notification-settings", moduleKey: "settings" },
      { label: "Auto-Numbering", href: "/admin/auto-numbering", moduleKey: "settings" },
      { label: "Countries & Regions", href: "/admin/countries-regions", moduleKey: "geography" },
    ],
  },
];
