import { AdminApiError, adminApiRequest } from "@/lib/api/admin-api-client";

export type ProductStatus = "active" | "draft" | "archived";
export type ProductListStatus = ProductStatus | "deleted";
export type PetType = "dog" | "cat" | "all";
export type StockLevel = "in_stock" | "low_stock" | "out_of_stock";
export type ProductSort = "created_at" | "price" | "name" | "stock";

export type ProductImage = {
  id: number;
  r2Key?: string;
  mediaAssetId: number | null;
  url: string;
  alt: string;
  contentType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductVariant = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  active: boolean;
  displayOrder: number;
  weightGrams: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListItem = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  petType: PetType;
  status: ProductStatus;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  hasVariants: boolean;
  featured: boolean;
  weightGrams: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  variantCount: number;
  category: { id: number; name: string; slug: string; petType: PetType };
  primaryImage: ProductImage | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  restorable: boolean;
  restoreBlockedReason: string | null;
};

export type ProductDetail = ProductListItem & {
  description: string;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
};

export type VariantInput = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice?: string | null;
  stock?: number;
  active?: boolean;
  displayOrder?: number;
  weightGrams?: number | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
};

export type ProductInput = {
  categoryId: number;
  name: string;
  sku: string;
  brand?: string | null;
  description: string;
  petType: PetType;
  price?: string;
  compareAtPrice?: string | null;
  stock?: number;
  featured: boolean;
  tags: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  weightGrams?: number | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
};

// Mirrors backend/src/models/ProductModels/product.validation.ts exactly.
export function slugifyProductName(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export type CreateProductInput = ProductInput & {
  status: ProductStatus;
  hasVariants: boolean;
  variants?: VariantInput[];
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductSummary = {
  total: number;
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
};

function productPath(productId: number | string): string {
  return `/admin/products/${encodeURIComponent(String(productId))}`;
}

export function describeAdminError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return `${error.message}${error.requestId ? ` (request ${error.requestId})` : ""}`;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function firstValidationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AdminApiError) || !error.errors) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([key, messages]) => [key, messages[0] ?? "Invalid value"]),
  );
}

export async function listAdminProducts(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  status?: ProductListStatus;
  petType?: PetType;
  stockLevel?: StockLevel;
  sort?: ProductSort;
  order?: "ASC" | "DESC";
}): Promise<ProductListResult> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return adminApiRequest<ProductListResult>(`/admin/products?${params.toString()}`);
}

export function getAdminProductSummary(): Promise<ProductSummary> {
  return adminApiRequest<ProductSummary>("/admin/products/summary");
}

export function getAdminProduct(productId: number | string): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>(productPath(productId));
}

export function createAdminProduct(input: CreateProductInput): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>("/admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminProduct(productId: number | string, input: Partial<ProductInput>): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>(productPath(productId), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setAdminProductStatus(productId: number | string, status: ProductStatus): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>(`${productPath(productId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminProduct(productId: number | string): Promise<{ message: string }> {
  return adminApiRequest<{ message: string }>(productPath(productId), { method: "DELETE" });
}

export function restoreAdminProduct(productId: number | string): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>(`${productPath(productId)}/restore`, { method: "PATCH" });
}

export function duplicateAdminProduct(productId: number | string): Promise<ProductDetail> {
  return adminApiRequest<ProductDetail>(`${productPath(productId)}/duplicate`, { method: "POST" });
}

export function bulkSetAdminProductStatus(productIds: number[], status: ProductStatus): Promise<{ affected: number }> {
  return adminApiRequest<{ affected: number }>("/admin/products/bulk-status", {
    method: "PATCH",
    body: JSON.stringify({ productIds, status }),
  });
}

export function bulkDeleteAdminProducts(productIds: number[]): Promise<{ affected: number }> {
  return adminApiRequest<{ affected: number }>("/admin/products/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ productIds }),
  });
}

export function createAdminVariant(productId: number, input: VariantInput): Promise<ProductVariant> {
  return adminApiRequest<ProductVariant>(`${productPath(productId)}/variants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminVariant(productId: number, variantId: number, input: Partial<VariantInput>): Promise<ProductVariant> {
  return adminApiRequest<ProductVariant>(`${productPath(productId)}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminVariant(productId: number, variantId: number): Promise<{ message: string }> {
  return adminApiRequest<{ message: string }>(`${productPath(productId)}/variants/${variantId}`, { method: "DELETE" });
}

export function reorderAdminVariants(productId: number, orderedIds: number[]): Promise<ProductVariant[]> {
  return adminApiRequest<ProductVariant[]>(`${productPath(productId)}/variants/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

type PendingProductImageBase = {
  key: string;
  alt: string;
  previewUrl: string;
  isPrimary: boolean;
};

// A pending image queued before the Product exists (New Product page) is
// either a local file waiting to upload, or an existing Media Gallery asset
// waiting to be attached once the Product has an ID — see
// attachAdminProductImageFromGallery below, which is reused as-is for the
// gallery branch (no re-upload, no new backend endpoint).
export type PendingProductImage =
  | (PendingProductImageBase & { source: "file"; file: File })
  | (PendingProductImageBase & { source: "gallery"; mediaAssetId: number });

type UploadAuthorization = {
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  r2Key: string;
  publicUrl: string;
  expiresAt: string;
  uploadToken: string;
};

export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProductImage(file: File): string | null {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_TYPES)[number])) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "Image size must be between 1 byte and 5 MB.";
  }
  return null;
}

async function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap !== "function") return {};
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return {};
  }
}

export async function uploadAdminProductImage(
  productId: number,
  file: File,
  options: { alt: string; isPrimary?: boolean; onStage?: (stage: string) => void },
): Promise<ProductImage> {
  const validationError = validateProductImage(file);
  if (validationError) throw new Error(validationError);
  if (!options.alt.trim()) throw new Error("Alt text is required before upload.");

  options.onStage?.("Authorizing upload");
  const authorization = await adminApiRequest<UploadAuthorization>(`${productPath(productId)}/images/uploads/presign`, {
    method: "POST",
    body: JSON.stringify({ originalFilename: file.name, contentType: file.type, sizeBytes: file.size }),
  });

  options.onStage?.("Uploading to Cloudflare R2");
  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(authorization.uploadUrl, {
      method: authorization.method,
      headers: authorization.requiredHeaders,
      body: file,
      credentials: "omit",
    });
  } catch {
    throw new Error("The browser could not reach Cloudflare R2. Check network access and the R2 CORS policy, then retry.");
  }
  if (!uploadResponse.ok) {
    throw new Error(`Cloudflare R2 rejected the upload (${uploadResponse.status}). The Product was not linked to this object.`);
  }

  options.onStage?.("Verifying and attaching image");
  const dimensions = await readImageDimensions(file);
  return adminApiRequest<ProductImage>(`${productPath(productId)}/images/uploads/complete`, {
    method: "POST",
    body: JSON.stringify({
      uploadToken: authorization.uploadToken,
      alt: options.alt.trim(),
      isPrimary: options.isPrimary,
      ...dimensions,
    }),
  });
}

export function attachAdminProductImageFromGallery(
  productId: number,
  input: { mediaAssetId: number; alt?: string; isPrimary?: boolean },
): Promise<ProductImage> {
  return adminApiRequest<ProductImage>(`${productPath(productId)}/images/attach-from-gallery`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminProductImage(productId: number, imageId: number, input: { alt?: string; isPrimary?: boolean; sortOrder?: number }): Promise<ProductImage> {
  return adminApiRequest<ProductImage>(`${productPath(productId)}/images/${imageId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function reorderAdminProductImages(productId: number, orderedIds: number[]): Promise<ProductImage[]> {
  return adminApiRequest<ProductImage[]>(`${productPath(productId)}/images/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

export function deleteAdminProductImage(productId: number, imageId: number): Promise<{ message: string }> {
  return adminApiRequest<{ message: string }>(`${productPath(productId)}/images/${imageId}`, { method: "DELETE" });
}
