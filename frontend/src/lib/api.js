import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:8001",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Check for admin token first (used in admin pages), then regular token
  const adminToken = localStorage.getItem("konekt_admin_token");
  const customerToken = localStorage.getItem("token");
  const token = adminToken || customerToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Optionally redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
