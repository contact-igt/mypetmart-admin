export const ADMIN_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const ADMIN_SESSION_EXPIRED_EVENT = "mypetmart:admin-session-expired";

export type AdminApiValidationErrors = Record<string, string[]>;

type SuccessEnvelope<T> = {
  success: true;
  data: T;
  meta?: { requestId?: string };
};

type ErrorEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    errors?: AdminApiValidationErrors;
  };
  meta?: { requestId?: string };
};

type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors?: AdminApiValidationErrors;
  readonly requestId?: string;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    errors?: AdminApiValidationErrors;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "AdminApiError";
    this.status = options.status;
    this.code = options.code;
    this.errors = options.errors;
    this.requestId = options.requestId;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAdminAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAdminAccessToken(): string | null {
  return accessToken;
}

function signalExpiredSession(): void {
  setAdminAccessToken(null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  }
}

function requestUrl(path: string): string {
  return `${ADMIN_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const requestIdFromHeader = response.headers.get("x-request-id") ?? undefined;
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new AdminApiError({
      status: response.status,
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unreadable response.",
      requestId: requestIdFromHeader,
    });
  }

  if (!payload || typeof payload !== "object" || !("success" in payload)) {
    throw new AdminApiError({
      status: response.status,
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unexpected response.",
      requestId: requestIdFromHeader,
    });
  }

  return payload as ApiEnvelope<T>;
}

async function requestOnce<T>(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }

  const response = await fetch(requestUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const payload = await parseEnvelope<T>(response);

  if (!response.ok || payload.success !== true) {
    const errorPayload = payload as ErrorEnvelope;
    throw new AdminApiError({
      status: response.status,
      code: errorPayload.error?.code ?? `HTTP_${response.status}`,
      message: errorPayload.error?.message ?? "The request could not be completed.",
      errors: errorPayload.error?.errors,
      requestId:
        errorPayload.meta?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    });
  }

  return payload.data;
}

export function adminPublicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestOnce<T>(path, init, null);
}

async function performRefresh(): Promise<string> {
  const data = await adminPublicRequest<{ accessToken?: string }>(
    "/admin/auth/refresh",
    { method: "POST" },
  );
  if (!data.accessToken) {
    throw new AdminApiError({
      status: 500,
      code: "INVALID_API_RESPONSE",
      message: "The refresh response did not include an access token.",
    });
  }
  setAdminAccessToken(data.accessToken);
  return data.accessToken;
}

export function refreshAdminSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch((error: unknown) => {
        signalExpiredSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function adminApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    return await requestOnce<T>(path, init, getAdminAccessToken());
  } catch (error) {
    if (!(error instanceof AdminApiError) || error.status !== 401) throw error;
  }

  await refreshAdminSession();

  try {
    return await requestOnce<T>(path, init, getAdminAccessToken());
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) {
      signalExpiredSession();
    }
    throw error;
  }
}
