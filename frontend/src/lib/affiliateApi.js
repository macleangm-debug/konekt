import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('konekt_admin_token') || localStorage.getItem('konekt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const affiliateApi = {
  // Affiliates CRUD
  getAffiliates: () => 
    axios.get(`${API_URL}/api/admin/affiliates`, { headers: getAuthHeader() }),
  
  getAffiliate: (affiliateId) => 
    axios.get(`${API_URL}/api/admin/affiliates/${affiliateId}`, { headers: getAuthHeader() }),
  
  createAffiliate: (payload) => 
    axios.post(`${API_URL}/api/admin/affiliates`, payload, { headers: getAuthHeader() }),
  
  updateAffiliate: (affiliateId, payload) =>
    axios.patch(`${API_URL}/api/admin/affiliates/${affiliateId}`, payload, { headers: getAuthHeader() }),

  deleteAffiliate: (affiliateId) =>
    axios.delete(`${API_URL}/api/admin/affiliates/${affiliateId}`, { headers: getAuthHeader() }),

  // Commissions
  getAffiliateCommissions: (params) =>
    axios.get(`${API_URL}/api/admin/affiliate-commissions`, { params, headers: getAuthHeader() }),
  
  approveAffiliateCommission: (commissionId) =>
    axios.post(`${API_URL}/api/admin/affiliate-commissions/${commissionId}/approve`, {}, { headers: getAuthHeader() }),
  
  markAffiliateCommissionPaid: (commissionId) =>
    axios.post(`${API_URL}/api/admin/affiliate-commissions/${commissionId}/mark-paid`, {}, { headers: getAuthHeader() }),

  // Payouts
  getAffiliatePayouts: (params) =>
    axios.get(`${API_URL}/api/affiliate-payouts/admin`, { params, headers: getAuthHeader() }),
  
  createAffiliatePayoutRequest: (payload) =>
    axios.post(`${API_URL}/api/affiliate-payouts/admin`, payload, { headers: getAuthHeader() }),
  
  approveAffiliatePayout: (payoutId) =>
    axios.post(`${API_URL}/api/affiliate-payouts/admin/${payoutId}/approve`, {}, { headers: getAuthHeader() }),
  
  markAffiliatePayoutPaid: (payoutId) =>
    axios.post(`${API_URL}/api/affiliate-payouts/admin/${payoutId}/mark-paid`, {}, { headers: getAuthHeader() }),

  // Public
  getAffiliateByCode: (code) =>
    axios.get(`${API_URL}/api/affiliates/code/${code}`),
};

export default affiliateApi;
