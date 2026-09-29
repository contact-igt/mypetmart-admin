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
  getAdminAccessToken,
  type SafeAdminUser,
} from "@/lib/auth/admin-auth-api";
import { ADMIN_SESSION_EXPIRED_EVENT, setAdminAccessToken } from "@/lib/api/admin-api-client";

const ADMIN_LOGOUT_SIGNAL = "mypetmart:admin-logout";

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
    const handleRemoteLogout = (event: StorageEvent) => {
      if (event.key !== ADMIN_LOGOUT_SIGNAL) return;
      setAdminAccessToken(null);
      handleExpiredSession();
    };
    window.addEventListener("storage", handleRemoteLogout);

    const restoreSession = async () => {
      try {
        // Like the established Invictus panel flow, restore the persisted
        // access token first. The httpOnly refresh cookie remains the fallback
        // once it expires or after a new browser session.
        if (!getAdminAccessToken()) await adminRefresh();
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
      window.removeEventListener("storage", handleRemoteLogout);
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const adminUser = await adminSignin(email, password);
    setUser(adminUser);
  };

  const logout = async (): Promise<void> => {
    // Clear this tab before the network call so a slow/failing request cannot
    // leave protected UI visible. The backend request still revokes the shared
    // refresh session and clears its cookie.
    setAdminAccessToken(null);
    setUser(null);
    localStorage.setItem(ADMIN_LOGOUT_SIGNAL, String(Date.now()));
    await adminLogout();
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
