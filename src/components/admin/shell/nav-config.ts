import {
  GridIcon,
  GridViewIcon,
  BoxIcon,
  TagIcon,
  ReceiptIcon,
  UsersIcon,
  ReturnIcon,
  ChartIcon,
  GearIcon,
  MailIcon,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: GridIcon }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: BoxIcon },
      { label: "Categories", href: "/admin/categories", icon: TagIcon },
      { label: "Media Gallery", href: "/admin/gallery", icon: GridViewIcon },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ReceiptIcon },
      { label: "Shipments", href: "/admin/shipments", icon: BoxIcon },
      { label: "Customers", href: "/admin/customers", icon: UsersIcon },
      { label: "Returns", href: "/admin/returns", icon: ReturnIcon },
      { label: "Newsletter", href: "/admin/newsletter", icon: MailIcon },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/admin/reports", icon: ChartIcon }],
  },
  {
    label: "Configuration",
    items: [{ label: "Settings", href: "/admin/settings", icon: GearIcon }],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Breadcrumb label lookup for dynamic segments (ids) — falls back to the raw segment. */
export function findNavLabel(href: string): string | undefined {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === href) return item.label;
    }
  }
  return undefined;
}

export type Breadcrumb = { label: string; href?: string };

/** Structural, route-driven breadcrumbs — no data fetching in the shell. */
export function getBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === "/admin") return [{ label: "Dashboard" }];

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const [section, ...rest] = segments;
  const sectionLabel = findNavLabel(`/admin/${section}`) ?? section;
  const crumbs: Breadcrumb[] = [{ label: "Dashboard", href: "/admin" }, { label: sectionLabel, href: `/admin/${section}` }];

  if (rest.length === 0) return crumbs;

  const [second, third] = rest;
  if (second === "new") {
    crumbs.push({ label: "Add product" });
  } else if (third === "edit") {
    crumbs.push({ label: "Edit product" });
  } else {
    const detailLabel: Record<string, string> = {
      orders: "Order detail",
      customers: "Customer detail",
      returns: "Return detail",
      shipments: "Shipment detail",
    };
    crumbs.push({ label: detailLabel[section] ?? "Detail" });
  }

  return crumbs;
}
