import api from "./api";

const liveCommerceApi = {
  createProductCheckout: (payload) => api.post("/api/live-commerce/product-checkout", payload),
  acceptQuote: (quoteId, payload = { accepted_by_role: "customer" }) =>
    api.post(`/api/live-commerce/quotes/${quoteId}/accept`, payload),
  createInvoicePaymentIntent: (invoiceId, payload = { payment_mode: "full" }) =>
    api.post(`/api/live-commerce/invoices/${invoiceId}/payment-intent`, payload),
  submitPaymentProof: (paymentId, payload) =>
    api.post(`/api/live-commerce/payments/${paymentId}/proof`, payload),
  getFinanceQueue: (params) => api.get("/api/live-commerce/finance/queue", { params }),
  approveProof: (paymentProofId, payload) =>
    api.post(`/api/live-commerce/finance/proofs/${paymentProofId}/approve`, payload),
  rejectProof: (paymentProofId, payload) =>
    api.post(`/api/live-commerce/finance/proofs/${paymentProofId}/reject`, payload),
  getCustomerWorkspace: (customerId) =>
    api.get(`/api/live-commerce/customers/${customerId}/workspace`),
};

export default liveCommerceApi;
