"use client";

import { CouponForm } from "@/components/admin/coupons/coupon-form";

export default function NewCouponPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Add coupon</h1>
        <p className="mt-1 text-sm text-text-primary/60">New coupons are created as drafts and must be activated before customers can use them.</p>
      </div>
      <CouponForm />
    </div>
  );
}
