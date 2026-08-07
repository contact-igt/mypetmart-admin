"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  adminGetMe,
  adminLogout,
  adminRefresh,
  adminSignin,
  type SafeAdminUser,
} from "@/lib/auth/admin-auth-api";

type AdminAuthContextType = {
  user: SafeAdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

let refreshPromise: Promise<string> | null = null;

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        if (!refreshPromise) {
          refreshPromise = adminRefresh();
        }
        const token = await refreshPromise;
        refreshPromise = null;

        const profile = await adminGetMe(token);
        if (active) setUser(profile);
      } catch {
        refreshPromise = null;
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const adminUser = await adminSignin(email, password);
    setUser(adminUser);
  };

  const logout = async (): Promise<void> => {
    await adminLogout();
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
