"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/admin-auth-context";
import { AdminSidebar, AdminNavList } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { Drawer } from "../ui/drawer";
import { ToastProvider } from "../ui/toast";
import { AlertIcon } from "@/components/icons";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAdminAuth();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isLoginPage) {
        router.push("/admin/login");
      } else if (isAuthenticated && isLoginPage) {
        router.push("/admin");
      }
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-cream-bg">{children}</div>
      </ToastProvider>
    );
  }

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="flex min-h-screen items-center justify-center bg-cream-bg text-sm font-medium text-text-primary/70">
          Restoring admin session…
        </div>
      </ToastProvider>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-cream-bg">
        <AdminSidebar />

        <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Menu" side="left" tone="dark">
          <AdminNavList onNavigate={() => setMobileNavOpen(false)} />
        </Drawer>

        <div className="flex min-h-screen flex-col lg:pl-64">
          <AdminHeader onOpenMenu={() => setMobileNavOpen(true)} />

          <div className="flex items-center gap-2 border-b border-border-subtle bg-yellow-card/60 px-4 py-2 text-xs font-medium text-text-primary sm:px-6">
            <AlertIcon width={14} height={14} className="shrink-0 text-text-primary/70" />
            Stage 9 Live Admin Mode — Customer identity data connected to real backend APIs.
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
