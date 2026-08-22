"use client";

import { useParams } from "next/navigation";
import { ContactEnquiryDetailView } from "@/components/admin/contact/contact-enquiry-detail-view";

export default function AdminContactEnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  return <ContactEnquiryDetailView enquiryId={params.id} />;
}
