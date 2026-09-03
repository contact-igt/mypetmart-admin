// Review Date (Stage 2) — small pure helpers shared by the Admin review form,
// list and detail views.
//
// `reviewDate` is a DATEONLY value ("YYYY-MM-DD"): a calendar date with no time
// and no timezone. It is formatted here by splitting the string — never via
// `new Date("YYYY-MM-DD")`, which parses as UTC midnight and can render the
// previous day in a negative-offset timezone. `createdAt` / `updatedAt` stay
// real ISO timestamps and keep the existing `new Date(iso).toLocale*` handling.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-08-14" -> "14 Aug 2026". Matches the Admin list/detail date style
// (`{ day: "2-digit", month: "short", year: "numeric" }`) without touching Date.
export function formatReviewDateOnly(value: string): string {
  if (!DATE_ONLY.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const monthLabel = MONTHS[month - 1];
  if (!monthLabel || day < 1 || day > 31) return value;
  return `${String(day).padStart(2, "0")} ${monthLabel} ${year}`;
}

// An ISO timestamp -> date-only display, identical to the existing per-component
// `formatDate` helpers so a fallback render looks the same as before.
export function formatTimestampDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// What the Admin list's "Review date" column shows: the customer-facing date —
// the admin-set review date when present, otherwise the real creation date.
export function resolveDisplayReviewDate(review: { reviewDate: string | null; createdAt: string }): string {
  return review.reviewDate ? formatReviewDateOnly(review.reviewDate) : formatTimestampDate(review.createdAt);
}

// Today as a local "YYYY-MM-DD" — for a native <input type="date" max=…>. Uses
// the browser's local date, consistent with the other Admin date inputs.
export function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Add Review: a blank field must NOT become today. Send the value only when the
// admin actually picked one; otherwise omit it so the backend stores NULL.
export function reviewDateForCreate(formValue: string): string | undefined {
  return formValue ? formValue : undefined;
}

// Edit Review: turn "original stored value" + "current field value" into the
// minimal PATCH fragment, preserving the backend's tri-state:
//   unchanged        -> {}                       (backend leaves review_date as-is)
//   cleared          -> { reviewDate: null }     (backend clears it)
//   set / changed    -> { reviewDate: "…" }      (backend sets it)
export function reviewDatePatch(
  originalReviewDate: string | null,
  formValue: string
): { reviewDate?: string | null } {
  const original = originalReviewDate ?? "";
  if (formValue === original) return {};
  if (formValue === "") return { reviewDate: null };
  return { reviewDate: formValue };
}
