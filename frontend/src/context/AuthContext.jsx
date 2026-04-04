import React, { createContext, useState, useEffect } from 'react';
import { auth as authAPI } from '../services/api';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await authAPI.getProfile();
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Profile fetch failed:', error);
      localStorage.removeItem('token');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, phone, referralCode, role = 'user') => {
    const data = await authAPI.register({ email, password, name, phone, referralCode, role });
    localStorage.setItem('token', data.token);
    const userWithRole = { ...data.user, role: data.user.role || role };
    setUser(userWithRole);
    return data;
  };

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    const userWithRole = { ...data.user, role: data.user.role || 'user' };
    setUser(userWithRole);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateBalance = (newBalance) => {
    setUser((prev) => prev ? { ...prev, balance: newBalance } : null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, register, login, logout, updateBalance, fetchProfile, refreshUser: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
