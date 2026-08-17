"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS, isNavItemActive } from "./nav-config";
import { SiteLogo } from "@/components/site-logo";

export function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {group.label}
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname ?? "", item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon width={17} height={17} className="shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-deep-brown px-4 py-5 lg:flex">
      <div className="px-2 pb-5">
        <SiteLogo tone="inverted" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <AdminNavList />
      </div>
      <div className="border-t border-white/10 px-3 pt-4">
        <p className="text-[11px] text-white/40">MyPetMart Admin · Demo build</p>
      </div>
    </aside>
  );
}
