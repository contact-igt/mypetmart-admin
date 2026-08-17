"use client";

import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { StoreSettings } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { useToast } from "../ui/toast";
import { UsersIcon } from "@/components/icons";

function IntegrationPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <span className="rounded-full bg-yellow-card px-2.5 py-1 text-xs font-semibold text-text-primary">
          Integration required
        </span>
      </div>
      <p className="mt-2 text-sm text-text-primary/60">{description}</p>
    </div>
  );
}

/** Mounts only once `initial` has loaded, so its useState needs no reset effect. */
function StoreProfileForm({ initial }: { initial: StoreSettings }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminRepository.updateStoreSettings(form);
      showToast("Store profile saved.");
    } catch {
      showToast("Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-white p-5">
      <h2 className="text-sm font-semibold text-text-primary">Store profile</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Store name" htmlFor="s-name">
            <input
              id="s-name"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>
        </div>
        <FormField label="Support email" htmlFor="s-email">
          <input
            id="s-email"
            type="email"
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            className={ADMIN_INPUT_CLASS}
          />
        </FormField>
        <FormField label="Support phone" htmlFor="s-phone">
          <input
            id="s-phone"
            value={form.supportPhone}
            onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
            className={ADMIN_INPUT_CLASS}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Address" htmlFor="s-address">
            <input
              id="s-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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

export function SettingsView() {
  const fetcher = useCallback(() => adminRepository.getStoreSettings(), []);
  const { data, loading, error, reload } = useAdminData(fetcher);

  if (loading || !data) return <LoadingState label="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-primary/60">Store profile saves to this demo session. Everything else below needs a real backend.</p>
      </div>

      <StoreProfileForm initial={data} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Integrations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <IntegrationPlaceholder
            title="Payment gateway"
            description="Connect a gateway account to accept payments. Requires client-provided KYC and settlement details (docs/OPEN_ITEMS.md OI-001)."
          />
          <IntegrationPlaceholder
            title="Shipping partner"
            description="Connect a courier account for rate calculation and label generation (docs/OPEN_ITEMS.md OI-002)."
          />
          <IntegrationPlaceholder
            title="Cloudflare R2 (image storage)"
            description="Needed before real product photos can be uploaded from the Products form (OI-007)."
          />
          <IntegrationPlaceholder
            title="Analytics"
            description="Meta Pixel, Google Analytics and Microsoft Clarity — setup-only per the proposal, pending credentials."
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Admin users</h2>
        <div className="rounded-xl border border-dashed border-border-subtle bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep-brown text-white">
              <UsersIcon width={16} height={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Demo Admin</p>
              <p className="text-xs text-text-primary/50">Placeholder only — no accounts exist yet</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-text-primary/60">
            Admin user management needs JWT auth (M2) before real accounts, roles or invitations can be added here.
          </p>
        </div>
      </div>
    </div>
  );
}
