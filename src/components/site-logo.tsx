import Image from "next/image";
import Link from "next/link";

/**
 * Uses the real brand artwork from public/assest/logo.png (mirrored from
 * mypetmart-frontend's public/assest/logo.png) so the admin shell matches the
 * storefront's actual logo instead of a hand-drawn reinterpretation. Always
 * rendered in its native navy/orange — the mark is never inverted to white,
 * including on the dark sidebar.
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center ${className ?? ""}`}
      aria-label="My Pet Mart — home"
    >
      <Image src="/assest/logo.png" alt="My Pet Mart" width={1332} height={276} priority className="h-9 w-auto" />
    </Link>
  );
}
