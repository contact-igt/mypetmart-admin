"use client";

import { Drawer } from "../ui/drawer";
import { MediaGrid } from "./media-grid";
import type { MediaAsset } from "@/lib/api/admin-media-api";

export function MediaPickerDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Choose from Media Gallery" side="right" maxWidthClassName="max-w-2xl">
      <MediaGrid
        mode="pick"
        onSelect={(asset) => {
          onSelect(asset);
          onClose();
        }}
      />
    </Drawer>
  );
}
