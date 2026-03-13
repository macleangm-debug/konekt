export const adminNavigation = [
  {
    key: "overview",
    label: "Overview",
    moduleKey: "dashboard",
    children: [
      { label: "Dashboard", href: "/admin", moduleKey: "dashboard" },
      { label: "Launch Readiness", href: "/admin/launch-readiness", moduleKey: "settings" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    moduleKey: "crm",
    children: [
      { label: "CRM", href: "/admin/crm", moduleKey: "crm" },
      { label: "Quotes", href: "/admin/quotes", moduleKey: "quotes" },
      { label: "Customers", href: "/admin/customers", moduleKey: "customers" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    moduleKey: "orders",
    children: [
      { label: "Orders", href: "/admin/orders", moduleKey: "orders" },
      { label: "Order Operations", href: "/admin/orders-ops", moduleKey: "orders" },
      { label: "Production", href: "/admin/production", moduleKey: "production" },
      { label: "Tasks", href: "/admin/tasks", moduleKey: "tasks" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    moduleKey: "inventory",
    children: [
      { label: "Products", href: "/admin/products", moduleKey: "inventory" },
      { label: "Inventory & Variants", href: "/admin/inventory", moduleKey: "inventory" },
      { label: "Stock Movements", href: "/admin/inventory/movements", moduleKey: "inventory" },
      { label: "Transfers", href: "/admin/inventory/transfers", moduleKey: "inventory" },
      { label: "Warehouses", href: "/admin/warehouses", moduleKey: "inventory" },
      { label: "Raw Materials", href: "/admin/raw-materials", moduleKey: "inventory" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    moduleKey: "finance",
    children: [
      { label: "Invoices", href: "/admin/invoices", moduleKey: "finance" },
      { label: "Central Payments", href: "/admin/central-payments", moduleKey: "finance" },
      { label: "Record Payment", href: "/admin/payments/record", moduleKey: "finance" },
      { label: "Statements", href: "/admin/statements", moduleKey: "finance" },
      { label: "Document Flow", href: "/admin/workflow", moduleKey: "finance" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    moduleKey: "marketing",
    children: [
      { label: "Hero Banners", href: "/admin/hero-banners", moduleKey: "marketing" },
      { label: "Creative Services", href: "/admin/creative-services", moduleKey: "marketing" },
      { label: "Referral Settings", href: "/admin/referral-settings", moduleKey: "marketing" },
      { label: "Affiliates", href: "/admin/affiliates", moduleKey: "marketing" },
      { label: "Affiliate Applications", href: "/admin/affiliate-applications", moduleKey: "marketing" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    moduleKey: "settings",
    children: [
      { label: "Company Settings", href: "/admin/settings/company", moduleKey: "settings" },
      { label: "Setup", href: "/admin/setup", moduleKey: "settings" },
      { label: "Users", href: "/admin/users", moduleKey: "settings" },
      { label: "Audit Log", href: "/admin/audit", moduleKey: "audit" },
    ],
  },
];
