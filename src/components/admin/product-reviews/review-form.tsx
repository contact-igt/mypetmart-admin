"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminReview, type ReviewStatus } from "@/lib/api/admin-review-api";
import { describeAdminError, listAdminProducts, type ProductListItem } from "@/lib/api/admin-product-api";
import { reviewDateForCreate, todayInputValue } from "@/lib/review-date";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { useToast } from "../ui/toast";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

export function ReviewForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const today = todayInputValue();

  useEffect(() => {
    listAdminProducts({ pageSize: 100, status: "active", sort: "name", order: "ASC" })
      .then((result) => setProducts(result.items))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!productId) next.productId = "Select a Product.";
    if (!review.trim()) next.review = "Review content is required.";
    else if (review.trim().length > 5000) next.review = "Review must be 5000 characters or fewer.";
    if (title.trim().length > 160) next.title = "Title max 160 characters.";
    return next;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const localErrors = validate();
    if (Object.keys(localErrors).length) { setErrors(localErrors); return; }
    setSaving(true);
    setErrors({});
    try {
      const created = await createAdminReview({
        productId: Number(productId),
        customerName: customerName.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        review: review.trim(),
        reviewDate: reviewDateForCreate(reviewDate),
        status,
      });
      showToast("Review created.");
      router.push(`/admin/product-reviews/${created.id}`);
    } catch (cause) {
      showToast(describeAdminError(cause, "Could not create the review."), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product" htmlFor="r-product" error={errors.productId}>
            <select
              id="r-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={productsLoading}
              aria-invalid={Boolean(errors.productId)}
              className={ADMIN_INPUT_CLASS}
            >
              <option value="">{productsLoading ? "Loading products…" : "Select Product"}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Customer name" htmlFor="r-customer" optional hint="Shown in place of a real customer for this manually-added review.">
            <input id="r-customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={120} placeholder="e.g. Priya S." className={ADMIN_INPUT_CLASS} />
          </FormField>
          <FormField label="Rating" htmlFor="r-rating">
            <select id="r-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))} className={ADMIN_INPUT_CLASS}>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>)}
            </select>
          </FormField>
          <FormField label="Status" htmlFor="r-status">
            <select id="r-status" value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus)} className={ADMIN_INPUT_CLASS}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Review Date" htmlFor="r-review-date" optional hint="This is the date shown to customers. Leave blank to use the actual creation date.">
            <input id="r-review-date" type="date" value={reviewDate} max={today} onChange={(e) => setReviewDate(e.target.value)} className={ADMIN_INPUT_CLASS} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Review title" htmlFor="r-title" optional error={errors.title}>
              <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Sum up the review" className={ADMIN_INPUT_CLASS} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Review content" htmlFor="r-review" error={errors.review}>
              <textarea id="r-review" value={review} onChange={(e) => setReview(e.target.value)} rows={5} maxLength={5000} className={`${ADMIN_INPUT_CLASS} resize-y`} />
            </FormField>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Creating…" : "Create review"}
        </button>
        <button type="button" onClick={() => router.push("/admin/product-reviews")} className="rounded-lg border border-border-subtle px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
