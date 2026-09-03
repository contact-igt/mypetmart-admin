import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/admin-shell";

export const metadata: Metadata = {
  title: { template: "%s | MyPetMart Admin", default: "Admin | MyPetMart" },
  description: "MyPetMart admin panel. Orders and Customers use live backend data; other modules may still use demo data.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
