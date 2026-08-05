import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/admin-shell";

export const metadata: Metadata = {
  title: { template: "%s | MyPetMart Admin", default: "Admin | MyPetMart" },
  description: "MyPetMart admin panel (demo data).",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
