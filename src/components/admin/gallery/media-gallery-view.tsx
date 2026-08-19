"use client";

import { MediaGrid } from "./media-grid";

export function MediaGalleryView() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Media Gallery</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          Upload images once and reuse them across Product listings without re-uploading.
        </p>
      </div>
      <MediaGrid mode="manage" />
    </div>
  );
}
