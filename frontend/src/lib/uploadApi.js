import api from "./api";

export const uploadApi = {
  /**
   * Upload files for a service brief
   */
  uploadServiceBriefFiles: async ({ serviceSlug, customerEmail, files }) => {
    const formData = new FormData();
    formData.append("service_slug", serviceSlug);
    formData.append("customer_email", customerEmail);
    files.forEach((file) => formData.append("files", file));

    return api.post("/api/uploads/service-brief-files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Upload payment proof (bank transfer receipt, screenshot, etc.)
   */
  uploadPaymentProof: async ({ paymentId, customerEmail, file }) => {
    const formData = new FormData();
    formData.append("payment_id", paymentId);
    formData.append("customer_email", customerEmail);
    formData.append("file", file);

    return api.post("/api/uploads/payment-proof", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default uploadApi;
