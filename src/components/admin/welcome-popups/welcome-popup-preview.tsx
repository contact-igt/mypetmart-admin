"use client";

import { CloseIcon } from "@/components/icons";
import type { WelcomePopupCtaMode, WelcomePopupTemplate } from "@/lib/api/admin-welcome-popup-api";

const PREVIEW_HEADING = "Unlock 10% off your first order";
const PREVIEW_DESCRIPTION = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Discover something special for your pet today.";

export type WelcomePopupPreviewContent = {
  template: WelcomePopupTemplate;
  heading: string;
  description: string;
  offerLabel: string;
  ctaMode: WelcomePopupCtaMode;
  ctaLabel: string;
  consentText: string;
  dismissLabel: string;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
};

function PreviewImage({ url }: { url: string | null }) {
  if (!url) return <div className="flex h-full min-h-[180px] w-full items-center justify-center bg-cream-bg text-xs text-text-primary/40">No image selected</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

function PreviewAction({ content, rounded }: { content: WelcomePopupPreviewContent; rounded: boolean }) {
  const shape = rounded ? "rounded-full" : "rounded-none";
  if (content.ctaMode === "navigation") return <div className={`mt-4 flex h-9 items-center justify-center ${shape} bg-primary-orange px-3 text-xs font-bold uppercase tracking-[0.04em] text-white`}>{content.ctaLabel || "Continue"}</div>;
  return <><div className={`mt-4 h-9 ${shape} border border-border-subtle bg-white px-3 text-sm leading-9 text-text-primary/40`}>Email address</div><div className={`mt-2 flex h-9 items-center justify-center ${shape} bg-primary-orange px-3 text-xs font-bold uppercase tracking-[0.04em] text-white`}>{content.ctaLabel || "Continue"}</div></>;
}

function Template1Preview({ content }: { content: WelcomePopupPreviewContent }) {
  const heading = content.heading || PREVIEW_HEADING;
  const description = content.description || PREVIEW_DESCRIPTION;
  const descriptionContent = <p className="mt-3 text-xs leading-snug text-text-primary/65">{description}</p>;
  return <div className="relative mx-auto grid min-h-[330px] w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-lg sm:grid-cols-[0.94fr_1.06fr]"><button type="button" aria-label="Close preview" className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text-primary/60 shadow"><CloseIcon width={14} height={14} /></button><div className="min-h-[330px]"><PreviewImage url={content.desktopImageUrl} /></div><div className="flex flex-col justify-center p-5"><h3 className="bg-gradient-to-r from-primary-orange to-deep-brown bg-clip-text text-2xl font-bold leading-[0.95] tracking-[-0.04em] text-transparent">{heading}</h3>{content.ctaMode === "navigation" && descriptionContent}<PreviewAction content={content} rounded />{content.ctaMode !== "navigation" && descriptionContent}{content.ctaMode === "email_signup" && content.consentText && <p className="mt-3 text-[10px] leading-snug text-text-primary/55">{content.consentText}</p>}{content.dismissLabel && <p className="mt-4 text-center text-xs font-semibold text-text-primary/70 underline">{content.dismissLabel}</p>}</div></div>;
}

function Template2Preview({ content }: { content: WelcomePopupPreviewContent }) {
  const heading = content.heading || PREVIEW_HEADING;
  const description = content.description || PREVIEW_DESCRIPTION;
  const descriptionContent = <p className="mt-3 line-clamp-9 text-xs leading-snug text-white/80">{description}</p>;
  return <div className="relative mx-auto grid min-h-[330px] w-full max-w-[520px] overflow-hidden rounded-xl shadow-lg sm:grid-cols-2"><button type="button" aria-label="Close preview" className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"><CloseIcon width={14} height={14} /></button><div className="h-full min-h-[330px] bg-primary-orange"><PreviewImage url={content.desktopImageUrl} /></div><div className="flex flex-col justify-center bg-deep-brown p-5 text-white"><h3 className="pr-7 text-2xl font-bold leading-[0.95] tracking-[-0.045em] text-white">{heading}</h3>{content.offerLabel && <p className="mt-4 text-2xl font-bold leading-[0.95] tracking-[-0.045em] text-primary-orange">{content.offerLabel}</p>}{content.ctaMode === "navigation" && descriptionContent}{content.ctaMode === "email_signup" && <div className="mt-4 h-9 bg-white px-3 text-sm leading-9 text-text-primary/40">Email address</div>}<div className="mt-2 flex h-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-bold uppercase tracking-[0.04em] text-deep-brown">{content.ctaLabel || "Continue"}</div>{content.ctaMode !== "navigation" && descriptionContent}{content.ctaMode === "email_signup" && content.consentText && <p className="mt-3 text-[10px] leading-snug text-white/65">{content.consentText}</p>}{content.dismissLabel && <p className="mt-4 text-center text-xs font-semibold underline">{content.dismissLabel}</p>}</div></div>;
}

export function WelcomePopupPreview({ content }: { content: WelcomePopupPreviewContent }) {
  return <div className="rounded-xl border border-border-subtle bg-cream-bg/60 p-6">{content.template === "template_2" ? <Template2Preview content={content} /> : <Template1Preview content={content} />}</div>;
}
