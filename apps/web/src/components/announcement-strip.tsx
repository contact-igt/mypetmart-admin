/**
 * Thin dark strip above the header (docs/DESIGN_SYSTEM.md §6/§20 item 7 —
 * present in every reference but its text is not legible at render
 * resolution). Copy reuses the site's neutral meta description rather than
 * inventing a delivery/offer claim.
 */
export function AnnouncementStrip() {
  return (
    <div className="bg-deep-brown py-2 text-center text-white">
      <p className="body-copy text-xs tracking-wide text-white/90">
        Thoughtfully selected pet-care essentials.
      </p>
    </div>
  );
}
