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
