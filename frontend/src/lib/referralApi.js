import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get auth token from localStorage - check both customer and admin tokens
const getAuthHeader = () => {
  const token = localStorage.getItem('konekt_token') || localStorage.getItem('konekt_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const referralApi = {
  // Public endpoints
  getReferralByCode: (code) => 
    axios.get(`${API_URL}/api/referrals/code/${code}`),
  
  getPublicSettings: () => 
    axios.get(`${API_URL}/api/referrals/settings/public`),
  
  // Customer endpoints - require auth
  getMyReferrals: () => 
    axios.get(`${API_URL}/api/customer/referrals/me`, { headers: getAuthHeader() }),
  
  getReferralStats: () => 
    axios.get(`${API_URL}/api/customer/referrals/stats`, { headers: getAuthHeader() }),
};

export default referralApi;
