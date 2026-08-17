"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The root layout has exactly one place to decide chrome — Next.js App
 * Router allows only one root layout. Admin routes need their own shell
 * (sidebar, not the storefront nav/newsletter/footer — CLAUDE.md: admin
 * "prioritise clarity and function", no editorial chrome), so this is the
 * single switch point. `/`, `/shop`, `/contact` render identically to
 * before this existed.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
