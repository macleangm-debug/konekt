export const ROLE_MODULE_ACCESS = {
  super_admin: ["overview", "crm", "quotes", "invoices", "orders", "tasks", "inventory", "finance", "marketing", "support", "reports", "settings", "partners"],
  admin: ["overview", "crm", "quotes", "invoices", "orders", "tasks", "inventory", "finance", "marketing", "support", "reports", "settings", "partners"],
  supervisor: ["overview", "crm", "quotes", "invoices", "orders", "tasks", "support", "reports"],
  sales: ["overview", "crm", "quotes", "orders", "tasks", "support"],
  production: ["overview", "tasks", "inventory", "orders"],
  finance: ["overview", "invoices", "finance", "reports"],
  marketing: ["overview", "marketing", "reports"],
  support: ["overview", "support", "tasks", "orders"],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Administrator",
  supervisor: "Supervisor",
  sales: "Sales",
  production: "Production",
  finance: "Finance",
  marketing: "Marketing",
  support: "Support",
};
