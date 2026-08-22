import { AdminApiError, adminApiRequest } from "@/lib/api/admin-api-client";

export type MediaAssetType = "image" | "video";

export type MediaAsset = {
  id: number;
  fileName: string;
  originalName: string;
  storageKey?: string;
  url: string;
  mimeType: string;
  mediaType: MediaAssetType;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
  uploadedBy: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MediaAssetListResult = {
  items: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Duplicated from admin-product-api.ts rather than imported — each admin API
// client file is self-contained in this codebase (see admin-category-api.ts).
export function describeAdminError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return `${error.message}${error.requestId ? ` (request ${error.requestId})` : ""}`;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function listAdminMediaAssets(query: { page?: number; pageSize?: number; search?: string; type?: MediaAssetType }): Promise<MediaAssetListResult> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return adminApiRequest<MediaAssetListResult>(`/admin/media?${params.toString()}`);
}

export function getAdminMediaAsset(mediaAssetId: number | string): Promise<MediaAsset> {
  return adminApiRequest<MediaAsset>(`/admin/media/${encodeURIComponent(String(mediaAssetId))}`);
}

export function updateAdminMediaAsset(mediaAssetId: number, input: { altText?: string | null; title?: string | null }): Promise<MediaAsset> {
  return adminApiRequest<MediaAsset>(`/admin/media/${mediaAssetId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminMediaAsset(mediaAssetId: number): Promise<{ deleted: boolean; id: number }> {
  return adminApiRequest<{ deleted: boolean; id: number }>(`/admin/media/${mediaAssetId}`, { method: "DELETE" });
}

export const MEDIA_ASSET_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEDIA_ASSET_VIDEO_TYPES = ["video/mp4"] as const;
export const MEDIA_ASSET_ALL_TYPES = [...MEDIA_ASSET_TYPES, ...MEDIA_ASSET_VIDEO_TYPES] as const;
export const MEDIA_ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_ASSET_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

function isVideoMimeType(contentType: string): boolean {
  return (MEDIA_ASSET_VIDEO_TYPES as readonly string[]).includes(contentType);
}

export function validateMediaAssetFile(file: File): string | null {
  if (!(MEDIA_ASSET_ALL_TYPES as readonly string[]).includes(file.type)) {
    return "Use a JPEG, PNG, WebP image, or MP4 video.";
  }
  if (isVideoMimeType(file.type)) {
    if (file.size <= 0 || file.size > MEDIA_ASSET_VIDEO_MAX_BYTES) {
      return "MP4 video size must be between 1 byte and 50 MB.";
    }
    return null;
  }
  if (file.size <= 0 || file.size > MEDIA_ASSET_MAX_BYTES) {
    return "Image size must be between 1 byte and 5 MB.";
  }
  return null;
}

async function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (isVideoMimeType(file.type) || typeof createImageBitmap !== "function") return {};
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return {};
  }
}

type UploadAuthorization = {
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  r2Key: string;
  publicUrl: string;
  expiresAt: string;
  uploadToken: string;
};

export async function uploadAdminMediaAsset(
  file: File,
  options: { altText?: string; title?: string; onStage?: (stage: string) => void },
): Promise<MediaAsset> {
  const validationError = validateMediaAssetFile(file);
  if (validationError) throw new Error(validationError);

  options.onStage?.("Authorizing upload");
  const authorization = await adminApiRequest<UploadAuthorization>("/admin/media/uploads/presign", {
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
    throw new Error(`Cloudflare R2 rejected the upload (${uploadResponse.status}). The file was not added to the Media Gallery.`);
  }

  options.onStage?.("Verifying and saving to the Media Gallery");
  const dimensions = await readImageDimensions(file);
  return adminApiRequest<MediaAsset>("/admin/media/uploads/complete", {
    method: "POST",
    body: JSON.stringify({
      uploadToken: authorization.uploadToken,
      originalFilename: file.name,
      altText: options.altText?.trim() || undefined,
      title: options.title?.trim() || undefined,
      ...dimensions,
    }),
  });
}
