import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Dans une implémentation DRF standard (ex: SimpleJWT), on appelle le token
      // et pour récupérer le profil, on peut avoir un endpoint dédié
      const response = await api.post('/users/token/', { username, password });
      const { access, user: userData } = response.data;

      localStorage.setItem('token', access);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error.response?.data?.detail || "Identifiants invalides.";
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (role) => {
    return user && user.role === role;
  };

  const isAdmin = user && (user.role === 'ADMIN' || user.is_superuser);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, isAdmin, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const formatFullName = (firstName, lastName, username = '') => {
  const cleanFirst = (firstName || '').trim().replace(/^(null|undefined)$/i, '');
  const cleanLast = (lastName || '').trim().replace(/^(null|undefined)$/i, '');
  const cleanUser = (username || '').trim().replace(/^(null|undefined)$/i, '');
  
  if (cleanFirst && cleanLast) {
    return `${cleanFirst} ${cleanLast}`;
  }
  if (cleanFirst) return cleanFirst;
  if (cleanLast) return cleanLast;
  return cleanUser || '';
};

export const cleanText = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';
  return str;
};
