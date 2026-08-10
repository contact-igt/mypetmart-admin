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
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/lib/api/admin-api-client";

type AdminAuthContextType = {
  user: SafeAdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const handleExpiredSession = () => {
      if (active) {
        setUser(null);
        setIsLoading(false);
      }
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiredSession);

    const restoreSession = async () => {
      try {
        await adminRefresh();
        const profile = await adminGetMe();
        if (active) setUser(profile);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      active = false;
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiredSession);
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
