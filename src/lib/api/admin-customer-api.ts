import { getAdminAccessToken } from "@/lib/auth/admin-auth-api";
import type { Customer } from "@/data/admin/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

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
  status: string;
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
  const def = addresses.find((a) => a.isDefault) || addresses[0];
  const parts = [def.addressLine1, def.addressLine2, def.city, def.state, def.postalCode].filter(Boolean);
  return parts.join(", ");
}

export async function fetchAdminCustomers(params?: ListCustomersParams): Promise<ListCustomersResult> {
  const token = getAdminAccessToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.pageSize) queryParams.set("limit", String(params.pageSize));
  if (params?.search?.trim()) queryParams.set("search", params.search.trim());

  const response = await fetch(`${API_BASE}/admin/customers?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "Failed to fetch customers.");
  }

  const items: Customer[] = payload.data.items.map((item: BackendCustomerJSON) => ({
    id: item.id,
    referenceCode: item.referenceCode,
    name: item.name,
    email: item.email,
    phone: item.phone ?? "N/A",
    status: item.status,
    address: "—",
    joinedAt: item.createdAt,
    lastLoginAt: item.lastLoginAt,
  }));

  return {
    items,
    total: payload.data.pagination.totalItems,
    page: payload.data.pagination.page,
    pageSize: payload.data.pagination.limit,
  };
}

export async function fetchAdminCustomerDetail(customerId: string | number): Promise<Customer> {
  const token = getAdminAccessToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(`${API_BASE}/admin/customers/${customerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "Customer not found.");
  }

  const item: BackendCustomerJSON = payload.data;
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
