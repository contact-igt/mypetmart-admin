"use client";

import { ImagePlaceholder } from "@/components/image-placeholder";
import { PhoneIcon, MailIcon, PinIcon, InstagramIcon, ArrowRightIcon } from "@/components/icons";
import { CONTACT_INFO, ENQUIRY_TYPES } from "@/data/contact-data";

/**
 * No backend enquiry endpoint exists yet (M3/M5 are unbuilt), so submission
 * is a safe no-op — same cosmetic pattern as the hero search and newsletter
 * forms elsewhere in the shell, per docs/DESIGN_SYSTEM.md §8.
 */
export function ContactFormSection() {
  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <form onSubmit={(event) => event.preventDefault()} className="warm-card">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="eyebrow text-text-primary/60">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="field-control mt-2"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="eyebrow text-text-primary/60">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="field-control mt-2"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="eyebrow text-text-primary/60">
                Phone (optional)
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="field-control mt-2"
              />
            </div>
            <div>
              <label htmlFor="contact-enquiry" className="eyebrow text-text-primary/60">
                Enquiry type
              </label>
              <select id="contact-enquiry" name="enquiryType" className="field-control mt-2">
                {ENQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-order" className="eyebrow text-text-primary/60">
                Order number (optional)
              </label>
              <input id="contact-order" name="orderNumber" type="text" className="field-control mt-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className="eyebrow text-text-primary/60">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                className="field-control mt-2 h-auto resize-none py-3"
              />
            </div>
          </div>

          <label className="body-copy mt-5 flex items-start gap-2 text-sm text-text-primary/80">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-0.5 h-4 w-4 accent-primary-orange"
            />
            I agree to be contacted about my enquiry. We respect your inbox.
          </label>

          <button type="submit" className="button-primary mt-6 w-full sm:w-auto">
            Send message <ArrowRightIcon width={16} height={16} />
          </button>
        </form>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <ImagePlaceholder
              label="Close-up of a ginger cat's face"
              tone="brown"
              className="aspect-[16/9] w-full"
            />
            <span className="absolute left-4 top-4 pill-label bg-white text-text-primary">Say hi</span>
            <span className="display-heading absolute bottom-4 left-4 text-xl text-white">
              We love pet mail.
            </span>
          </div>

          <div className="warm-card flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-hero text-text-primary">
                <PhoneIcon width={16} height={16} />
              </span>
              <div>
                <p className="eyebrow text-text-primary/60">Phone</p>
                <p className="body-copy text-text-primary">{CONTACT_INFO.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-hero text-text-primary">
                <MailIcon width={16} height={16} />
              </span>
              <div>
                <p className="eyebrow text-text-primary/60">Email</p>
                <p className="body-copy text-text-primary">{CONTACT_INFO.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-hero text-text-primary">
                <PinIcon width={16} height={16} />
              </span>
              <div>
                <p className="eyebrow text-text-primary/60">Address</p>
                <p className="body-copy text-text-primary">{CONTACT_INFO.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-yellow-card px-5 py-4">
            <div>
              <p
                className="italic text-text-primary"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                Follow the pack
              </p>
              <p className="body-copy text-sm text-text-primary/70">
                {CONTACT_INFO.instagramHandle} on Instagram
              </p>
            </div>
            <InstagramIcon width={20} height={20} className="shrink-0 text-text-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
