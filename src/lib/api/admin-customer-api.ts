import type { Customer } from "@/data/admin/types";
import { adminApiRequest } from "@/lib/api/admin-api-client";

export type ListCustomersParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListCustomersResult = {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

type BackendCustomerJSON = {
  id: number;
  referenceCode: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string | null;
  addresses?: Array<{
    id: number;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
    isDefault: boolean;
  }>;
};

function formatAddress(addresses?: BackendCustomerJSON["addresses"]): string {
  if (!addresses || addresses.length === 0) return "No saved addresses";
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  return [
    defaultAddress.addressLine1,
    defaultAddress.addressLine2,
    defaultAddress.city,
    defaultAddress.state,
    defaultAddress.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function fetchAdminCustomers(
  params?: ListCustomersParams,
): Promise<ListCustomersResult> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.pageSize) queryParams.set("limit", String(params.pageSize));
  if (params?.search?.trim()) queryParams.set("search", params.search.trim());

  const data = await adminApiRequest<{
    items: BackendCustomerJSON[];
    pagination: { totalItems: number; page: number; limit: number };
  }>(`/admin/customers?${queryParams.toString()}`);

  return {
    items: data.items.map((item) => ({
      id: item.id,
      referenceCode: item.referenceCode,
      name: item.name,
      email: item.email,
      phone: item.phone ?? "N/A",
      status: item.status,
      address: "—",
      joinedAt: item.createdAt,
      lastLoginAt: item.lastLoginAt,
    })),
    total: data.pagination.totalItems,
    page: data.pagination.page,
    pageSize: data.pagination.limit,
  };
}

export async function fetchAdminCustomerDetail(
  customerId: string | number,
): Promise<Customer> {
  const item = await adminApiRequest<BackendCustomerJSON>(
    `/admin/customers/${customerId}`,
  );

  return {
    id: item.id,
    referenceCode: item.referenceCode,
    name: item.name,
    email: item.email,
    phone: item.phone ?? "N/A",
    status: item.status,
    address: formatAddress(item.addresses),
    joinedAt: item.createdAt,
    lastLoginAt: item.lastLoginAt,
    addresses: item.addresses,
  };
}
