import { NewsletterCard } from "@/components/newsletter-card";
import { SiteLogo } from "@/components/site-logo";
import {
  PhoneIcon,
  MailIcon,
  PinIcon,
  InstagramIcon,
  FacebookIcon,
  TwitterIcon,
} from "@/components/icons";

const SOCIAL_LINKS = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "Facebook", icon: FacebookIcon },
  { label: "Twitter", icon: TwitterIcon },
];

export function SiteFooter() {
  return (
    <footer className="relative">
      <NewsletterCard />

      <div className="bg-deep-brown pt-24 pb-8 text-white sm:pt-28">
        <div className="site-container">
          <div className="flex flex-col gap-10 border-b border-white/15 pb-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <SiteLogo tone="inverted" />
            </div>

            <div className="space-y-3">
              <p className="eyebrow text-white/70">Get in touch</p>
              <ul className="body-copy space-y-2 text-sm text-white/90">
                <li className="flex items-center gap-2">
                  <PhoneIcon width={16} height={16} />
                  <span>+91 94440 25511</span>
                </li>
                <li className="flex items-center gap-2">
                  <MailIcon width={16} height={16} />
                  <span>mypetmartstore@gmail.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
                  <span>12A, JR Enclave, MGR Nagar, Ayyapakkam, Chennai – 600077</span>
                </li>
              </ul>
            </div>

            <div className="max-w-xs md:text-right">
              <p className="body-copy text-sm text-white/80">
                Thoughtfully selected pet-care essentials that make grooming,
                walking and everyday life easier for pet parents.
              </p>
              <div className="mt-4 flex gap-2 md:justify-end">
                {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 ease-out hover:bg-white/20"
                  >
                    <Icon width={16} height={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} My Pet Mart. Made with love for pet parents.</p>
            <p>Payments: UPI &middot; Visa &middot; Mastercard</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
