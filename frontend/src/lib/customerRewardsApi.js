import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('konekt_token') || localStorage.getItem('konekt_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const customerRewardsApi = {
  // Points
  getMyPoints: () => 
    axios.get(`${API_URL}/api/customer/points/me`, { headers: getAuthHeader() }),
  
  getPointsBalance: () => 
    axios.get(`${API_URL}/api/customer/points/balance`, { headers: getAuthHeader() }),

  // Referrals  
  getMyReferrals: () => 
    axios.get(`${API_URL}/api/customer/referrals/me`, { headers: getAuthHeader() }),
  
  getReferralStats: () => 
    axios.get(`${API_URL}/api/customer/referrals/stats`, { headers: getAuthHeader() }),
  
  // Public referral settings
  getPublicReferralSettings: () => 
    axios.get(`${API_URL}/api/referrals/settings/public`),
};

export default customerRewardsApi;
