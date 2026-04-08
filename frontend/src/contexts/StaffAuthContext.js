import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { clearAllAuth } from '../lib/authHelpers';

const StaffAuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STAFF_ROLES = ['sales', 'marketing', 'production', 'supervisor'];

export const StaffAuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('konekt_staff_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data;
      if (STAFF_ROLES.includes(user.role)) {
        setStaff(user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Staff token validation failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/admin/auth/login`, { email, password });
    const { token: newToken, user } = response.data;

    if (!STAFF_ROLES.includes(user.role)) {
      throw new Error('This login is for staff accounts only. Admin accounts should use the admin portal.');
    }

    localStorage.setItem('konekt_staff_token', newToken);
    setToken(newToken);
    setStaff(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('konekt_staff_token');
    setToken(null);
    setStaff(null);
  };

  return (
    <StaffAuthContext.Provider value={{ staff, token, loading, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
};
