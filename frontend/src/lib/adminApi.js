import api from "./api";

export const adminApi = {
  // Dashboard
  getDashboardSummary: () => api.get("/api/admin/dashboard/summary"),

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

  // Quotes
  getQuotes: (params) => api.get("/api/admin/quotes", { params }),
  getQuote: (id) => api.get(`/api/admin/quotes/${id}`),
  createQuote: (payload) => api.post("/api/admin/quotes", payload),
  updateQuoteStatus: (quoteId, status) =>
    api.patch(`/api/admin/quotes/${quoteId}/status`, null, { params: { status } }),
  convertQuoteToOrder: (quoteId) => api.post(`/api/admin/quotes/${quoteId}/convert-to-order`),
  convertQuoteToInvoice: (quoteId) => api.post(`/api/admin/quotes/${quoteId}/convert-to-invoice`),

  // Customers
  getCustomers: (params) => api.get("/api/admin/customers", { params }),
  getCustomer: (id) => api.get(`/api/admin/customers/${id}`),

  // Service Orders
  getServiceOrders: (params) => api.get("/api/service-orders", { params }),
  getServiceOrder: (id) => api.get(`/api/service-orders/${id}`),
  updateServiceOrderStatus: (orderId, status, note) =>
    api.patch(`/api/service-orders/${orderId}/status`, { status, note }),
  addDesignerNote: (orderId, note, isCustomerVisible) =>
    api.post(`/api/service-orders/${orderId}/notes`, { note, is_customer_visible: isCustomerVisible }),
  getServiceOrderStats: () => api.get("/api/admin/service-orders/stats"),
};

export default adminApi;
