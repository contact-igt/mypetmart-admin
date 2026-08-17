"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon, SearchIcon, UserIcon, BagIcon } from "@/components/icons";
import { IconButton } from "@/components/icon-button";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Contact Us", href: "/contact" },
];

export function MobileNavPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      id="mobile-nav-panel"
      className={`site-container overflow-hidden transition-[max-height,opacity] duration-150 ease-out md:hidden ${
        open ? "max-h-[28rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
      }`}
    >
      <nav aria-label="Primary" className="border-t border-border-subtle py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  className={`body-copy block rounded-lg px-3 py-3 text-base font-medium ${
                    active ? "bg-white text-primary-orange" : "text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
          <IconButton label="Search">
            <SearchIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Wishlist">
            <HeartIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Account">
            <UserIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Cart">
            <BagIcon width={20} height={20} />
          </IconButton>
        </div>
      </nav>
    </div>
  );
}
