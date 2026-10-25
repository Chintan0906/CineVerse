import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const AUTH_URL = `${API_BASE.replace(/\/+$/, "")}/auth`;

async function authRequest(path, options = {}) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Authentication request failed.");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await authRequest("/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials) => {
    const data = await authRequest("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authRequest("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authRequest("/logout", { method: "POST" });
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
