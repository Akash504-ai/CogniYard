import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const AuthContext = createContext();

export const ROLES = {
  PROCUREMENT: 'procurement_manager',
  WAREHOUSE: 'warehouse_manager',
  FINANCE: 'finance_user',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  [ROLES.PROCUREMENT]: 'Procurement Manager',
  [ROLES.WAREHOUSE]: 'Warehouse & Dock Manager',
  [ROLES.FINANCE]: 'Finance & AP User',
  [ROLES.ADMIN]: 'System Administrator'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cogniyard_token'));
  const [loading, setLoading] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const fetchCurrentUser = async () => {
    const savedToken = localStorage.getItem('cogniyard_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.getMe();
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error verifying authenticated user session:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data.success && res.data.token) {
      localStorage.setItem('cogniyard_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      showNotification(`Welcome back, ${res.data.user.name}!`, 'success');
      return res.data.user;
    }
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    if (res.data.success && res.data.token) {
      localStorage.setItem('cogniyard_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      showNotification(`Account created successfully!`, 'success');
      return res.data.user;
    }
  };

  const googleLogin = async (payload) => {
    const res = await authAPI.googleAuth(payload);
    if (res.data.success && res.data.token) {
      localStorage.setItem('cogniyard_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      showNotification(`Signed in with Google as ${res.data.user.name}`, 'success');
      return res.data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('cogniyard_token');
    setToken(null);
    setUser(null);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      loading,
      login,
      register,
      googleLogin,
      logout,
      refreshUser: fetchCurrentUser,
      currentRole: user?.role || ROLES.PROCUREMENT,
      currentUser: user || { name: 'Guest User', role: ROLES.PROCUREMENT },
      isAiOpen,
      setIsAiOpen,
      notification,
      showNotification
    }}>
      {/* Floating Top-Right Notification Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[99999] max-w-sm px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-semibold tracking-tight transition-all animate-in fade-in slide-in-from-top-3 ${
          notification.type === 'warning' || notification.type === 'error'
            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
        }`}>
          {notification.type === 'warning' || notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span className="leading-snug">{notification.message}</span>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
