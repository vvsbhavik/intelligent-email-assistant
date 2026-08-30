import React, { createContext, useContext, useEffect, useState } from "react";
import { User, SystemStatus } from "../types";
import { api } from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isRealGoogleConnected: boolean;
  loading: boolean;
  systemStatus: SystemStatus | null;
  loginWithGoogle: () => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isRealGoogleConnected, setIsRealGoogleConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const refreshSession = async () => {
    try {
      const data = await api.getSession();
      setIsAuthenticated(data.authenticated);
      setUser(data.user);
      setIsDemo(data.isDemo);
      setIsRealGoogleConnected(data.isRealGoogleConnected);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (e) {
      console.warn("Failed to fetch system status", e);
    }
  };

  useEffect(() => {
    refreshSession();
    refreshStatus();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { url } = await api.getGoogleOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      throw new Error(err.message || "Failed to start Google sign in");
    }
  };

  const loginWithDemo = async () => {
    setLoading(true);
    try {
      const res = await api.loginDemo();
      setUser(res.user);
      setIsAuthenticated(true);
      setIsDemo(true);
      setIsRealGoogleConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
      setUser(null);
      setIsAuthenticated(false);
      setIsDemo(false);
      setIsRealGoogleConnected(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isDemo,
        isRealGoogleConnected,
        loading,
        systemStatus,
        loginWithGoogle,
        loginWithDemo,
        logout,
        refreshSession,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
