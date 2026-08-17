"use client";

import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { CloseIcon } from "@/components/icons";
import type { DashboardFilter, DashboardFilterOptions, DateRangePreset } from "@/data/admin/types";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "custom", label: "Custom" },
];

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  instagram: "Instagram",
  facebook: "Facebook",
  google_organic: "Google / Organic",
  meta_ads: "Meta Ads",
  youtube: "YouTube",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
};

const DEFAULT_FILTER_KEYS: (keyof DashboardFilter)[] = ["productId", "orderStatus", "state", "source"];

export function DashboardFilterBar({
  filter,
  options,
  datasetFrom,
  datasetTo,
  onChange,
  onReset,
}: {
  filter: DashboardFilter;
  options: DashboardFilterOptions | null;
  datasetFrom: string;
  datasetTo: string;
  onChange: (patch: Partial<DashboardFilter>) => void;
  onReset: () => void;
}) {
  const activeChips: { key: keyof DashboardFilter; label: string }[] = [];
  if (filter.productId) {
    const name = options?.products.find((p) => p.id === filter.productId)?.name ?? filter.productId;
    activeChips.push({ key: "productId", label: `Product: ${name}` });
  }
  if (filter.orderStatus) activeChips.push({ key: "orderStatus", label: `Status: ${STATUS_LABELS[filter.orderStatus]}` });
  if (filter.state) activeChips.push({ key: "state", label: `State: ${filter.state}` });
  if (filter.source) activeChips.push({ key: "source", label: `Source: ${SOURCE_LABELS[filter.source]}` });
  if (filter.compare) activeChips.push({ key: "compare", label: "Comparing to previous period" });
  const hasActiveFilters = DEFAULT_FILTER_KEYS.some((k) => filter[k]) || filter.compare || filter.preset !== "30d";

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">Date range</span>
          <div className="inline-flex flex-wrap rounded-lg border border-border-subtle p-0.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ preset: preset.value })}
                aria-pressed={filter.preset === preset.value}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out ${
                  filter.preset === preset.value
                    ? "bg-primary-orange text-white"
                    : "text-text-primary/70 hover:bg-cream-bg"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {filter.preset === "custom" && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
              From
              <input
                type="date"
                value={filter.from}
                min={datasetFrom}
                max={filter.to || datasetTo}
                onChange={(e) => onChange({ from: e.target.value })}
                className={ADMIN_INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
              To
              <input
                type="date"
                value={filter.to}
                min={filter.from || datasetFrom}
                max={datasetTo}
                onChange={(e) => onChange({ to: e.target.value })}
                className={ADMIN_INPUT_CLASS}
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 pb-1.5 text-xs font-semibold text-text-primary/70">
          <input
            type="checkbox"
            checked={filter.compare}
            onChange={(e) => onChange({ compare: e.target.checked })}
            className="h-4 w-4 rounded border-border-subtle accent-primary-orange"
          />
          Compare with previous period
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
          Product
          <select
            value={filter.productId ?? ""}
            onChange={(e) => onChange({ productId: e.target.value || undefined })}
            className={`${ADMIN_INPUT_CLASS} min-w-[10rem]`}
          >
            <option value="">All products</option>
            {options?.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
          Order status
          <select
            value={filter.orderStatus ?? ""}
            onChange={(e) => onChange({ orderStatus: (e.target.value || undefined) as DashboardFilter["orderStatus"] })}
            className={`${ADMIN_INPUT_CLASS} min-w-[9rem]`}
          >
            <option value="">All statuses</option>
            {options?.orderStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
          State
          <select
            value={filter.state ?? ""}
            onChange={(e) => onChange({ state: e.target.value || undefined })}
            className={`${ADMIN_INPUT_CLASS} min-w-[9rem]`}
          >
            <option value="">All states</option>
            {options?.states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
          Traffic source
          <select
            value={filter.source ?? ""}
            onChange={(e) => onChange({ source: (e.target.value || undefined) as DashboardFilter["source"] })}
            className={`${ADMIN_INPUT_CLASS} min-w-[9rem]`}
          >
            <option value="">All sources</option>
            {options?.sources.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
          >
            Clear all
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange(chip.key === "compare" ? { compare: false } : { [chip.key]: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-cream-bg px-2.5 py-1 text-xs font-medium text-text-primary transition-colors duration-150 ease-out hover:bg-peach-hero/60"
            >
              {chip.label}
              <CloseIcon width={10} height={10} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
