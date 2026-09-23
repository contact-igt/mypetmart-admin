import { CouponForm } from "@/components/admin/coupons/coupon-form";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Edit coupon</h1>
        <p className="mt-1 text-sm text-text-primary/60">Manage coupon terms, validity, limits, and eligibility.</p>
      </div>
      <CouponForm couponId={id} />
    </div>
  );
}
