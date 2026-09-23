"use client";

import { useParams } from "next/navigation";
import { CouponRedemptionsView } from "@/components/admin/coupons/coupon-redemptions-view";

export default function AdminCouponRedemptionsPage() {
  const params = useParams<{ id: string }>();
  return <CouponRedemptionsView couponId={params.id} />;
}
