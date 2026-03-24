import api from "./api";

export const uploadApi = {
  uploadServiceRequestFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post("/api/uploads/service-request-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadPaymentProof: async ({ paymentId, customerEmail, file }) => {
    const formData = new FormData();
    formData.append("payment_id", paymentId);
    formData.append("customer_email", customerEmail || "");
    formData.append("file", file);

    return api.post("/api/uploads/payment-proof", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default uploadApi;
