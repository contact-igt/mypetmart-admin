"use client";

import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/products/product-form";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Edit product</h1>
        <p className="mt-1 text-sm text-text-primary/60">Changes apply to this demo session only.</p>
      </div>
      <ProductForm productId={params.id} />
    </div>
  );
}
