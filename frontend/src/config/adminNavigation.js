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
      { label: "Payment Proofs", href: "/admin/payment-proofs", moduleKey: "finance" },
    ],
  },
  {
    key: "services",
    label: "Services",
    moduleKey: "services",
    children: [
      { label: "Service Requests", href: "/admin/service-requests", moduleKey: "services" },
      { label: "Site Visits", href: "/admin/site-visits", moduleKey: "services" },
      { label: "Service Catalog", href: "/admin/service-builder", moduleKey: "services" },
      { label: "Blank Products", href: "/admin/blank-products", moduleKey: "services" },
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
      { label: "Delivery Partners", href: "/admin/delivery-partners", moduleKey: "partners" },
      { label: "Partner Performance", href: "/admin/partner-performance", moduleKey: "reports" },
    ],
  },
  {
    key: "growth",
    label: "Growth",
    moduleKey: "affiliates",
    children: [
      { label: "Affiliates & Campaigns", href: "/admin/affiliate-campaigns", moduleKey: "affiliates" },
      { label: "Product Insights", href: "/admin/product-insights", moduleKey: "reports" },
      { label: "Service Insights", href: "/admin/service-insights", moduleKey: "reports" },
    ],
  },
  {
    key: "team",
    label: "Team",
    moduleKey: "staff",
    children: [
      { label: "Staff Performance", href: "/admin/staff-performance", moduleKey: "staff" },
      { label: "Key Account Monitoring", href: "/admin/key-account-monitoring", moduleKey: "contracts" },
      { label: "SLA Alerts", href: "/admin/sla-alerts", moduleKey: "contracts" },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    moduleKey: "contracts",
    children: [
      { label: "Contract Clients", href: "/admin/contract-clients", moduleKey: "contracts" },
      { label: "Negotiated Pricing", href: "/admin/negotiated-pricing", moduleKey: "contracts" },
      { label: "Contract SLAs", href: "/admin/contract-slas", moduleKey: "contracts" },
      { label: "Recurring Plans", href: "/admin/recurring-invoice-plans", moduleKey: "contracts" },
    ],
  },
  {
    key: "configuration",
    label: "Configuration",
    moduleKey: "settings",
    children: [
      { label: "Business Settings", href: "/admin/business-settings", moduleKey: "settings" },
      { label: "Payment Settings", href: "/admin/payment-settings", moduleKey: "settings" },
      { label: "Auto-Numbering", href: "/admin/auto-numbering", moduleKey: "settings" },
      { label: "Markup Rules", href: "/admin/group-markups", moduleKey: "settings" },
      { label: "Commission Rules", href: "/admin/commission-rules", moduleKey: "settings" },
      { label: "Countries & Regions", href: "/admin/countries-regions", moduleKey: "geography" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    moduleKey: "inventory",
    children: [
      { label: "Products", href: "/admin/products", moduleKey: "inventory" },
      { label: "Warehouses", href: "/admin/warehouses", moduleKey: "inventory" },
      { label: "Stock Levels", href: "/admin/stock-levels", moduleKey: "inventory" },
    ],
  },
];
