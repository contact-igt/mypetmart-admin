"use client";

import { useParams } from "next/navigation";
import { OrderDetailView } from "@/components/admin/orders/order-detail-view";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  return <OrderDetailView orderId={params.id} />;
}
