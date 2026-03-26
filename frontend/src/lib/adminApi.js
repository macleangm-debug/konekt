import api from "./api";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

export const adminApi = {
  // Dashboard
  getDashboardSummary: () => api.get("/api/admin/dashboard/summary"),

  // Company Settings
  getCompanySettings: () => api.get("/api/admin/settings/company"),
  updateCompanySettings: (payload) => api.put("/api/admin/settings/company", payload),

  // CRM / Leads
  getLeads: (params) => api.get("/api/admin/crm/leads", { params }),
  getLead: (id) => api.get(`/api/admin/crm/leads/${id}`),
  createLead: (payload) => api.post("/api/admin/crm/leads", payload),
  updateLeadStatus: (leadId, status) =>
    api.patch(`/api/admin/crm/leads/${leadId}/status`, null, { params: { status } }),
  deleteLead: (leadId) => api.delete(`/api/admin/crm/leads/${leadId}`),

  // Tasks
  getTasks: (params) => api.get("/api/admin/tasks", { params }),
  createTask: (payload) => api.post("/api/admin/tasks", payload),
  updateTaskStatus: (taskId, status) =>
    api.patch(`/api/admin/tasks/${taskId}/status`, null, { params: { status } }),
  deleteTask: (taskId) => api.delete(`/api/admin/tasks/${taskId}`),

  // Inventory
  getInventoryItems: (params) => api.get("/api/admin/inventory/items", { params }),
  getInventoryItem: (id) => api.get(`/api/admin/inventory/items/${id}`),
  createInventoryItem: (payload) => api.post("/api/admin/inventory/items", payload),
  createStockMovement: (payload) => api.post("/api/admin/inventory/movements", payload),
  getStockMovements: (params) => api.get("/api/admin/inventory/movements", { params }),
  getLowStockItems: () => api.get("/api/admin/inventory/low-stock"),

  // Invoices
  getInvoices: (params) => api.get("/api/admin/invoices", { params }),
  getInvoice: (id) => api.get(`/api/admin/invoices/${id}`),
  createInvoice: (payload) => api.post("/api/admin/invoices", payload),
  updateInvoiceStatus: (invoiceId, status) =>
    api.patch(`/api/admin/invoices/${invoiceId}/status`, null, { params: { status } }),
  addPayment: (invoiceId, payload) => api.post(`/api/admin/invoices/${invoiceId}/payments`, payload),
  convertOrderToInvoice: (orderId, dueDate) =>
    api.post("/api/admin/invoices/convert-from-order", {
      order_id: orderId,
      due_date: dueDate || null,
    }),

  // Quotes (v2 routes)
  getQuotes: (params) => api.get("/api/admin/quotes-v2", { params }),
  getQuote: (id) => api.get(`/api/admin/quotes-v2/${id}`),
  createQuote: (payload) => api.post("/api/admin/quotes-v2", payload),
  updateQuoteStatus: (quoteId, status) =>
    api.patch(`/api/admin/quotes-v2/${quoteId}/status`, null, { params: { status } }),
  convertQuoteToOrder: (quoteId) =>
    api.post("/api/admin/quotes-v2/convert-to-order", { quote_id: quoteId }),
  convertQuoteToInvoice: (quoteId) =>
    api.post(`/api/admin/quotes-v2/${quoteId}/convert-to-invoice`),

  // PDF Export URLs
  downloadQuotePdf: (quoteId) => `${API_BASE_URL}/api/admin/pdf/quote/${quoteId}`,
  downloadInvoicePdf: (invoiceId) => `${API_BASE_URL}/api/admin/pdf/invoice/${invoiceId}`,

  // Customers
  getCustomers: (params) => api.get("/api/admin/customers", { params }),
  getCustomer: (id) => api.get(`/api/admin/customers/${id}`),
  getCustomerByEmail: (email) => api.get(`/api/admin/customers/by-email/${encodeURIComponent(email)}`),
  createCustomer: (payload) => api.post("/api/admin/customers", payload),
  updateCustomer: (customerId, payload) => api.patch(`/api/admin/customers/${customerId}`, payload),
  deleteCustomer: (customerId) => api.delete(`/api/admin/customers/${customerId}`),

  // Service Orders
  getServiceOrders: (params) => api.get("/api/service-orders", { params }),
  getServiceOrder: (id) => api.get(`/api/service-orders/${id}`),
  updateServiceOrderStatus: (orderId, status, note) =>
    api.patch(`/api/service-orders/${orderId}/status`, { status, note }),
  addDesignerNote: (orderId, note, isCustomerVisible) =>
    api.post(`/api/service-orders/${orderId}/notes`, { note, is_customer_visible: isCustomerVisible }),
  getServiceOrderStats: () => api.get("/api/admin/service-orders/stats"),

  // Order Operations
  getOrders: (params) => api.get("/api/admin/orders-ops", { params }),
  getOrder: (orderId) => api.get(`/api/admin/orders-ops/${orderId}`),
  updateOrderStatus: (orderId, status, note) =>
    api.patch(`/api/admin/orders-ops/${orderId}/status`, null, { params: { status, note } }),
  reserveInventory: (payload) => api.post("/api/admin/orders-ops/reserve-inventory", payload),
  assignOrderTask: (payload) => api.post("/api/admin/orders-ops/assign-task", payload),
  sendOrderToProduction: (payload) => api.post("/api/admin/orders-ops/send-to-production", payload),

  // Production Queue
  getProductionQueue: (params) => api.get("/api/admin/production/queue", { params }),
  getProductionItem: (queueId) => api.get(`/api/admin/production/queue/${queueId}`),
  updateProductionStatus: (queueId, payload) =>
    api.patch(`/api/admin/production/queue/${queueId}/status`, payload),
  getProductionStats: () => api.get("/api/admin/production/stats"),

  // Product Pricing Lookup
  getProductPricingBySku: (sku) => api.get(`/api/admin/inventory/items/by-sku/${encodeURIComponent(sku)}`),

  // Document Sending (email stubs)
  sendQuoteDocument: (quoteId) => api.post(`/api/admin/send/quote/${quoteId}`),
  sendInvoiceDocument: (invoiceId) => api.post(`/api/admin/send/invoice/${invoiceId}`),
  sendOrderConfirmation: (orderId) => api.post(`/api/admin/send/order/${orderId}/confirmation`),

  // Quote Pipeline (Kanban)
  getQuotePipeline: () => api.get("/api/admin/quotes/pipeline"),
  moveQuoteToStage: (quoteId, status) =>
    api.patch(`/api/admin/quotes/${quoteId}/move`, null, {
      params: { status },
    }),
  getQuotePipelineStats: () => api.get("/api/admin/quotes/pipeline/stats"),

  // Referral Settings
  getReferralSettings: () => api.get("/api/admin/referral-settings"),
  updateReferralSettings: (payload) => api.put("/api/admin/referral-settings", payload),

  // Points Management
  getPointsWallets: () => api.get("/api/admin/points/wallets"),
  getPointsTransactions: () => api.get("/api/admin/points/transactions"),

  // Business Settings sections
  getBusinessProfile: () => api.get("/api/admin/settings/business-profile"),
  updateBusinessProfile: (payload) => api.post("/api/admin/settings/business-profile", payload),
  getCommercialRules: () => api.get("/api/admin/settings/commercial-rules"),
  updateCommercialRules: (payload) => api.post("/api/admin/settings/commercial-rules", payload),
  getAffiliateDefaults: () => api.get("/api/admin/settings/affiliate-defaults"),
  updateAffiliateDefaults: (payload) => api.post("/api/admin/settings/affiliate-defaults", payload),
  getNotificationSettings: () => api.get("/api/admin/settings/notifications"),
  updateNotificationSettings: (payload) => api.post("/api/admin/settings/notifications", payload),

  // Invoice Branding & Authorization
  getInvoiceBranding: () => api.get("/api/admin/settings/invoice-branding"),
  saveInvoiceBranding: (payload) => api.post("/api/admin/settings/invoice-branding", payload),
  uploadSignature: (formData) => api.post("/api/admin/settings/invoice-branding/signature-upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  uploadStamp: (formData) => api.post("/api/admin/settings/invoice-branding/stamp-upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  generateStamp: (payload) => api.post("/api/admin/settings/invoice-branding/generate-stamp", payload),

  // Payment Queue (canonical)
  getPaymentsQueue: (params) => api.get("/api/admin/payments/queue", { params }),
  getPaymentDetail: (proofId) => api.get(`/api/admin/payments/${proofId}`),
  approvePayment: (proofId, payload) => api.post(`/api/admin/payments/${proofId}/approve`, payload),
  rejectPayment: (proofId, payload) => api.post(`/api/admin/payments/${proofId}/reject`, payload),

  // Order detail & release (facade)
  getOrderDetail: (orderId) => api.get(`/api/admin/orders/${orderId}`),
  releaseToVendor: (orderId, payload) => api.post(`/api/admin/orders/${orderId}/release-to-vendor`, payload),

  // Customers 360 (merged)
  getCustomers360List: (params) => api.get("/api/admin/customers-360/list", { params }),
  getCustomers360Stats: () => api.get("/api/admin/customers-360/stats"),
  getCustomer360Detail: (customerId) => api.get(`/api/admin/customers-360/${customerId}`),
};

export default adminApi;
