export const adminNavigation = [
  {
    key: "dashboard",
    label: "Dashboard",
    moduleKey: "dashboard",
    children: [
      { label: "Ecosystem Dashboard", href: "/admin/ecosystem-dashboard", moduleKey: "dashboard" },
    ],
  },
  {
    key: "commerce",
    label: "Orders",
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
    ],
  },
  {
    key: "customers",
    label: "Customers",
    moduleKey: "contracts",
    children: [
      { label: "Contract Clients", href: "/admin/contract-clients", moduleKey: "contracts" },
      { label: "Negotiated Pricing", href: "/admin/negotiated-pricing", moduleKey: "contracts" },
    ],
  },
  {
    key: "partners",
    label: "Vendors",
    moduleKey: "partners",
    children: [
      { label: "Partners", href: "/admin/partners", moduleKey: "partners" },
      { label: "Partner Applications", href: "/admin/country-partner-applications", moduleKey: "partners" },
      { label: "Partner Settlements", href: "/admin/partner-settlements", moduleKey: "finance" },
    ],
  },
  {
    key: "growth",
    label: "Affiliates",
    moduleKey: "affiliates",
    children: [
      { label: "Affiliates", href: "/admin/affiliate-partners", moduleKey: "affiliates" },
      { label: "Affiliate Payouts", href: "/admin/affiliate-payouts", moduleKey: "affiliates" },
      { label: "Margin & Distribution", href: "/admin/distribution-margin", moduleKey: "affiliates" },
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
      { label: "Settings Hub", href: "/admin/settings-hub", moduleKey: "settings" },
      { label: "Countries & Regions", href: "/admin/countries-regions", moduleKey: "geography" },
    ],
  },
];
