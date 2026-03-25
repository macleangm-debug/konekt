import api from "./api";

const adminApi = {
  // ═══ NEW FACADE (admin_facade_routes.py /api/admin/*) ═══
  getDashboardSummary: () => api.get("/api/admin/dashboard/summary"),
  getPendingActions: () => api.get("/api/admin/dashboard/pending-actions"),

  // Payments (facade)
  getPaymentsQueue: (params) => api.get("/api/admin/payments/queue", { params }),
  getPaymentDetail: (id) => api.get(`/api/admin/payments/${id}`),
  approvePayment: (id, payload) => api.post(`/api/admin/payments/${id}/approve`, payload),
  rejectPayment: (id, payload) => api.post(`/api/admin/payments/${id}/reject`, payload),

  // Invoices (facade)
  getInvoices: (params) => api.get("/api/admin/invoices/list", { params }),
  getInvoiceDetail: (id) => api.get(`/api/admin/invoices/${id}`),

  // Orders (facade)
  getOrders: (params) => api.get("/api/admin/orders/list", { params }),
  getOrderDetail: (id) => api.get(`/api/admin/orders/${id}`),
  releaseToVendor: (id, payload) => api.post(`/api/admin/orders/${id}/release-to-vendor`, payload),
  updateOrderStatus: (id, payload) => api.post(`/api/admin/orders/${id}/update-status`, payload),

  // Quotes (facade)
  getQuotes: (params) => api.get("/api/admin/quotes/list", { params }),

  // Sales CRM (facade)
  getSalesCrmLeads: (params) => api.get("/api/admin/sales-crm/leads", { params }),
  getSalesCrmAccounts: (params) => api.get("/api/admin/sales-crm/accounts", { params }),
  getSalesCrmPerformance: () => api.get("/api/admin/sales-crm/performance"),
  assignLead: (payload) => api.post("/api/admin/sales-crm/assign-lead", payload),
  updateLeadStatusFacade: (payload) => api.post("/api/admin/sales-crm/update-lead-status", payload),

  // Customers (facade)
  getCustomersList: (params) => api.get("/api/admin/customers/list", { params }),
  getCustomerDetail: (id) => api.get(`/api/admin/customers/detail/${id}`),
  assignSalesToCustomer: (id, payload) => api.post(`/api/admin/customers/${id}/assign-sales`, payload),

  // Vendors (facade)
  getVendorsList: (params) => api.get("/api/admin/vendors/list", { params }),
  getVendorDetail: (id) => api.get(`/api/admin/vendors/${id}`),
  toggleVendorStatus: (id) => api.post(`/api/admin/vendors/${id}/toggle-status`),

  // Affiliates (facade)
  getAffiliatesList: (params) => api.get("/api/admin/affiliates/list", { params }),
  getReferralsList: () => api.get("/api/admin/referrals/list"),
  getCommissionsList: (params) => api.get("/api/admin/commissions/list", { params }),
  getPayoutsList: () => api.get("/api/admin/payouts/list"),
  toggleAffiliateStatus: (id) => api.post(`/api/admin/affiliates/${id}/toggle-status`),
  approvePayout: (id) => api.post(`/api/admin/payouts/${id}/approve`),

  // Catalog (facade)
  getCatalogProducts: (params) => api.get("/api/admin/catalog/products", { params }),
  getCatalogServices: () => api.get("/api/admin/catalog/services"),
  getCatalogGroups: () => api.get("/api/admin/catalog/groups"),
  getCatalogPromoItems: () => api.get("/api/admin/catalog/promo-items"),

  // Settings (facade)
  getBusinessProfile: () => api.get("/api/admin/settings/business-profile"),
  updateBusinessProfile: (data) => api.post("/api/admin/settings/business-profile", data),
  getCommercialRules: () => api.get("/api/admin/settings/commercial-rules"),
  updateCommercialRules: (data) => api.post("/api/admin/settings/commercial-rules", data),
  getAffiliateDefaults: () => api.get("/api/admin/settings/affiliate-defaults"),
  updateAffiliateDefaults: (data) => api.post("/api/admin/settings/affiliate-defaults", data),
  getNotificationSettings: () => api.get("/api/admin/settings/notifications"),
  updateNotificationSettings: (data) => api.post("/api/admin/settings/notifications", data),

  // Users (facade)
  getUsersList: (params) => api.get("/api/admin/users/list", { params }),
  assignUserRole: (id, payload) => api.post(`/api/admin/users/${id}/assign-role`, payload),
  toggleUserStatus: (id) => api.post(`/api/admin/users/${id}/toggle-status`),

  // Audit (facade)
  getAuditLogs: (params) => api.get("/api/admin/audit/list", { params }),
  getAuditActions: () => api.get("/api/admin/audit/actions"),

  // Quote Engine
  createQuoteFromLead: (payload) => api.post("/api/quotes-engine/create", payload),
  sendQuote: (quoteId) => api.post(`/api/quotes-engine/${quoteId}/send`),
  acceptQuote: (quoteId, payload) => api.post(`/api/quotes-engine/${quoteId}/accept`, payload || {}),
  rejectQuote: (quoteId, payload) => api.post(`/api/quotes-engine/${quoteId}/reject`, payload || {}),
  getQuoteDetail: (quoteId) => api.get(`/api/quotes-engine/${quoteId}`),
  getInvoiceSplits: (invoiceId) => api.get(`/api/quotes-engine/invoice/${invoiceId}/splits`),

  // ═══ LEGACY (old admin_routes.py endpoints — keep for backward compat) ═══
  // Customers
  getCustomers: () => api.get("/api/admin/customers"),
  createCustomer: (data) => api.post("/api/admin/customers", data),
  updateCustomer: (id, data) => api.patch(`/api/admin/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/api/admin/customers/${id}`),

  // Invoices (legacy CRUD)
  createInvoice: (data) => api.post("/api/admin/invoices", data),
  updateInvoiceStatus: (id, status) => api.patch(`/api/admin/invoices/${id}/status?status=${status}`),
  getInvoicePayments: (id) => api.get(`/api/admin/invoices/${id}/payments`),
  sendInvoiceDocument: (id) => api.post(`/api/admin/document-send/invoice/${id}`),
  downloadInvoicePdf: (id) => `${api.defaults.baseURL || ""}/api/admin/invoices/${id}/pdf`,

  // Quotes (legacy CRUD)
  createQuote: (data) => api.post("/api/admin/quotes", data),
  updateQuoteStatus: (id, status) => api.patch(`/api/admin/quotes/${id}/status?status=${status}`),
  convertQuoteToOrder: (id) => api.post(`/api/admin/quotes/${id}/convert`),
  sendQuoteDocument: (id) => api.post(`/api/admin/document-send/quote/${id}`),
  downloadQuotePdf: (id) => `${api.defaults.baseURL || ""}/api/admin/quotes/${id}/pdf`,

  // Orders (legacy ops)
  convertOrderToInvoice: (orderId, dueDate) => api.post(`/api/admin/quotes/${orderId}/convert-to-invoice`, { due_date: dueDate }),
  assignOrderTask: (data) => api.post("/api/admin/orders-ops/assign-task", data),
  sendOrderToProduction: (data) => api.post("/api/admin/orders-ops/send-to-production", data),
  reserveInventory: (data) => api.post("/api/admin/orders-ops/reserve-inventory", data),

  // Leads
  getLeads: () => api.get("/api/admin/leads"),
  createLead: (data) => api.post("/api/admin/leads", data),
  updateLeadStatus: (id, status) => api.patch(`/api/admin/leads/${id}/status?status=${status}`),

  // Tasks
  getTasks: () => api.get("/api/admin/tasks"),
  createTask: (data) => api.post("/api/admin/tasks", data),
  updateTaskStatus: (id, status) => api.patch(`/api/admin/tasks/${id}/status?status=${status}`),
  deleteTask: (id) => api.delete(`/api/admin/tasks/${id}`),

  // Inventory
  getInventoryItems: () => api.get("/api/admin/inventory"),
  createInventoryItem: (data) => api.post("/api/admin/inventory", data),
  getProductPricingBySku: (sku) => api.get(`/api/admin/inventory/by-sku/${sku}`),
  getStockMovements: () => api.get("/api/admin/stock-movements"),
  createStockMovement: (data) => api.post("/api/admin/stock-movements", data),

  // Production
  getProductionQueue: () => api.get("/api/admin/orders-ops"),
  getProductionStats: () => api.get("/api/admin/orders-ops"),
  updateProductionStatus: (id, status) => api.patch(`/api/admin/orders-ops/${id}/status?status=${status}`),

  // Settings
  getCompanySettings: () => api.get("/api/admin/company-settings"),
  updateCompanySettings: (data) => api.patch("/api/admin/company-settings", data),
};

export { adminApi };
export default adminApi;
