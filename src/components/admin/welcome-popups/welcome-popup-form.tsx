"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activateAdminWelcomePopup,
  archiveAdminWelcomePopup,
  createAdminWelcomePopup,
  deactivateAdminWelcomePopup,
  duplicateAdminWelcomePopup,
  fetchAdminWelcomePopup,
  fetchWelcomePopupCouponOptions,
  publishAdminWelcomePopup,
  updateAdminWelcomePopup,
  type WelcomePopup,
  type WelcomePopupCtaMode,
  type WelcomePopupTemplate,
  type WelcomePopupCouponOption,
} from "@/lib/api/admin-welcome-popup-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import type { MediaAsset } from "@/lib/api/admin-media-api";
import { ArrowRightIcon, GridViewIcon, TrashIcon } from "@/components/icons";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ErrorState, LoadingState } from "../ui/empty-state";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { MediaPickerDrawer } from "../gallery/media-picker-drawer";
import { useToast } from "../ui/toast";
import { WelcomePopupPreview } from "./welcome-popup-preview";

type ImageField = {
  // undefined = untouched this session (do not send to the API on update);
  // null = explicitly cleared; number = a newly picked media asset id.
  pendingId: number | null | undefined;
  url: string | null;
  alt: string;
};

type FormState = {
  name: string;
  template: WelcomePopupTemplate;
  heading: string;
  description: string;
  offerLabel: string;
  couponId: string;
  ctaMode: WelcomePopupCtaMode;
  ctaLabel: string;
  ctaUrl: string;
  displayDelayMs: number;
  dismissalCooldownDays: number;
  consentText: string;
  dismissLabel: string;
  desktop: ImageField;
  mobile: ImageField;
};

const EMPTY_FORM: FormState = {
  name: "",
  template: "template_1",
  heading: "",
  description: "",
  offerLabel: "",
  couponId: "",
  ctaMode: "email_signup",
  ctaLabel: "Subscribe",
  ctaUrl: "",
  displayDelayMs: 1200,
  dismissalCooldownDays: 7,
  consentText: "",
  dismissLabel: "",
  desktop: { pendingId: undefined, url: null, alt: "" },
  mobile: { pendingId: undefined, url: null, alt: "" },
};

function fromPopup(popup: WelcomePopup): FormState {
  return {
    name: popup.name,
    template: popup.template,
    heading: popup.heading,
    description: popup.description,
    offerLabel: popup.offerLabel,
    couponId: popup.couponId ?? "",
    ctaMode: popup.ctaMode,
    ctaLabel: popup.ctaLabel,
    ctaUrl: popup.ctaUrl,
    displayDelayMs: popup.displayDelayMs,
    dismissalCooldownDays: popup.dismissalCooldownDays,
    consentText: popup.consentText,
    dismissLabel: popup.dismissLabel,
    desktop: { pendingId: undefined, url: popup.desktopImageUrl, alt: popup.desktopImageAlt },
    mobile: { pendingId: undefined, url: popup.mobileImageUrl, alt: popup.mobileImageAlt },
  };
}

function validationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AdminApiError) || !error.errors) return {};
  return Object.fromEntries(Object.entries(error.errors).map(([field, messages]) => [field, messages[0] ?? "Invalid value."]));
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return `${error.message}${error.requestId ? ` (request ${error.requestId})` : ""}`;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

const STATUS_LABEL: Record<WelcomePopup["status"], string> = { draft: "Draft", published: "Published", archived: "Archived" };
const STATUS_CLASS: Record<WelcomePopup["status"], string> = {
  draft: "border border-border-subtle bg-cream-bg text-text-primary/60",
  published: "bg-mint-sage text-text-primary",
  archived: "border border-border-subtle bg-cream-bg text-text-primary/40",
};

export function WelcomePopupForm({ popupId }: { popupId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = popupId !== undefined;

  const [popup, setPopup] = useState<WelcomePopup | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [galleryTarget, setGalleryTarget] = useState<"desktop" | "mobile" | null>(null);
  const [coupons, setCoupons] = useState<WelcomePopupCouponOption[]>([]);

  const loadPopup = useCallback(async () => {
    if (!popupId) return;
    setLoading(true);
    setLoadError("");
    try {
      const next = await fetchAdminWelcomePopup(popupId);
      setPopup(next);
      setForm(fromPopup(next));
      setDirty(false);
    } catch (error) {
      setLoadError(error instanceof AdminApiError && error.status === 404 ? "Welcome popup not found. It may have been removed." : errorMessage(error, "Could not load the popup."));
    } finally {
      setLoading(false);
    }
  }, [popupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; loadPopup is also the Retry handler
    void loadPopup();
  }, [loadPopup]);

  useEffect(() => {
    void fetchWelcomePopupCouponOptions()
      .then(setCoupons)
      .catch(() => setCoupons([]));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[field as string];
      return next;
    });
    setGeneralError("");
  }

  function selectGalleryAsset(asset: MediaAsset) {
    if (!galleryTarget) return;
    setForm((current) => ({
      ...current,
      [galleryTarget]: { pendingId: asset.id, url: asset.url, alt: asset.altText || asset.title || asset.originalName },
    }));
    setDirty(true);
    setGeneralError("");
    setGalleryTarget(null);
  }

  function removeImage(target: "desktop" | "mobile") {
    setForm((current) => ({ ...current, [target]: { pendingId: null, url: null, alt: "" } }));
    setDirty(true);
  }

  function updateImageAlt(target: "desktop" | "mobile", alt: string) {
    setForm((current) => ({ ...current, [target]: { ...current[target], alt } }));
    setDirty(true);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.heading.trim()) next.heading = "Heading is required.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (form.ctaMode === "navigation" && !form.ctaUrl.trim()) next.ctaUrl = "CTA URL is required for navigation.";
    if (form.ctaUrl.trim() && !/^https?:\/\//iu.test(form.ctaUrl.trim()) && !/^\/(?![\/\\])/u.test(form.ctaUrl.trim())) {
      next.ctaUrl = "CTA URL must be an absolute http(s) URL or start with '/'.";
    }
    if (!Number.isInteger(form.displayDelayMs) || form.displayDelayMs < 0 || form.displayDelayMs > 60_000) next.displayDelayMs = "Enter a delay from 0 to 60000 milliseconds.";
    if (!Number.isInteger(form.dismissalCooldownDays) || form.dismissalCooldownDays < 0 || form.dismissalCooldownDays > 365) next.dismissalCooldownDays = "Enter a cooldown from 0 to 365 days.";
    return next;
  }

  function buildInput() {
    return {
      name: form.name.trim(),
      template: form.template,
      heading: form.heading.trim(),
      description: form.description.trim() || null,
      offerLabel: form.offerLabel.trim() || null,
      couponId: form.couponId ? Number(form.couponId) : null,
      ctaMode: form.ctaMode,
      ctaLabel: form.ctaLabel.trim() || undefined,
      ctaUrl: form.ctaUrl.trim() || null,
      displayDelayMs: form.displayDelayMs,
      dismissalCooldownDays: form.dismissalCooldownDays,
      consentText: form.consentText.trim() || null,
      dismissLabel: form.dismissLabel.trim() || null,
      ...(form.desktop.pendingId !== undefined ? { desktopImageId: form.desktop.pendingId, desktopImageAlt: form.desktop.alt.trim() || null } : {}),
      ...(form.mobile.pendingId !== undefined ? { mobileImageId: form.mobile.pendingId, mobileImageAlt: form.mobile.alt.trim() || null } : {}),
    };
  }

  async function save() {
    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setGeneralError("Review the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError("");
    try {
      if (popupId) {
        const updated = await updateAdminWelcomePopup(popupId, buildInput());
        setPopup(updated);
        setForm(fromPopup(updated));
        showToast("Welcome popup updated.");
        setDirty(false);
      } else {
        const created = await createAdminWelcomePopup(buildInput());
        showToast("Welcome popup created as a draft.");
        setDirty(false);
        router.push(`/admin/welcome-popups/${created.id}/edit`);
      }
    } catch (error) {
      const nextErrors = validationErrors(error);
      const message = errorMessage(error, "Could not save this popup.");
      setErrors(nextErrors);
      setGeneralError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: string, run: () => Promise<WelcomePopup>, successMessage: string) {
    setBusyAction(action);
    try {
      const updated = await run();
      await loadPopup();
      showToast(successMessage);
    } catch (error) {
      showToast(errorMessage(error, "That action could not be completed."), "error");
    } finally {
      setBusyAction(null);
    }
  }

  function leaveForm() {
    if (dirty) setDiscardOpen(true);
    else router.push("/admin/welcome-popups");
  }

  const title = isEditing ? "Edit Welcome Popup" : "Add Welcome Popup";

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div role="status" aria-live="polite">
          <LoadingState label="Loading welcome popup…" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div role="alert">
          <ErrorState message={loadError} onRetry={loadPopup} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <button type="button" onClick={leaveForm} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-primary/65 transition-colors hover:text-text-primary">
          <ArrowRightIcon aria-hidden="true" width={14} height={14} className="rotate-180" />
          Back to Welcome Popups
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          {popup && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[popup.status]}`}>{STATUS_LABEL[popup.status]}</span>
          )}
          {popup?.isHomepageActive && <span className="inline-flex items-center rounded-full bg-primary-orange px-2.5 py-1 text-xs font-semibold text-white">Live on homepage</span>}
        </div>
        <p className="mt-1 text-sm text-text-primary/60">Only one popup can be active on the homepage at a time.</p>
      </div>

      {popup && (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-white p-4">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-text-primary/50">Actions</span>
          {popup.status === "draft" && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => runAction("publish", () => publishAdminWelcomePopup(popup.id), "Welcome popup published.")}
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
            >
              {busyAction === "publish" ? "Publishing…" : "Publish"}
            </button>
          )}
          {popup.status === "published" && !popup.isHomepageActive && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => setActivateConfirmOpen(true)}
              className="rounded-lg bg-primary-orange px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busyAction === "activate" ? "Activating…" : "Activate on homepage"}
            </button>
          )}
          {popup.isHomepageActive && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => runAction("deactivate", () => deactivateAdminWelcomePopup(popup.id), "Welcome popup removed from the homepage.")}
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
            >
              {busyAction === "deactivate" ? "Deactivating…" : "Deactivate"}
            </button>
          )}
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              runAction(
                "duplicate",
                async () => {
                  const copy = await duplicateAdminWelcomePopup(popup.id);
                  router.push(`/admin/welcome-popups/${copy.id}/edit`);
                  return copy;
                },
                "Duplicated as a new draft."
              )
            }
            className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
          >
            {busyAction === "duplicate" ? "Duplicating…" : "Duplicate"}
          </button>
          {popup.status !== "archived" && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => runAction("archive", () => archiveAdminWelcomePopup(popup.id), "Welcome popup archived.")}
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-terracotta hover:bg-terracotta/5 disabled:opacity-50"
            >
              {busyAction === "archive" ? "Archiving…" : "Archive"}
            </button>
          )}
        </section>
      )}

      {generalError && (
        <div role="alert" className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta">
          {generalError}
        </div>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_520px] 2xl:grid-cols-[minmax(0,1fr)_560px]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
          aria-busy={saving}
          className="flex min-w-0 flex-col gap-5 pb-24"
        >
          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Basic information</h2>
            <div className="grid min-w-0 gap-4">
              <FormField label="Internal name" htmlFor="popup-name" error={errors.name} hint="Shown only in this admin list — never on the storefront.">
                <input id="popup-name" value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={160} autoFocus={!isEditing} className={ADMIN_INPUT_CLASS} />
              </FormField>

              <FormField label="Template" htmlFor="popup-template">
                <select id="popup-template" value={form.template} onChange={(event) => update("template", event.target.value as WelcomePopupTemplate)} className={ADMIN_INPUT_CLASS}>
                  <option value="template_1">Template 1 — Rounded modal, email capture</option>
                  <option value="template_2">Template 2 — Discount panel</option>
                </select>
              </FormField>

              <FormField label="Heading" htmlFor="popup-heading" error={errors.heading}>
                <input id="popup-heading" value={form.heading} onChange={(event) => update("heading", event.target.value)} placeholder="Unlock 10% off your first order" maxLength={200} className={ADMIN_INPUT_CLASS} />
              </FormField>

              <FormField label="Description" htmlFor="popup-description" error={errors.description} hint="Required supporting text shown in the popup.">
                <textarea id="popup-description" rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the offer or explain where this button will take customers." className={`${ADMIN_INPUT_CLASS} resize-y`} />
              </FormField>

              {form.template === "template_2" && (
                <FormField label="Offer label" htmlFor="popup-offer-label" hint='Required to publish — the large discount text, e.g. "15% OFF".'>
                  <input id="popup-offer-label" value={form.offerLabel} onChange={(event) => update("offerLabel", event.target.value)} placeholder="15% OFF" maxLength={100} className={ADMIN_INPUT_CLASS} />
                </FormField>
              )}
              <FormField label="Coupon" htmlFor="popup-coupon" optional hint="Customers can copy or apply this existing coupon. Eligibility is checked in the cart.">
                <select id="popup-coupon" value={form.couponId} onChange={(event) => update("couponId", event.target.value)} className={ADMIN_INPUT_CLASS}>
                  <option value="">No coupon</option>
                  {form.couponId && popup?.couponCode && !coupons.some((coupon) => coupon.id === form.couponId) && <option value={form.couponId}>{popup.couponCode} (currently unavailable)</option>}
                  {coupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.code} - {coupon.name}</option>)}
                </select>
              </FormField>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Call to action</h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <FormField label="CTA behavior" htmlFor="popup-cta-mode">
                <select id="popup-cta-mode" value={form.ctaMode} onChange={(event) => update("ctaMode", event.target.value as WelcomePopupCtaMode)} className={ADMIN_INPUT_CLASS}>
                  <option value="email_signup">Email signup</option>
                  <option value="navigation">Navigate to a page</option>
                </select>
              </FormField>
              <FormField label="Button text" htmlFor="popup-cta-label">
                <input id="popup-cta-label" value={form.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} placeholder="Unlock offers" maxLength={60} className={ADMIN_INPUT_CLASS} />
              </FormField>
              {form.ctaMode === "navigation" && <FormField label="Button link" htmlFor="popup-cta-url" error={errors.ctaUrl} hint="A site page like /shop, or a full https:// address.">
                <input id="popup-cta-url" value={form.ctaUrl} onChange={(event) => update("ctaUrl", event.target.value)} placeholder="/shop or https://…" className={ADMIN_INPUT_CLASS} />
              </FormField>}
              {form.ctaMode === "email_signup" && (
                <div className="sm:col-span-2">
                  <FormField label="Consent text" htmlFor="popup-consent" optional hint="Shown beneath the button, e.g. marketing consent wording.">
                    <input id="popup-consent" value={form.consentText} onChange={(event) => update("consentText", event.target.value)} maxLength={500} className={ADMIN_INPUT_CLASS} />
                  </FormField>
                </div>
              )}
              <FormField label="Dismiss-button text" htmlFor="popup-dismiss" optional hint="For example: No, thanks. Leave blank to hide the dismiss link.">
                <input id="popup-dismiss" value={form.dismissLabel} onChange={(event) => update("dismissLabel", event.target.value)} maxLength={60} className={ADMIN_INPUT_CLASS} />
              </FormField>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Display timing</h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <FormField label="Display delay (milliseconds)" htmlFor="popup-display-delay" error={errors.displayDelayMs} hint="Delay before this popup opens. 0 to 60000."><input id="popup-display-delay" type="number" min={0} max={60000} step={1} value={form.displayDelayMs} onChange={(event) => update("displayDelayMs", Number(event.target.value))} className={ADMIN_INPUT_CLASS} /></FormField>
              <FormField label="Dismissal cooldown (days)" htmlFor="popup-dismissal-cooldown" error={errors.dismissalCooldownDays} hint="Days before a dismissed popup can show again. 0 to 365."><input id="popup-dismissal-cooldown" type="number" min={0} max={365} step={1} value={form.dismissalCooldownDays} onChange={(event) => update("dismissalCooldownDays", Number(event.target.value))} className={ADMIN_INPUT_CLASS} /></FormField>
            </div>
          </section>

          {(["desktop", "mobile"] as const).map((target) => (
            <section key={target} className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold capitalize text-text-primary">{target} image</h2>
                  <p className="mt-1 text-xs text-text-primary/50">
                    {target === "desktop" ? "Required to publish. Shown on desktop viewports." : "Optional — falls back to the desktop image on small screens."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryTarget(target)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg"
                >
                  <GridViewIcon width={14} /> Choose from Gallery
                </button>
              </div>

              {form[target].url ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form[target].url ?? undefined} alt={form[target].alt || `${target} image preview`} className="aspect-square w-32 shrink-0 rounded-lg border border-border-subtle bg-cream-bg object-cover" />
                  <div className="flex-1 space-y-3">
                    <FormField
                      label="Image alt text"
                      htmlFor={`popup-${target}-alt`}
                      optional
                      hint={form[target].pendingId === undefined ? "To change this image's alt text, choose it again from the gallery." : undefined}
                    >
                      <input
                        id={`popup-${target}-alt`}
                        value={form[target].alt}
                        onChange={(event) => updateImageAlt(target, event.target.value)}
                        disabled={form[target].pendingId === undefined}
                        className={`${ADMIN_INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
                      />
                    </FormField>
                    <button type="button" onClick={() => removeImage(target)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta">
                      <TrashIcon width={14} /> Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-primary/50">No {target} image yet.</p>
              )}
            </section>
          ))}

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 sm:justify-between">
              <p className="hidden text-xs text-text-primary/50 sm:block">{dirty ? "You have unsaved changes." : "No unsaved changes."}</p>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <button type="button" onClick={leaveForm} disabled={saving} className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-cream-bg disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create as draft"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="sticky top-4 self-start">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Preview</h2>
          <WelcomePopupPreview
            content={{
              template: form.template,
              heading: form.heading,
              description: form.description,
              offerLabel: form.offerLabel,
              ctaMode: form.ctaMode,
              ctaLabel: form.ctaLabel,
              consentText: form.consentText,
              dismissLabel: form.dismissLabel,
              desktopImageUrl: form.desktop.url,
              mobileImageUrl: form.mobile.url,
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => router.push("/admin/welcome-popups")}
        title="Discard unsaved changes?"
        description="Your unsaved changes will be lost."
        confirmLabel="Discard"
      />

      <ConfirmDialog
        open={activateConfirmOpen}
        onClose={() => setActivateConfirmOpen(false)}
        onConfirm={() => {
          setActivateConfirmOpen(false);
          if (popup) void runAction("activate", () => activateAdminWelcomePopup(popup.id), "Welcome popup is now live on the homepage.");
        }}
        title="Activate this popup on the homepage?"
        description="Only one popup can be active at a time. This will immediately replace whichever popup is currently showing on the homepage."
        confirmLabel="Activate"
        destructive={false}
      />

      <MediaPickerDrawer open={galleryTarget === "desktop"} onClose={() => setGalleryTarget(null)} onSelect={selectGalleryAsset} allowedTypes={["image"]} />
      <MediaPickerDrawer open={galleryTarget === "mobile"} onClose={() => setGalleryTarget(null)} onSelect={selectGalleryAsset} allowedTypes={["image"]} />
    </div>
  );
}
