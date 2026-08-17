"use client";

import { useState } from "react";
import { AnnouncementStrip } from "@/components/announcement-strip";
import { SiteLogo } from "@/components/site-logo";
import { PrimaryNav } from "@/components/primary-nav";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import { IconButton } from "@/components/icon-button";
import {
  SearchIcon,
  HeartIcon,
  UserIcon,
  BagIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/icons";

export function SiteHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream-bg">
      <AnnouncementStrip />

      <div className="site-container flex h-20 items-center justify-between sm:h-24">
        <SiteLogo />

        <PrimaryNav className="hidden md:block" />

        <div className="flex items-center gap-1">
          <IconButton label="Search" hideBelowSm>
            <SearchIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Wishlist" hideBelowSm>
            <HeartIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Account" hideBelowSm>
            <UserIcon width={20} height={20} />
          </IconButton>
          <IconButton label="Cart" variant="solid">
            <BagIcon width={19} height={19} />
          </IconButton>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-white/60 md:hidden"
          >
            {mobileNavOpen ? (
              <CloseIcon width={20} height={20} />
            ) : (
              <MenuIcon width={20} height={20} />
            )}
          </button>
        </div>
      </div>

      <MobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}
