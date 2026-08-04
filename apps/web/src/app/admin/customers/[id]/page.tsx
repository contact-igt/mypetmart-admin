"use client";

import { useParams } from "next/navigation";
import { CustomerDetailView } from "@/components/admin/customers/customer-detail-view";

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  return <CustomerDetailView customerId={params.id} />;
}
