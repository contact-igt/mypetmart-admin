import { ProductForm } from "@/components/admin/products/product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Edit product</h1>
        <p className="mt-1 text-sm text-text-primary/60">Manage production Product fields, Variants, and Cloudflare R2 images.</p>
      </div>
      <ProductForm productId={id} />
    </div>
  );
}
