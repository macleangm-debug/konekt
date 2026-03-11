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

  // Invoices (v2 routes)
  getInvoices: (params) => api.get("/api/admin/invoices-v2", { params }),
  getInvoice: (id) => api.get(`/api/admin/invoices-v2/${id}`),
  createInvoice: (payload) => api.post("/api/admin/invoices-v2", payload),
  updateInvoiceStatus: (invoiceId, status) =>
    api.patch(`/api/admin/invoices-v2/${invoiceId}/status`, null, { params: { status } }),
  addPayment: (invoiceId, payload) => api.post(`/api/admin/invoices-v2/${invoiceId}/payments`, payload),
  convertOrderToInvoice: (orderId, dueDate) =>
    api.post("/api/admin/invoices-v2/convert-from-order", {
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
