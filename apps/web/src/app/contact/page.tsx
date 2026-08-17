import type { Metadata } from "next";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactFormSection } from "@/components/contact/contact-form-section";
import { CommonQuestions } from "@/components/contact/common-questions";

export const metadata: Metadata = {
  title: "Contact | MyPetMart",
  description: "We're all ears. Even the floppy ones.",
};

export default function ContactPage() {
  return (
    <main className="flex-1">
      <ContactHero />
      <ContactFormSection />
      <CommonQuestions />
    </main>
  );
}
