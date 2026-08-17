import {
  adminApiRequest,
  adminPublicRequest,
  getAdminAccessToken,
  refreshAdminSession,
  setAdminAccessToken,
} from "@/lib/api/admin-api-client";

export { getAdminAccessToken, setAdminAccessToken } from "@/lib/api/admin-api-client";

export type SafeAdminUser = {
  id: number;
  referenceCode: string;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "super_admin" | "customer";
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export async function adminSignin(email: string, password: string): Promise<SafeAdminUser> {
  const data = await adminPublicRequest<{
    user: SafeAdminUser;
    accessToken?: string;
  }>("/admin/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  setAdminAccessToken(data.accessToken ?? null);
  return data.user;
}

export function adminRefresh(): Promise<string> {
  return refreshAdminSession();
}

export async function adminGetMe(): Promise<SafeAdminUser> {
  const user = await adminApiRequest<SafeAdminUser>("/admin/auth/me");
  if (user.role !== "admin" && user.role !== "super_admin") {
    setAdminAccessToken(null);
    throw new Error("Access denied. Admin privileges required.");
  }
  return user;
}

export async function adminLogout(): Promise<void> {
  try {
    if (getAdminAccessToken()) {
      await adminApiRequest<null>("/admin/auth/logout", { method: "POST" });
    }
  } catch {
    // Local logout must still complete if the session is already invalid.
  } finally {
    setAdminAccessToken(null);
  }
}
