"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiJson } from "@/lib/api";

export type AuthUser = {
  id: string;
  username: string;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiJson<{ user: AuthUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void apiJson<{ user: AuthUser | null }>("/api/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await apiJson<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiJson<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiJson("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ ready, user, refresh, register, login, logout }),
    [ready, user, refresh, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
