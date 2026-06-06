import React, { createContext, useState, useEffect } from 'react';
import { loginArkoAdmin } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('arko_admin_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    if (token) {
      localStorage.setItem('arko_admin_token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('arko_admin_token');
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await loginArkoAdmin(email, password);
      if (response.access_token) {
        setToken(response.access_token);
        return { success: true };
      }
      return { success: false, error: 'Token no recibido' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
