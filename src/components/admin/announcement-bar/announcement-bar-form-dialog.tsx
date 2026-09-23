"use client";

import { useState } from "react";
import type { AnnouncementBarItem, AnnouncementBarItemInput } from "@/lib/api/admin-announcement-bar-api";
import { Dialog } from "../ui/dialog";

// <input type="datetime-local"> takes/returns "YYYY-MM-DDTHH:mm" in the
// browser's local time zone — converted to/from the ISO 8601 UTC strings the
// backend's z.string().datetime() schema requires.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AnnouncementBarFormDialog({
  open,
  onClose,
  onSubmit,
  item,
  saving,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AnnouncementBarItemInput) => void;
  item: AnnouncementBarItem | null;
  saving: boolean;
  errorMessage: string | null;
}) {
  const [message, setMessage] = useState(item?.message ?? "");
  const [linkEnabled, setLinkEnabled] = useState(Boolean(item?.linkUrl));
  const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(item?.linkLabel ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(item?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(item?.endsAt ?? null));
  const [messageError, setMessageError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Re-seed local state every time the dialog transitions from closed to open
  // (not just when a different item is targeted) — this component instance
  // stays mounted between opens, and two consecutive "Add" opens both have
  // item === null, so identity alone can't detect the second one.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setMessage(item?.message ?? "");
    setLinkEnabled(Boolean(item?.linkUrl));
    setLinkUrl(item?.linkUrl ?? "");
    setLinkLabel(item?.linkLabel ?? "");
    setActive(item?.active ?? true);
    setStartsAt(toLocalInputValue(item?.startsAt ?? null));
    setEndsAt(toLocalInputValue(item?.endsAt ?? null));
    setMessageError(null);
    setLinkError(null);
    setScheduleError(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setMessageError("Message is required.");
      return;
    }
    if (trimmed.length > 200) {
      setMessageError("Message cannot exceed 200 characters.");
      return;
    }
    setMessageError(null);

    const trimmedLinkUrl = linkUrl.trim();
    if (linkEnabled) {
      if (!trimmedLinkUrl) {
        setLinkError("Enter a link, or turn the link off.");
        return;
      }
      if (!/^https?:\/\//iu.test(trimmedLinkUrl) && !trimmedLinkUrl.startsWith("/")) {
        setLinkError("Link must be an absolute http(s) URL or start with '/'.");
        return;
      }
    }
    setLinkError(null);

    if (startsAt && endsAt && endsAt <= startsAt) {
      setScheduleError("End date must be after the start date.");
      return;
    }
    setScheduleError(null);

    onSubmit({
      message: trimmed,
      linkUrl: linkEnabled ? trimmedLinkUrl : null,
      // A button label only means something alongside an actual link.
      linkLabel: linkEnabled ? linkLabel.trim() || null : null,
      active,
      startsAt: fromLocalInputValue(startsAt),
      endsAt: fromLocalInputValue(endsAt),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={item ? "Edit announcement" : "Add announcement"} maxWidthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="announcement-message" className="text-sm font-medium text-text-primary">
            Message
          </label>
          <input
            id="announcement-message"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={200}
            placeholder="Free shipping on orders over ₹999"
            className="mt-1.5 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange"
          />
          <div className="mt-1 flex items-center justify-between">
            {messageError ? (
              <p className="text-xs text-terracotta">{messageError}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-text-primary/50">{message.length}/200</p>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle p-3">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-text-primary">Add a link</span>
              <span className="block text-xs text-text-primary/50">Turn on to link this announcement to a page and show a button.</span>
            </span>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                aria-checked={linkEnabled}
                checked={linkEnabled}
                onChange={(event) => {
                  setLinkEnabled(event.target.checked);
                  setLinkError(null);
                  if (!event.target.checked) {
                    setLinkUrl("");
                    setLinkLabel("");
                  }
                }}
                className="peer sr-only"
              />
              <span className="pointer-events-none absolute inset-0 rounded-full bg-border-subtle transition-colors duration-150 ease-out peer-checked:bg-primary-orange" />
              <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out peer-checked:translate-x-5" />
            </span>
          </label>

          {linkEnabled && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">
              <div>
                <label htmlFor="announcement-link" className="text-sm font-medium text-text-primary">
                  Link
                </label>
                <input
                  id="announcement-link"
                  type="text"
                  value={linkUrl}
                  onChange={(event) => {
                    setLinkUrl(event.target.value);
                    setLinkError(null);
                  }}
                  placeholder="/shop or https://…"
                  aria-invalid={Boolean(linkError)}
                  className="mt-1.5 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange"
                />
                {linkError ? <p className="mt-1 text-xs text-terracotta">{linkError}</p> : <p className="mt-1 text-xs text-text-primary/50">A site page like /shop, or a full https:// address.</p>}
              </div>

              <div>
                <label htmlFor="announcement-link-label" className="text-sm font-medium text-text-primary">
                  Button text (optional)
                </label>
                <input
                  id="announcement-link-label"
                  type="text"
                  value={linkLabel}
                  onChange={(event) => setLinkLabel(event.target.value)}
                  maxLength={60}
                  placeholder="Shop Now"
                  className="mt-1.5 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange"
                />
                <p className="mt-1 text-xs text-text-primary/50">
                  Shown as its own link after the message, e.g. “Shop Now →”. Leave blank to make the whole message the link instead.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="announcement-starts" className="text-sm font-medium text-text-primary">
              Starts (optional)
            </label>
            <input
              id="announcement-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => {
                setStartsAt(event.target.value);
                setScheduleError(null);
              }}
              aria-invalid={Boolean(scheduleError)}
              className="mt-1.5 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange"
            />
          </div>
          <div>
            <label htmlFor="announcement-ends" className="text-sm font-medium text-text-primary">
              Ends (optional)
            </label>
            <input
              id="announcement-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => {
                setEndsAt(event.target.value);
                setScheduleError(null);
              }}
              aria-invalid={Boolean(scheduleError)}
              className="mt-1.5 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange"
            />
          </div>
        </div>
        {scheduleError ? <p className="-mt-2 text-xs text-terracotta">{scheduleError}</p> : <p className="-mt-2 text-xs text-text-primary/50">Leave both blank to show this message with no schedule limit.</p>}

        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-border-subtle text-primary-orange focus:ring-primary-orange"
          />
          Active
        </label>

        {errorMessage && <p className="text-sm text-terracotta">{errorMessage}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : item ? "Save changes" : "Add announcement"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
