import type { Category, CategoryInput, PetType } from "@/data/admin/types";
import { adminApiRequest } from "@/lib/api/admin-api-client";

type BackendCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  petType: PetType;
  active: boolean;
  displayOrder: number;
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CategoryStatusFilter = "all" | "active" | "inactive" | "deleted";

export type CategoryUpdateInput = Pick<
  CategoryInput,
  "name" | "description" | "petType"
>;

export type CategoryCreateInput = Pick<
  CategoryInput,
  "name" | "slug" | "description" | "petType" | "active"
>;

// Mirrors backend/src/models/CategoryModels/category.validation.ts exactly.
export function slugifyCategoryName(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCategory(category: BackendCategory): Category {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    petType: category.petType,
    order: category.displayOrder,
    active: category.active,
    productCount: category.productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt,
  };
}

function categoryPath(categoryId: string): string {
  return `/admin/categories/${encodeURIComponent(categoryId)}`;
}

export async function fetchAdminCategories(
  status: CategoryStatusFilter = "all",
): Promise<Category[]> {
  const params = new URLSearchParams({
    status,
    sort: "displayOrder",
    order: "ASC",
  });
  const categories = await adminApiRequest<BackendCategory[]>(
    `/admin/categories?${params.toString()}`,
  );
  return categories.map(toCategory);
}

export async function fetchAdminCategory(categoryId: string): Promise<Category> {
  return toCategory(
    await adminApiRequest<BackendCategory>(categoryPath(categoryId)),
  );
}

export async function createAdminCategory(input: CategoryCreateInput): Promise<Category> {
  const category = await adminApiRequest<BackendCategory>("/admin/categories", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      slug: input.slug || undefined,
      description: input.description || null,
      petType: input.petType,
      active: input.active,
    }),
  });
  return toCategory(category);
}

export async function updateAdminCategory(
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<Category> {
  const category = await adminApiRequest<BackendCategory>(categoryPath(categoryId), {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      description: input.description || null,
      petType: input.petType,
    }),
  });
  return toCategory(category);
}

export async function setAdminCategoryActive(
  categoryId: string,
  active: boolean,
): Promise<Category> {
  const category = await adminApiRequest<BackendCategory>(
    `${categoryPath(categoryId)}/status`,
    { method: "PATCH", body: JSON.stringify({ active }) },
  );
  return toCategory(category);
}

export async function reorderAdminCategories(
  categories: Category[],
): Promise<Category[]> {
  const response = await adminApiRequest<BackendCategory[]>(
    "/admin/categories/reorder",
    {
      method: "PATCH",
      body: JSON.stringify({
        items: categories.map((category) => ({
          categoryId: Number(category.id),
          displayOrder: category.order,
        })),
      }),
    },
  );
  return response.map(toCategory);
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  await adminApiRequest<{ deleted: true; id: number }>(categoryPath(categoryId), {
    method: "DELETE",
  });
}

export async function restoreAdminCategory(categoryId: string): Promise<Category> {
  return toCategory(
    await adminApiRequest<BackendCategory>(`${categoryPath(categoryId)}/restore`, {
      method: "PATCH",
    }),
  );
}
