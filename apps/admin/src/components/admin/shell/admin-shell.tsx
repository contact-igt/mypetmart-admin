"use client";

import { useState, type ReactNode } from "react";
import { AdminSidebar, AdminNavList } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { Drawer } from "../ui/drawer";
import { ToastProvider } from "../ui/toast";
import { AlertIcon } from "@/components/icons";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
            Demo mode — all data is fixture data and resets on reload. No live orders, payments or
            customer records exist yet.
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
