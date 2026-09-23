import { adminApiRequest } from "@/lib/api/admin-api-client";

export type AnnouncementBarItem = {
  id: string;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  active: boolean;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementBarItemInput = {
  message: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type BackendAnnouncementBarItem = {
  id: number;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  active: boolean;
  displayOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toAnnouncementBarItem(item: BackendAnnouncementBarItem): AnnouncementBarItem {
  return {
    id: String(item.id),
    message: item.message,
    linkUrl: item.linkUrl,
    linkLabel: item.linkLabel,
    active: item.active,
    order: item.displayOrder,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function itemPath(itemId: string): string {
  return `/admin/announcement-bar/${encodeURIComponent(itemId)}`;
}

export async function fetchAdminAnnouncementBarItems(): Promise<AnnouncementBarItem[]> {
  const items = await adminApiRequest<BackendAnnouncementBarItem[]>("/admin/announcement-bar");
  return items.map(toAnnouncementBarItem);
}

export async function createAdminAnnouncementBarItem(
  input: AnnouncementBarItemInput,
): Promise<AnnouncementBarItem> {
  const item = await adminApiRequest<BackendAnnouncementBarItem>("/admin/announcement-bar", {
    method: "POST",
    body: JSON.stringify({
      message: input.message,
      linkUrl: input.linkUrl || null,
      linkLabel: input.linkLabel || null,
      active: input.active ?? true,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
    }),
  });
  return toAnnouncementBarItem(item);
}

export async function updateAdminAnnouncementBarItem(
  itemId: string,
  input: AnnouncementBarItemInput,
): Promise<AnnouncementBarItem> {
  const item = await adminApiRequest<BackendAnnouncementBarItem>(itemPath(itemId), {
    method: "PATCH",
    body: JSON.stringify({
      message: input.message,
      linkUrl: input.linkUrl || null,
      linkLabel: input.linkLabel || null,
      active: input.active,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
    }),
  });
  return toAnnouncementBarItem(item);
}

export async function setAdminAnnouncementBarItemActive(
  itemId: string,
  active: boolean,
): Promise<AnnouncementBarItem> {
  const item = await adminApiRequest<BackendAnnouncementBarItem>(itemPath(itemId), {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
  return toAnnouncementBarItem(item);
}

export async function reorderAdminAnnouncementBarItems(
  items: AnnouncementBarItem[],
): Promise<AnnouncementBarItem[]> {
  const response = await adminApiRequest<BackendAnnouncementBarItem[]>(
    "/admin/announcement-bar/reorder",
    {
      method: "PATCH",
      body: JSON.stringify({
        items: items.map((item) => ({ itemId: Number(item.id), displayOrder: item.order })),
      }),
    },
  );
  return response.map(toAnnouncementBarItem);
}

export async function deleteAdminAnnouncementBarItem(itemId: string): Promise<void> {
  await adminApiRequest<{ deleted: true }>(itemPath(itemId), { method: "DELETE" });
}
