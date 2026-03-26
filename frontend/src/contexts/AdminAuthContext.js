import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { clearAllAuth } from '../lib/authHelpers';

const AdminAuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('konekt_admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      const user = response.data;
      if (['admin', 'sales', 'marketing', 'production'].includes(user.role)) {
        setAdmin(user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/admin/auth/login`, { email, password });
    const { token: newToken, user } = response.data;
    localStorage.setItem('konekt_admin_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setAdmin(user);
    return user;
  };

  const logout = () => {
    clearAllAuth();
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setAdmin(null);
  };

  const hasPermission = (permission) => {
    if (!admin) return false;
    const permissions = admin.permissions || [];
    return permissions.includes('all') || permissions.includes(permission);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, login, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
