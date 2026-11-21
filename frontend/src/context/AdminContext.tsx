import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type AdminTab =
  | 'dashboard'
  | 'sessions'
  | 'templates'
  | 'packages'
  | 'devices'
  | 'settings'
  | 'reports';

interface AdminContextType {
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  adminUser: { id: number; username: string; name: string; role: string } | null;
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('haru_admin_token');
    if (token) {
      api.getAdminMe()
        .then((user) => {
          setIsAuthenticated(true);
          setAdminUser(user);
        })
        .catch(() => {
          localStorage.removeItem('haru_admin_token');
          setIsAuthenticated(false);
          setAdminUser(null);
        });
    }
  }, []);

  const login = async (u: string, p: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await api.adminLogin(u, p);
      localStorage.setItem('haru_admin_token', res.token);
      setIsAuthenticated(true);
      setAdminUser(res.user);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check credentials.');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('haru_admin_token');
    setIsAuthenticated(false);
    setAdminUser(null);
    setIsAdminOpen(false);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminOpen,
        setIsAdminOpen,
        isAuthenticated,
        adminUser,
        activeTab,
        setActiveTab,
        login,
        logout,
        error,
        setError
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
