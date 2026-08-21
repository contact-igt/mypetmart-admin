"use client";

import { useCallback, useState } from "react";
import {
  getIntegrationsStatus,
  getStoreProfile,
  listAdminUsers,
  updateStoreProfile,
  type IntegrationsStatus,
} from "@/lib/api/admin-settings-api";
import type { SafeAdminUser } from "@/lib/auth/admin-auth-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import type { StoreSettings } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { useToast } from "../ui/toast";
import { UsersIcon } from "@/components/icons";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors mypetmart-backend's storeProfileSchema (SettingsModels/settings.validation.ts)
// so obviously-invalid input never round-trips to the server at all.
function validateStoreProfile(form: StoreSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  const storeName = form.storeName.trim();
  const supportEmail = form.supportEmail.trim();
  const supportPhone = form.supportPhone.trim();
  const address = form.address.trim();

  if (!storeName) errors.storeName = "Store name is required.";
  else if (storeName.length > 120) errors.storeName = "Store name cannot exceed 120 characters.";

  if (!supportEmail) errors.supportEmail = "Support email is required.";
  else if (!EMAIL_PATTERN.test(supportEmail)) errors.supportEmail = "Enter a valid email address.";
  else if (supportEmail.length > 190) errors.supportEmail = "Support email cannot exceed 190 characters.";

  if (!supportPhone) errors.supportPhone = "Support phone is required.";
  else if (supportPhone.length > 30) errors.supportPhone = "Support phone cannot exceed 30 characters.";

  if (!address) errors.address = "Address is required.";
  else if (address.length > 500) errors.address = "Address cannot exceed 500 characters.";

  return errors;
}

function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AdminApiError) || !error.errors) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => [field, messages[0] ?? "Invalid value."]),
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message;
  return error instanceof Error && error.message ? error.message : fallback;
}

type SettingsData = {
  profile: StoreSettings;
  integrations: IntegrationsStatus;
  admins: SafeAdminUser[];
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

// Currently unused — the Integrations section that renders this is commented
// out below (SettingsView). Kept, not deleted, alongside it for a one-line restore.
function IntegrationCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: { provider: string | null; ready: boolean };
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            status.ready ? "bg-mint-sage text-text-primary" : "bg-yellow-card text-text-primary"
          }`}
        >
          {status.ready ? "Connected" : "Integration required"}
        </span>
      </div>
      <p className="mt-2 text-sm text-text-primary/60">
        {status.ready && status.provider
          ? `Connected via ${status.provider.replace(/_/g, " ")}.`
          : description}
      </p>
    </div>
  );
}

/** Mounts only once `initial` has loaded, so its useState needs no reset effect. */
function StoreProfileForm({ initial }: { initial: StoreSettings }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  function update<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setGeneralError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const localErrors = validateStoreProfile(form);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setGeneralError("Review the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError("");
    try {
      const saved = await updateStoreProfile({
        storeName: form.storeName.trim(),
        supportEmail: form.supportEmail.trim().toLowerCase(),
        supportPhone: form.supportPhone.trim(),
        address: form.address.trim(),
      });
      setForm(saved);
      showToast("Store profile saved.");
    } catch (error) {
      const message = errorMessage(error, "Could not save settings.");
      setErrors(fieldErrors(error));
      setGeneralError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-border-subtle bg-white p-5">
      <h2 className="text-sm font-semibold text-text-primary">Store profile</h2>

      {generalError && (
        <div role="alert" className="mt-3 rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta">
          {generalError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Store name" htmlFor="s-name" error={errors.storeName}>
            <input
              id="s-name"
              value={form.storeName}
              onChange={(e) => update("storeName", e.target.value)}
              maxLength={120}
              aria-invalid={Boolean(errors.storeName)}
              aria-describedby={errors.storeName ? "s-name-error" : undefined}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>
        </div>
        <FormField label="Support email" htmlFor="s-email" error={errors.supportEmail}>
          <input
            id="s-email"
            type="email"
            value={form.supportEmail}
            onChange={(e) => update("supportEmail", e.target.value)}
            maxLength={190}
            aria-invalid={Boolean(errors.supportEmail)}
            aria-describedby={errors.supportEmail ? "s-email-error" : undefined}
            className={ADMIN_INPUT_CLASS}
          />
        </FormField>
        <FormField label="Support phone" htmlFor="s-phone" error={errors.supportPhone}>
          <input
            id="s-phone"
            value={form.supportPhone}
            onChange={(e) => update("supportPhone", e.target.value)}
            maxLength={30}
            aria-invalid={Boolean(errors.supportPhone)}
            aria-describedby={errors.supportPhone ? "s-phone-error" : undefined}
            className={ADMIN_INPUT_CLASS}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Address" htmlFor="s-address" error={errors.address}>
            <input
              id="s-address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              maxLength={500}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "s-address-error" : undefined}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>
        </div>
      </div>
      <div className="mt-5 flex justify-end border-t border-border-subtle pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function AdminUsersList({ admins }: { admins: SafeAdminUser[] }) {
  if (admins.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-white p-5 text-sm text-text-primary/60">
        No admin accounts found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-white">
      {admins.map((admin) => (
        <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep-brown text-white">
              <UsersIcon width={16} height={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">{admin.name}</p>
              <p className="text-xs text-text-primary/50">{admin.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-primary/60">
            <span className="rounded-full bg-cream-bg px-2.5 py-1 font-semibold capitalize text-text-primary">
              {admin.role.replace(/_/g, " ")}
            </span>
            <span>{admin.lastLoginAt ? `Last login ${dateFormatter.format(new Date(admin.lastLoginAt))}` : "Never signed in"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsView() {
  const fetcher = useCallback(
    async (): Promise<SettingsData> => {
      const [profile, integrations, admins] = await Promise.all([
        getStoreProfile(),
        getIntegrationsStatus(),
        listAdminUsers(),
      ]);
      return { profile, integrations, admins };
    },
    [],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  if (loading || !data) return <LoadingState label="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-primary/60">Store profile, integration status and admin accounts.</p>
      </div>

      <StoreProfileForm initial={data.profile} />

      {/*
        Integrations section commented out per product decision — not shown
        to admins right now. Payment gateway / Shipping partner / Cloudflare
        R2 status was wired to real config (paymentConfig.ready /
        shippingConfig.ready / r2Config.ready from mypetmart-backend);
        Analytics was always a stub (no Meta Pixel / GA / Clarity config
        exists anywhere in this system — see CLAUDE.md's scope exclusions).
        Left in place, not deleted, for a one-line restore.

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Integrations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <IntegrationCard
            title="Payment gateway"
            description="Connect a gateway account to accept payments. Requires client-provided KYC and settlement details (docs/OPEN_ITEMS.md OI-001)."
            status={data.integrations.paymentGateway}
          />
          <IntegrationCard
            title="Shipping partner"
            description="Connect a courier account for rate calculation and label generation (docs/OPEN_ITEMS.md OI-002)."
            status={data.integrations.shippingPartner}
          />
          <IntegrationCard
            title="Cloudflare R2 (image storage)"
            description="Needed before real product photos can be uploaded from the Products form (OI-007)."
            status={data.integrations.imageStorage}
          />
          <IntegrationCard
            title="Analytics"
            description="Meta Pixel, Google Analytics and Microsoft Clarity — setup-only per the proposal, pending credentials."
            status={data.integrations.analytics}
          />
        </div>
      </div>
      */}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Admin users</h2>
        <AdminUsersList admins={data.admins} />
        <p className="mt-2 text-xs text-text-primary/50">
          Invite/create flows for new admin accounts aren&apos;t built yet — this lists real accounts only.
        </p>
      </div>
    </div>
  );
}
