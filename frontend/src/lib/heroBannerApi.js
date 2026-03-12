import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('konekt_admin_token') || localStorage.getItem('konekt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const heroBannerApi = {
  // Public endpoint - no auth needed
  getActiveHeroBanners: () => 
    axios.get(`${API_URL}/api/hero-banners/active`),
  
  // Admin endpoints - require auth
  getAdminHeroBanners: () => 
    axios.get(`${API_URL}/api/hero-banners/admin`, { headers: getAuthHeader() }),
  
  createHeroBanner: (payload) => 
    axios.post(`${API_URL}/api/hero-banners/admin`, payload, { headers: getAuthHeader() }),
  
  updateHeroBanner: (bannerId, payload) => 
    axios.patch(`${API_URL}/api/hero-banners/admin/${bannerId}`, payload, { headers: getAuthHeader() }),
  
  deleteHeroBanner: (bannerId) => 
    axios.delete(`${API_URL}/api/hero-banners/admin/${bannerId}`, { headers: getAuthHeader() }),
};

export default heroBannerApi;
