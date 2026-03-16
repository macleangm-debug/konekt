import axios from "axios";

const partnerApi = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "",
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("partner_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

partnerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("partner_token");
      window.location.href = "/partner-login";
    }
    return Promise.reject(error);
  }
);

export default partnerApi;
