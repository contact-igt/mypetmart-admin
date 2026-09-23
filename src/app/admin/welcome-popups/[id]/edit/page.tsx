"use client";

import { useParams } from "next/navigation";
import { WelcomePopupForm } from "@/components/admin/welcome-popups/welcome-popup-form";

export default function EditWelcomePopupPage() {
  const params = useParams<{ id: string }>();
  return <WelcomePopupForm popupId={params.id} />;
}
