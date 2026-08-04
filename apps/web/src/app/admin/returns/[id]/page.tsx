"use client";

import { useParams } from "next/navigation";
import { ReturnDetailView } from "@/components/admin/returns/return-detail-view";

export default function AdminReturnDetailPage() {
  const params = useParams<{ id: string }>();
  return <ReturnDetailView returnId={params.id} />;
}
