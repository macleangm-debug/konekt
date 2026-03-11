import api from "./api";

export const paymentApi = {
  // KwikPay Mobile Money
  createKwikPayIntent: (payload) =>
    api.post("/api/payments/kwikpay/intent", payload),

  // Bank Transfer
  createBankTransferIntent: (payload) =>
    api.post("/api/payments/bank-transfer/intent", payload),

  markBankTransferSubmitted: (payload) =>
    api.post("/api/payments/bank-transfer/mark-submitted", payload),

  // Admin
  getAdminPayments: (params) =>
    api.get("/api/admin/payments", { params }),

  getPayment: (paymentId) =>
    api.get(`/api/admin/payments/${paymentId}`),

  verifyAdminPayment: (paymentId) =>
    api.post(`/api/admin/payments/${paymentId}/verify`),

  rejectAdminPayment: (paymentId, reason) =>
    api.post(`/api/admin/payments/${paymentId}/reject`, null, {
      params: { reason },
    }),
};
