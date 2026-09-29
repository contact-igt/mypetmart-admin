import { adminApiRequest } from "@/lib/api/admin-api-client";
import type { StoreSettings } from "@/data/admin/types";
import type { SafeAdminUser } from "@/lib/auth/admin-auth-api";

export type IntegrationStatus = { provider: string | null; ready: boolean };

export type IntegrationsStatus = {
  paymentGateway: IntegrationStatus;
  shippingPartner: IntegrationStatus;
  imageStorage: IntegrationStatus;
  analytics: IntegrationStatus;
};

export type PayOnlineDiscountSettings = {
  enabled: boolean;
  discountType: "percentage" | "fixed";
  discountValue: string;
  updatedAt: string | null;
};

export function getStoreProfile(): Promise<StoreSettings> {
  return adminApiRequest<StoreSettings>("/admin/settings/store");
}

export function updateStoreProfile(profile: StoreSettings): Promise<StoreSettings> {
  return adminApiRequest<StoreSettings>("/admin/settings/store", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  return adminApiRequest<IntegrationsStatus>("/admin/settings/integrations");
}

export function listAdminUsers(): Promise<SafeAdminUser[]> {
  return adminApiRequest<SafeAdminUser[]>("/admin/settings/admins");
}

export function getPayOnlineDiscount(): Promise<PayOnlineDiscountSettings> {
  return adminApiRequest<PayOnlineDiscountSettings>("/admin/settings/pay-online-discount");
}

export function updatePayOnlineDiscount(input: Omit<PayOnlineDiscountSettings, "updatedAt">): Promise<PayOnlineDiscountSettings> {
  return adminApiRequest<PayOnlineDiscountSettings>("/admin/settings/pay-online-discount", { method: "PUT", body: JSON.stringify(input) });
}
