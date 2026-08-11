"use client";

import { useParams } from "next/navigation";
import { CategoryForm } from "@/components/admin/categories/category-form";

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  return <CategoryForm categoryId={params.id} />;
}
