"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/context/admin-auth-context";
import { getBreadcrumbs } from "./nav-config";
import { listAdminProducts } from "@/lib/api/admin-product-api";
import { listAdminOrders } from "@/lib/api/admin-order-api";
import { fetchAdminCustomers } from "@/lib/api/admin-customer-api";
import { MenuIcon, SearchIcon, UserIcon, ChevronDownIcon, GearIcon, LogoutIcon } from "@/components/icons";

type QuickResult = { label: string; sublabel: string; href: string };

export function AdminHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname ?? "/admin");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [products, orders, customers] = await Promise.all([
          listAdminProducts({ search: query, page: 1, pageSize: 3 }),
          listAdminOrders({ search: query, page: 1, pageSize: 3 }),
          fetchAdminCustomers({ search: query, page: 1, pageSize: 3 }),
        ]);
        if (cancelled) return;
        setResults([
          ...products.items.map((p) => ({ label: p.name, sublabel: "Product", href: `/admin/products/${p.id}/edit` })),
          ...orders.items.map((o) => ({
            label: o.orderNumber,
            sublabel: `Order · ${o.customer?.name ?? "Guest"}`,
            href: `/admin/orders/${o.id}`,
          })),
          ...customers.items.map((c) => ({ label: c.name, sublabel: "Customer", href: `/admin/customers/${c.id}` })),
        ]);
        setOpen(true);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(href: string) {
    setQuery("");
    setResults([]);
    setOpen(false);
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-cream-bg/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open admin menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-primary hover:bg-white lg:hidden"
        >
          <MenuIcon width={20} height={20} />
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 sm:block">
          <ol className="flex items-center gap-1.5 truncate text-sm text-text-primary/60">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors duration-150 ease-out hover:text-text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-text-primary">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div ref={containerRef} className="relative ml-auto w-full max-w-xs sm:ml-0">
          <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search products, orders, customers…"
            aria-label="Search admin"
            className="h-9 w-full rounded-lg border border-border-subtle bg-white pl-9 pr-3 text-sm text-text-primary transition-colors duration-150 ease-out focus-visible:border-primary-orange"
          />
          {open && query.trim() && results.length > 0 && (
            <ul
              role="listbox"
              className="absolute right-0 top-11 z-30 w-full min-w-[16rem] overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg"
            >
              {results.map((result) => (
                <li key={result.href}>
                  <button
                    type="button"
                    onClick={() => goTo(result.href)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors duration-150 ease-out hover:bg-cream-bg"
                  >
                    <span className="font-medium text-text-primary">{result.label}</span>
                    <span className="text-xs text-text-primary/55">{result.sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && query.trim() && results.length === 0 && (
            <div className="absolute right-0 top-11 z-30 w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary/55 shadow-lg">
              No matches
            </div>
          )}
        </div>

        <div ref={userMenuRef} className="relative hidden pl-2 sm:block">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors duration-150 ease-out hover:bg-white"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deep-brown text-white">
              <UserIcon width={16} height={16} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-text-primary">{user?.name ?? "Admin"}</span>
              <span className="block text-xs text-text-primary/50 capitalize">{user?.role ?? "Signed in"}</span>
            </span>
            <ChevronDownIcon
              width={14}
              height={14}
              aria-hidden="true"
              className={`text-text-primary/50 transition-transform duration-150 ease-out ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg"
            >
              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
              >
                <GearIcon width={16} height={16} className="text-text-primary/60" aria-hidden="true" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 border-t border-border-subtle px-3 py-2 text-left text-sm text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg hover:text-primary-orange"
              >
                <LogoutIcon width={16} height={16} className="text-text-primary/60" aria-hidden="true" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
