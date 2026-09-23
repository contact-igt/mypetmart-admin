import { adminApiRequest } from "@/lib/api/admin-api-client";

export type WelcomePopupTemplate = "template_1" | "template_2";
export type WelcomePopupStatus = "draft" | "published" | "archived";
export type WelcomePopupCtaMode = "email_signup" | "navigation";
export type WelcomePopupCouponOption = { id: string; code: string; name: string };

export type WelcomePopup = {
  id: string;
  name: string;
  template: WelcomePopupTemplate;
  status: WelcomePopupStatus;
  isHomepageActive: boolean;
  heading: string;
  description: string;
  offerLabel: string;
  couponId: string | null;
  couponCode: string | null;
  ctaMode: WelcomePopupCtaMode;
  ctaLabel: string;
  ctaUrl: string;
  displayDelayMs: number;
  dismissalCooldownDays: number;
  consentText: string;
  dismissLabel: string;
  desktopImageUrl: string | null;
  desktopImageAlt: string;
  mobileImageUrl: string | null;
  mobileImageAlt: string;
  createdAt: string;
  updatedAt: string;
};

// `desktopImageId`/`mobileImageId` reference a Media Library asset (see
// MediaPickerDrawer) — the backend resolves the real key/url/alt from that
// asset server-side; a raw URL is never accepted. `null` clears the image,
// `undefined` (simply omitting the key) leaves it untouched. Because the
// admin GET response never echoes back the underlying media asset id (only
// its resolved url/alt), this client — and the form built on it — can only
// change an image's alt text in the same request that also (re)selects the
// image; see welcome-popup-form.tsx's `imagePending` state.
export type WelcomePopupInput = {
  name: string;
  template: WelcomePopupTemplate;
  heading: string;
  description?: string | null;
  offerLabel?: string | null;
  couponId?: number | null;
  ctaMode?: WelcomePopupCtaMode;
  ctaLabel?: string;
  ctaUrl?: string | null;
  displayDelayMs?: number;
  dismissalCooldownDays?: number;
  consentText?: string | null;
  dismissLabel?: string | null;
  desktopImageId?: number | null;
  desktopImageAlt?: string | null;
  mobileImageId?: number | null;
  mobileImageAlt?: string | null;
};

type BackendWelcomePopup = {
  id: number;
  name: string;
  template: WelcomePopupTemplate;
  status: WelcomePopupStatus;
  isHomepageActive: boolean;
  heading: string;
  description: string | null;
  offerLabel: string | null;
  couponId: number | null;
  couponCode: string | null;
  ctaMode: WelcomePopupCtaMode;
  ctaLabel: string;
  ctaUrl: string | null;
  displayDelayMs: number;
  dismissalCooldownDays: number;
  consentText: string | null;
  dismissLabel: string | null;
  desktopImageUrl: string | null;
  desktopImageAlt: string | null;
  mobileImageUrl: string | null;
  mobileImageAlt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toWelcomePopup(popup: BackendWelcomePopup): WelcomePopup {
  return {
    id: String(popup.id),
    name: popup.name,
    template: popup.template,
    status: popup.status,
    isHomepageActive: popup.isHomepageActive,
    heading: popup.heading,
    description: popup.description ?? "",
    offerLabel: popup.offerLabel ?? "",
    couponId: popup.couponId === null ? null : String(popup.couponId),
    couponCode: popup.couponCode,
    ctaMode: popup.ctaMode ?? "email_signup",
    ctaLabel: popup.ctaLabel,
    ctaUrl: popup.ctaUrl ?? "",
    displayDelayMs: popup.displayDelayMs ?? 1200,
    dismissalCooldownDays: popup.dismissalCooldownDays ?? 7,
    consentText: popup.consentText ?? "",
    dismissLabel: popup.dismissLabel ?? "",
    desktopImageUrl: popup.desktopImageUrl,
    desktopImageAlt: popup.desktopImageAlt ?? "",
    mobileImageUrl: popup.mobileImageUrl,
    mobileImageAlt: popup.mobileImageAlt ?? "",
    createdAt: popup.createdAt,
    updatedAt: popup.updatedAt,
  };
}

function popupPath(popupId: string): string {
  return `/admin/welcome-popups/${encodeURIComponent(popupId)}`;
}

function toRequestBody(input: WelcomePopupInput) {
  return {
    name: input.name,
    template: input.template,
    heading: input.heading,
    description: input.description ?? null,
    offerLabel: input.offerLabel ?? null,
    ...(input.couponId !== undefined ? { couponId: input.couponId } : {}),
    ...(input.ctaMode !== undefined ? { ctaMode: input.ctaMode } : {}),
    ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
    ctaUrl: input.ctaUrl || null,
    ...(input.displayDelayMs !== undefined ? { displayDelayMs: input.displayDelayMs } : {}),
    ...(input.dismissalCooldownDays !== undefined ? { dismissalCooldownDays: input.dismissalCooldownDays } : {}),
    consentText: input.consentText ?? null,
    dismissLabel: input.dismissLabel ?? null,
    ...(input.desktopImageId !== undefined ? { desktopImageId: input.desktopImageId, desktopImageAlt: input.desktopImageAlt ?? null } : {}),
    ...(input.mobileImageId !== undefined ? { mobileImageId: input.mobileImageId, mobileImageAlt: input.mobileImageAlt ?? null } : {}),
  };
}

export async function fetchAdminWelcomePopups(status?: WelcomePopupStatus): Promise<WelcomePopup[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const popups = await adminApiRequest<BackendWelcomePopup[]>(`/admin/welcome-popups${query}`);
  return popups.map(toWelcomePopup);
}

export async function fetchAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(popupPath(popupId)));
}

export async function fetchWelcomePopupCouponOptions(): Promise<WelcomePopupCouponOption[]> {
  const options = await adminApiRequest<Array<{ id: number; code: string; name: string }>>("/admin/welcome-popups/coupon-options");
  return options.map((option) => ({ ...option, id: String(option.id) }));
}

export async function createAdminWelcomePopup(input: WelcomePopupInput): Promise<WelcomePopup> {
  const popup = await adminApiRequest<BackendWelcomePopup>("/admin/welcome-popups", {
    method: "POST",
    body: JSON.stringify(toRequestBody(input)),
  });
  return toWelcomePopup(popup);
}

export async function updateAdminWelcomePopup(popupId: string, input: WelcomePopupInput): Promise<WelcomePopup> {
  const popup = await adminApiRequest<BackendWelcomePopup>(popupPath(popupId), {
    method: "PATCH",
    body: JSON.stringify(toRequestBody(input)),
  });
  return toWelcomePopup(popup);
}

export async function publishAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(`${popupPath(popupId)}/publish`, { method: "PATCH" }));
}

export async function activateAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(`${popupPath(popupId)}/activate`, { method: "PATCH" }));
}

export async function deactivateAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(`${popupPath(popupId)}/deactivate`, { method: "PATCH" }));
}

export async function archiveAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(`${popupPath(popupId)}/archive`, { method: "PATCH" }));
}

export async function duplicateAdminWelcomePopup(popupId: string): Promise<WelcomePopup> {
  return toWelcomePopup(await adminApiRequest<BackendWelcomePopup>(`${popupPath(popupId)}/duplicate`, { method: "POST" }));
}
