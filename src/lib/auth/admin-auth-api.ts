const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

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

export type AdminAuthResponse = {
  success: boolean;
  data: {
    user: SafeAdminUser;
    accessToken?: string;
  };
};

let inMemoryAccessToken: string | null = null;

export function setAdminAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAdminAccessToken(): string | null {
  return inMemoryAccessToken;
}

export async function adminSignin(email: string, password: string): Promise<SafeAdminUser> {
  const response = await fetch(`${API_BASE}/admin/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "Invalid credentials.");
  }

  setAdminAccessToken(payload.data.accessToken ?? null);
  return payload.data.user;
}

export async function adminRefresh(): Promise<string> {
  const response = await fetch(`${API_BASE}/admin/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    setAdminAccessToken(null);
    throw new Error(payload?.error?.message || "Failed to refresh session.");
  }

  const token = payload.data.accessToken;
  setAdminAccessToken(token);
  return token;
}

export async function adminGetMe(token?: string): Promise<SafeAdminUser> {
  const authToken = token || inMemoryAccessToken;
  if (!authToken) {
    throw new Error("No access token available.");
  }

  const response = await fetch(`${API_BASE}/admin/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "Failed to fetch user profile.");
  }

  if (payload.data.user.role !== "admin" && payload.data.user.role !== "super_admin") {
    setAdminAccessToken(null);
    throw new Error("Access denied. Admin privileges required.");
  }

  return payload.data.user;
}

export async function adminLogout(): Promise<void> {
  try {
    if (inMemoryAccessToken) {
      await fetch(`${API_BASE}/admin/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${inMemoryAccessToken}`,
        },
        credentials: "include",
      });
    }
  } catch {
    // Ignore logout network errors
  } finally {
    setAdminAccessToken(null);
  }
}
