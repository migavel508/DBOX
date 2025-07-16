import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface AuthContextType {
  userId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored auth state
    const storedUserId = localStorage.getItem('userId');
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    if (storedUserId) {
      setUserId(storedUserId);
      setIsAdmin(storedIsAdmin);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (userId: string) => {
    try {
      const response = await api.login(userId);
      setUserId(userId);
      setIsAdmin(response.isAdmin);
      setIsAuthenticated(true);
      localStorage.setItem('userId', userId);
      localStorage.setItem('isAdmin', response.isAdmin.toString());
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUserId(null);
    setIsAdmin(false);
    setIsAuthenticated(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
  };

  return (
    <AuthContext.Provider value={{ userId, isAdmin, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 