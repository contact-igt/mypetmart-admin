"use client";

import { Drawer } from "../ui/drawer";
import { MediaGrid } from "./media-grid";
import type { MediaAsset, MediaAssetType } from "@/lib/api/admin-media-api";

export function MediaPickerDrawer({
  open,
  onClose,
  onSelect,
  // Defaults to images only — every current caller (Product images, Category
  // image) is an image-only field, so an omitted prop must keep exactly
  // today's image-safe behavior rather than exposing videos by accident.
  allowedTypes = ["image"],
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  allowedTypes?: MediaAssetType[];
}) {
  if (!open) return null;

  const title = allowedTypes.length === 1 && allowedTypes[0] === "video" ? "Choose a video from the Media Library" : "Choose from Media Gallery";

  return (
    <Drawer open={open} onClose={onClose} title={title} side="right" maxWidthClassName="max-w-2xl">
      <MediaGrid
        mode="pick"
        allowedTypes={allowedTypes}
        onSelect={(asset) => {
          onSelect(asset);
          onClose();
        }}
      />
    </Drawer>
  );
}
