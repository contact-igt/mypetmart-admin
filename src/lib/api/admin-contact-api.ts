import { adminApiRequest } from "@/lib/api/admin-api-client";

export type ContactEnquiryStatus = "new" | "in_progress" | "resolved" | "closed";

export type ContactEnquiry = {
  id: string;
  enquiryNumber: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  orderNumber: string | null;
  message: string;
  status: ContactEnquiryStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendContactEnquiry = Omit<ContactEnquiry, "id"> & { id: number };

type ContactEnquiryListResult = {
  items: BackendContactEnquiry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ContactEnquiryList = {
  items: ContactEnquiry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ContactEnquiryListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ContactEnquiryStatus | "";
};

export type ContactEnquiryUpdateInput = {
  status?: ContactEnquiryStatus;
  adminNote?: string;
};

function toContactEnquiry(enquiry: BackendContactEnquiry): ContactEnquiry {
  return { ...enquiry, id: String(enquiry.id) };
}

function enquiryPath(enquiryId: string): string {
  return `/admin/contact-enquiries/${encodeURIComponent(enquiryId)}`;
}

export async function fetchAdminContactEnquiries(query: ContactEnquiryListQuery = {}): Promise<ContactEnquiryList> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);

  const result = await adminApiRequest<ContactEnquiryListResult>(
    `/admin/contact-enquiries?${params.toString()}`,
  );
  return { ...result, items: result.items.map(toContactEnquiry) };
}

export async function fetchAdminContactEnquiry(enquiryId: string): Promise<ContactEnquiry> {
  return toContactEnquiry(
    await adminApiRequest<BackendContactEnquiry>(enquiryPath(enquiryId)),
  );
}

export async function updateAdminContactEnquiry(
  enquiryId: string,
  input: ContactEnquiryUpdateInput,
): Promise<ContactEnquiry> {
  return toContactEnquiry(
    await adminApiRequest<BackendContactEnquiry>(enquiryPath(enquiryId), {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}
