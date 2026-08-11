"use client";

import { ProductForm } from "@/components/admin/products/product-form";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Add product</h1>
        <p className="mt-1 text-sm text-text-primary/60">Create a Product in the production catalog.</p>
      </div>
      <ProductForm />
    </div>
  );
}
