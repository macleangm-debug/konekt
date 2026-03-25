import api from "./api";

const adminApi = {
  // Dashboard
  getDashboardSummary: () => api.get("/api/admin/dashboard/summary"),
  getPendingActions: () => api.get("/api/admin/dashboard/pending-actions"),

  // Payments
  getPaymentsQueue: (params) => api.get("/api/admin/payments/queue", { params }),
  getPaymentDetail: (id) => api.get(`/api/admin/payments/${id}`),
  approvePayment: (id, payload) => api.post(`/api/admin/payments/${id}/approve`, payload),
  rejectPayment: (id, payload) => api.post(`/api/admin/payments/${id}/reject`, payload),

  // Invoices
  getInvoices: (params) => api.get("/api/admin/invoices/list", { params }),
  getInvoiceDetail: (id) => api.get(`/api/admin/invoices/${id}`),

  // Orders
  getOrders: (params) => api.get("/api/admin/orders/list", { params }),
  getOrderDetail: (id) => api.get(`/api/admin/orders/${id}`),
  releaseToVendor: (id, payload) => api.post(`/api/admin/orders/${id}/release-to-vendor`, payload),
  updateOrderStatus: (id, payload) => api.post(`/api/admin/orders/${id}/update-status`, payload),

  // Quotes
  getQuotes: (params) => api.get("/api/admin/quotes/list", { params }),
};

export default adminApi;
